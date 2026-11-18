/**
 * Git plumbing for @wagq/dsh-git.
 *
 * Every call goes through `execFile` with an argument ARRAY — never a shell
 * string — so a path or branch name containing spaces, quotes or `&` cannot
 * change the command that runs. Output is decoded as UTF-8 and `maxBuffer` is
 * raised because `git log --all` on a large repo is routinely multi-megabyte.
 */
import { execFile } from 'node:child_process'
import { readFile, realpath } from 'node:fs/promises'
import { isAbsolute, join, resolve } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

const MAX_BUFFER = 64 * 1024 * 1024
const GIT_TIMEOUT_MS = 20_000

export interface GitResult {
  stdout: string
  stderr: string
}

/** Error shape produced by execFile when git itself exits non-zero. */
export interface GitFailure extends Error {
  code?: number | string
  stdout?: string
  stderr?: string
}

function gitArgs(cwd: string, args: string[]): string[] {
  // `-c core.quotepath=false` keeps CJK paths readable instead of \350\257...
  // `--no-pager` stops a configured pager from blocking on a TTY that is not there.
  return ['-C', cwd, '--no-pager', '-c', 'core.quotepath=false', ...args]
}

export function git(cwd: string, args: string[]): Promise<GitResult> {
  return run('git', gitArgs(cwd, args), {
    cwd,
    windowsHide: true,
    timeout: GIT_TIMEOUT_MS,
    maxBuffer: MAX_BUFFER,
    encoding: 'utf8',
    env: {
      ...process.env,
      // Deterministic, machine-readable output regardless of the user config.
      GIT_TERMINAL_PROMPT: '0',
      GIT_OPTIONAL_LOCKS: '0',
      GIT_PAGER: 'cat',
      LC_ALL: 'C.UTF-8',
      LANG: 'C.UTF-8',
    },
  }) as Promise<GitResult>
}

export class GitError extends Error {
  code: number
  detail: string
  constructor(message: string, code = 500, detail = '') {
    super(message)
    this.name = 'GitError'
    this.code = code
    this.detail = detail
  }
}

/** Run git and rethrow a normalized, user-presentable error. */
export async function gitOrThrow(cwd: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await git(cwd, args)
    return stdout
  } catch (error) {
    const failure = error as GitFailure
    const detail = (failure.stderr || failure.stdout || failure.message || '').trim()
    if (/not a git repository/i.test(detail)) {
      throw new GitError('当前目录不是 Git 仓库', 409, detail)
    }
    if (/ENOENT/i.test(String(failure.code ?? '')) || /not recognized|找不到/i.test(detail)) {
      throw new GitError('找不到 git 可执行文件，请确认 git 已安装并加入 PATH', 503, detail)
    }
    throw new GitError(detail.split('\n')[0] || 'git 执行失败', 500, detail)
  }
}

export interface RepoInfo {
  root: string
  name: string
  branch: string
  detached: boolean
  head: string
  upstream: string
  ahead: number
  behind: number
  /** `true` when the working tree has no HEAD commit yet. */
  empty: boolean
}

/** Resolve and validate a user-supplied directory before touching git. */
export async function resolveRepoDir(input: string): Promise<string> {
  const raw = (input ?? '').trim()
  if (raw === '') throw new GitError('缺少工作目录', 400)
  if (!isAbsolute(raw)) throw new GitError('工作目录必须是绝对路径', 400)
  try {
    const real = await realpath(resolve(raw))
    return real
  } catch {
    throw new GitError(`工作目录不存在：${raw}`, 404)
  }
}

export async function repoInfo(cwd: string): Promise<RepoInfo> {
  const root = (await gitOrThrow(cwd, ['rev-parse', '--show-toplevel'])).trim()
  const name = root.replace(/[\\/]+$/, '').split(/[\\/]/).pop() || root

  let empty = false
  try {
    await git(cwd, ['rev-parse', '--verify', 'HEAD'])
  } catch {
    empty = true
  }

  let branch = ''
  let detached = false
  let head = ''
  if (!empty) {
    head = (await gitOrThrow(cwd, ['rev-parse', '--short', 'HEAD'])).trim()
    try {
      branch = (await gitOrThrow(cwd, ['symbolic-ref', '--short', '-q', 'HEAD'])).trim()
    } catch {
      branch = ''
    }
    if (branch === '') {
      detached = true
      branch = `HEAD ${head}`
    }
  } else {
    // An unborn branch still has a name in .git/HEAD.
    try {
      branch = (await gitOrThrow(cwd, ['symbolic-ref', '--short', '-q', 'HEAD'])).trim()
    } catch {
      branch = 'main'
    }
  }

  let upstream = ''
  let ahead = 0
  let behind = 0
  try {
    upstream = (await git(cwd, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'])).stdout.trim()
  } catch {
    upstream = ''
  }
  if (upstream !== '' && !empty) {
    try {
      const counts = (await git(cwd, ['rev-list', '--left-right', '--count', `HEAD...${upstream}`])).stdout.trim()
      const [left, right] = counts.split(/\s+/)
      ahead = Number(right) || 0
      behind = Number(left) || 0
    } catch {
      ahead = 0
      behind = 0
    }
  }

  return { root, name, branch, detached, head, upstream, ahead, behind, empty }
}

export type ChangeKind = 'staged' | 'unstaged' | 'untracked' | 'conflicted'

export interface StatusEntry {
  path: string
  /** Original path for a rename/copy. */
  from: string
  /** Two-character porcelain code, e.g. `M `, ` M`, `??`, `MM`. */
  code: string
  index: string
  worktree: string
  kind: ChangeKind
  /** VS Code-style single letter for the row badge. */
  letter: string
}

export interface StatusSnapshot {
  repo: RepoInfo
  staged: StatusEntry[]
  changes: StatusEntry[]
  untracked: StatusEntry[]
  /** Added/removed line counts per path, for the row decoration. */
  stats: Record<string, { added: number; removed: number }>
}

const LETTER_BY_CODE: Record<string, string> = {
  M: 'M',
  A: 'A',
  D: 'D',
  R: 'R',
  C: 'C',
  T: 'T',
  U: 'U',
  '?': 'U',
  '!': '!',
}

function letterOf(code: string): string {
  return LETTER_BY_CODE[code] ?? (code === '?' ? 'U' : code)
}

/** Parse `git status --porcelain=v1 -z` records. */
function parseStatus(output: string): StatusEntry[] {
  const fields = output.split('\0')
  const entries: StatusEntry[] = []
  for (let index = 0; index < fields.length; index += 1) {
    const record = fields[index]
    if (record === '') continue
    if (record.startsWith('## ')) continue
    const code = record.slice(0, 2)
    const path = record.slice(3)
    const indexCode = code[0]
    const worktreeCode = code[1]
    let from = ''
    if (indexCode === 'R' || indexCode === 'C' || worktreeCode === 'R' || worktreeCode === 'C') {
      from = fields[index + 1] ?? ''
      index += 1
    }
    const untracked = code === '??'
    const conflicted = code.includes('U') || code === 'AA' || code === 'DD'
    const staged = !untracked && !conflicted && indexCode !== ' ' && indexCode !== '?'
    const unstaged = !untracked && !conflicted && worktreeCode !== ' ' && worktreeCode !== '?'
    const kind: ChangeKind = conflicted ? 'conflicted' : untracked ? 'untracked' : staged ? 'staged' : 'unstaged'
    const letterSource = untracked
      ? '?'
      : conflicted
        ? 'U'
        : staged
          ? indexCode
          : worktreeCode
    entries.push({
      path,
      from,
      code,
      index: indexCode,
      worktree: worktreeCode,
      kind,
      letter: letterOf(letterSource),
    })
    // An `MM` file is both staged and dirty; surface the worktree side too so the
    // 更改 list is a faithful copy of what VS Code shows.
    if (staged && unstaged) {
      entries.push({
        path,
        from: '',
        code,
        index: ' ',
        worktree: worktreeCode,
        kind: 'unstaged',
        letter: letterOf(worktreeCode),
      })
    }
  }
  return entries
}

export async function status(cwd: string): Promise<StatusSnapshot> {
  const repo = await repoInfo(cwd)
  const raw = await gitOrThrow(cwd, [
    'status',
    '--porcelain=v1',
    '-z',
    '--untracked-files=all',
    '--renames',
    '--ignore-submodules=none',
  ])
  const entries = parseStatus(raw)
  const staged = entries.filter((entry) => entry.kind === 'staged' && entry.index !== ' ')
  const changes = entries.filter((entry) => entry.kind === 'unstaged' || entry.kind === 'conflicted')
  const untracked = entries.filter((entry) => entry.kind === 'untracked')
  return {
    repo,
    staged,
    changes,
    untracked,
    stats: await numstat(cwd, [...staged, ...changes, ...untracked]),
  }
}

/**
 * `git diff --numstat` for both sides, merged per path. Untracked files have no
 * diff, so their line count is read from the blob length instead — that keeps
 * the decoration honest without a second full diff.
 */
async function numstat(
  cwd: string,
  entries: StatusEntry[],
): Promise<Record<string, { added: number; removed: number }>> {
  const out: Record<string, { added: number; removed: number }> = {}
  const collect = async (args: string[]): Promise<void> => {
    let text = ''
    try {
      text = await gitOrThrow(cwd, args)
    } catch {
      return
    }
    for (const line of text.split('\n')) {
      if (line === '') continue
      const [added, removed, ...rest] = line.split('\t')
      const path = rest.join('\t')
      if (path === '') continue
      const current = out[path] ?? { added: 0, removed: 0 }
      current.added += Number(added) || 0
      current.removed += Number(removed) || 0
      out[path] = current
    }
  }
  await collect(['diff', '--numstat', '--no-ext-diff', '--no-color', '--find-renames'])
  await collect(['diff', '--numstat', '--cached', '--no-ext-diff', '--no-color', '--find-renames'])

  for (const entry of entries) {
    if (entry.kind !== 'untracked' || Object.hasOwn(out, entry.path)) continue
    try {
      const text = await readFile(join(cwd, entry.path), 'utf8')
      const lines = text === '' ? 0 : text.split('\n').length - (text.endsWith('\n') ? 1 : 0)
      out[entry.path] = { added: lines, removed: 0 }
    } catch {
      out[entry.path] = { added: 0, removed: 0 }
    }
  }
  return out
}

export interface CommitNode {
  sha: string
  short: string
  parents: string[]
  author: string
  email: string
  time: number
  refs: string[]
  subject: string
}

const LOG_FORMAT = '%H%x1f%P%x1f%an%x1f%ae%x1f%at%x1f%D%x1f%s%x1e'

function parseRefs(raw: string): string[] {
  return raw
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map((part) => part.replace(/^HEAD -> /, ''))
}

/** Commit graph ordered by `--date-order`, newest first, across every ref. */
export async function graph(cwd: string, limit = 60): Promise<CommitNode[]> {
  let raw: string
  try {
    raw = await gitOrThrow(cwd, [
      'log',
      '--all',
      '--date-order',
      '--max-count',
      String(Math.min(Math.max(limit, 1), 400)),
      `--pretty=format:${LOG_FORMAT}`,
    ])
  } catch (error) {
    // A repository with no commits yet has nothing to log.
    if (error instanceof GitError && /does not have any commits|unknown revision|bad default revision/i.test(error.detail + error.message)) {
      return []
    }
    throw error
  }
  const nodes: CommitNode[] = []
  for (const chunk of raw.split('\x1e')) {
    const record = chunk.replace(/^\n+/, '')
    if (record === '') continue
    const [sha, parents, author, email, time, refs, subject] = record.split('\x1f')
    if (!sha) continue
    nodes.push({
      sha,
      short: sha.slice(0, 7),
      parents: (parents ?? '').split(' ').filter(Boolean),
      author: author ?? '',
      email: email ?? '',
      time: Number(time) || 0,
      refs: parseRefs(refs ?? ''),
      subject: subject ?? '',
    })
  }
  return nodes
}

export interface DiffPayload {
  path: string
  staged: boolean
  binary: boolean
  tooLarge: boolean
  patch: string
  added: number
  removed: number
}

const MAX_PATCH_CHARS = 600_000

export async function diff(cwd: string, path: string, staged: boolean, from = ''): Promise<DiffPayload> {
  const args = ['diff', '--no-color', '--no-ext-diff', '--unified=3']
  if (staged) args.push('--cached')
  if (from !== '') {
    args.push('--find-renames', '--', path, from)
  } else {
    args.push('--', path)
  }
  let patch = await gitOrThrow(cwd, args)

  if (patch.trim() === '' && !staged) {
    // Untracked file: `git diff` knows nothing about it, so read it through
    // `git diff --no-index` against an empty buffer to get the same hunk shape.
    try {
      const shown = await git(cwd, ['diff', '--no-color', '--no-ext-diff', '--no-index', '--', nullPath(), path])
      patch = shown.stdout
    } catch (error) {
      const failure = error as GitFailure
      if (typeof failure.stdout === 'string' && failure.stdout !== '') patch = failure.stdout
    }
  }

  const binary = /^Binary files .* differ$/m.test(patch) || /^GIT binary patch$/m.test(patch)
  const tooLarge = patch.length > MAX_PATCH_CHARS
  let added = 0
  let removed = 0
  if (!binary && !tooLarge) {
    for (const line of patch.split('\n')) {
      if (line.startsWith('+++') || line.startsWith('---')) continue
      if (line.startsWith('+')) added += 1
      else if (line.startsWith('-')) removed += 1
    }
  }
  return {
    path,
    staged,
    binary,
    tooLarge,
    patch: tooLarge ? patch.slice(0, MAX_PATCH_CHARS) : patch,
    added,
    removed,
  }
}

function nullPath(): string {
  return process.platform === 'win32' ? 'NUL' : '/dev/null'
}

export async function stage(cwd: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return
  await gitOrThrow(cwd, ['add', '-A', '--', ...paths])
}

export async function unstage(cwd: string, paths: string[]): Promise<void> {
  if (paths.length === 0) return
  try {
    await gitOrThrow(cwd, ['restore', '--staged', '--', ...paths])
  } catch {
    // Pre-2.23 git has no `restore`; the reset form works everywhere.
    await gitOrThrow(cwd, ['reset', '-q', 'HEAD', '--', ...paths])
  }
}

export async function discard(cwd: string, paths: string[]): Promise<void> {
  const snapshot = await status(cwd)
  const untracked = new Set(snapshot.untracked.map((entry) => entry.path))
  const tracked: string[] = []
  const removes: string[] = []
  for (const path of paths) {
    if (untracked.has(path)) removes.push(path)
    else tracked.push(path)
  }
  if (tracked.length > 0) await gitOrThrow(cwd, ['restore', '--worktree', '--', ...tracked])
  if (removes.length > 0) await gitOrThrow(cwd, ['clean', '-f', '-d', '--', ...removes])
}

export interface CommitResult {
  sha: string
  short: string
  branch: string
  summary: string
}

export async function commit(
  cwd: string,
  message: string,
  options: { amend?: boolean; signoff?: boolean } = {},
): Promise<CommitResult> {
  const text = message.replace(/\r\n/g, '\n').trim()
  if (text === '') throw new GitError('提交信息不能为空', 400)
  const args = ['commit', '-m', text]
  if (options.amend) args.push('--amend')
  if (options.signoff) args.push('--signoff')
  let stdout: string
  try {
    stdout = await gitOrThrow(cwd, args)
  } catch (error) {
    const detail = error instanceof GitError ? error.detail : ''
    if (/nothing added to commit|no changes added to commit/i.test(detail)) {
      throw new GitError('没有已暂存的更改，先暂存文件再提交', 409, detail)
    }
    if (/Please tell me who you are|unable to auto-detect email address/i.test(detail)) {
      throw new GitError('git 还没有配置 user.name / user.email', 409, detail)
    }
    throw error
  }
  const sha = (await gitOrThrow(cwd, ['rev-parse', 'HEAD'])).trim()
  const branch = (await gitOrThrow(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim()
  const summary = stdout.trim().split('\n')[0] ?? ''
  return { sha, short: sha.slice(0, 7), branch, summary }
}

/** A ready-to-edit commit message derived from the staged paths. */
export async function suggestMessage(cwd: string): Promise<string> {
  const snapshot = await status(cwd)
  const names = snapshot.staged.map((entry) => entry.path)
  if (names.length === 0) return ''
  if (names.length === 1) return `chore: 更新 ${names[0]}`
  return `chore: 更新 ${names.length} 个文件`
}
