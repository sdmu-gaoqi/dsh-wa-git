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

/** Promisified `execFile`: (file, args, options) → { stdout, stderr }. */
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

/** `%D` gives `HEAD -> main, origin/main, tag: v1`; drop the `HEAD ->` prefix but
 *  keep the branch it points at. Git repeats the branch it already listed, so a
 *  `HEAD -> main` on a commit whose refs already include `main` would otherwise
 *  render as two pills for one thing. */
function parseDecorations(raw: string): string[] {
  const out: string[] = []
  for (const part of raw.split(',')) {
    let ref = part.trim()
    if (ref === '') continue
    ref = ref.replace(/^HEAD -> /, '')
    if (!out.includes(ref)) out.push(ref)
  }
  return out
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
      refs: parseDecorations(refs ?? ''),
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

/* ---------------------------------------------------------------- divergence */

export interface CompareSide {
  sha: string
  short: string
  author: string
  time: number
  subject: string
}

export interface CompareResult {
  upstream: string
  ahead: CompareSide[]
  behind: CompareSide[]
}

/**
 * What the local branch has that the upstream does not, and vice versa.
 *
 * This is the data behind "和远程对比": `--left-right` puts the upstream side on
 * the left and HEAD on the right, which is exactly the two columns the panel
 * shows. A branch with no upstream returns empty lists rather than an error, so
 * the caller can offer "publish branch" instead.
 */
export async function compare(cwd: string, limit = 40): Promise<CompareResult> {
  let upstream = ''
  try {
    upstream = (await gitOrThrow(cwd, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'])).trim()
  } catch {
    return { upstream: '', ahead: [], behind: [] }
  }
  if (upstream === '') return { upstream: '', ahead: [], behind: [] }

  // `--left-right` only prints its `<`/`>` marker through `%m`; `%H` never
  // carries it, so the marker must be spelled explicitly in the format.
  // In `HEAD...upstream` the LEFT side is HEAD, so `<` means "only in HEAD"
  // (ahead / outgoing) and `>` means "only in upstream" (behind / incoming).
  const format = '%m%x1f%H%x1f%an%x1f%at%x1f%s%x1e'
  let raw = ''
  try {
    raw = await gitOrThrow(cwd, [
      'log',
      '--left-right',
      '--date-order',
      `--max-count=${Math.min(Math.max(limit, 1), 200)}`,
      `--pretty=format:${format}`,
      `HEAD...${upstream}`,
    ])
  } catch {
    return { upstream, ahead: [], behind: [] }
  }

  const ahead: CompareSide[] = []
  const behind: CompareSide[] = []
  for (const chunk of raw.split('\x1e')) {
    const record = chunk.replace(/^\n+/, '')
    if (record === '') continue
    const [marker, sha, author, time, subject] = record.split('\x1f')
    if (sha === undefined) continue
    const side: CompareSide = {
      sha,
      short: sha.slice(0, 7),
      author: author ?? '',
      time: Number(time) || 0,
      subject: subject ?? '',
    }
    if (marker === '<') ahead.push(side)
    else if (marker === '>') behind.push(side)
  }
  return { upstream, ahead, behind }
}

/** A ready-to-edit commit message derived from the staged paths. */
export async function suggestMessage(cwd: string): Promise<string> {
  const snapshot = await status(cwd)
  const names = snapshot.staged.map((entry) => entry.path)
  if (names.length === 0) return ''
  if (names.length === 1) return `chore: 更新 ${names[0]}`
  return `chore: 更新 ${names.length} 个文件`
}

/* ------------------------------------------------------------------ branches */

export interface BranchInfo {
  /** `main`, `origin/main`, … */
  name: string
  /** Ref is remote-tracking (`refs/remotes/…`). */
  remote: boolean
  current: boolean
  upstream: string
  ahead: number
  behind: number
  sha: string
  subject: string
}

/**
 * Local + remote branches in one pass.
 *
 * `%(upstream:track)` gives `[ahead 2, behind 1]`, which is the only place git
 * reports divergence for a ref that is not checked out — the current branch's
 * numbers come from `rev-list` in `repoInfo` instead.
 */
export async function branches(cwd: string): Promise<BranchInfo[]> {
  const format = [
    '%(refname)',
    '%(refname:short)',
    '%(HEAD)',
    '%(upstream:short)',
    '%(upstream:track)',
    '%(objectname:short)',
    '%(contents:subject)',
  ].join('%1f')
  let raw: string
  try {
    raw = await gitOrThrow(cwd, [
      'for-each-ref',
      '--sort=-committerdate',
      `--format=${format}`,
      'refs/heads',
      'refs/remotes',
    ])
  } catch {
    return []
  }
  const out: BranchInfo[] = []
  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue
    const [full, short, head, upstream, track, sha, subject] = line.split('\x1f')
    if (full === undefined || short === undefined || short.endsWith('/HEAD')) continue
    const remote = full.startsWith('refs/remotes/')
    const aheadMatch = /ahead (\d+)/.exec(track ?? '')
    const behindMatch = /behind (\d+)/.exec(track ?? '')
    out.push({
      name: short,
      remote,
      current: (head ?? '').trim() === '*',
      upstream: upstream ?? '',
      ahead: aheadMatch === null ? 0 : Number(aheadMatch[1]),
      behind: behindMatch === null ? 0 : Number(behindMatch[1]),
      sha: sha ?? '',
      subject: subject ?? '',
    })
  }
  return out
}

export interface SyncResult {
  ok: true
  /** Human-readable summary of what the network operation reported. */
  summary: string
  output: string
}

/**
 * `git fetch` / `pull` / `push`.
 *
 * Network commands get a much longer timeout than the local plumbing: a cold
 * clone-sized fetch over a slow link is minutes, not seconds. Progress output is
 * captured so the popup can show what actually happened.
 */
export async function sync(
  cwd: string,
  action: 'fetch' | 'pull' | 'push',
  options: { remote?: string; branch?: string; setUpstream?: boolean; force?: boolean } = {},
): Promise<SyncResult> {
  const args: string[] = [action]
  const remote = (options.remote ?? '').trim()
  const branch = (options.branch ?? '').trim()

  if (action === 'fetch') args.push('--all', '--prune')
  if (action === 'push' && options.setUpstream === true) args.push('--set-upstream')
  if (action === 'push' && options.force === true) args.push('--force-with-lease')
  if (remote !== '') args.push(remote)
  if (branch !== '' && action !== 'fetch') args.push(branch)

  try {
    const result = await run('git', ['-C', cwd, ...args], {
      cwd,
      windowsHide: true,
      timeout: 180_000,
      maxBuffer: MAX_BUFFER,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: '0',
        GIT_ASKPASS: 'echo',
        GIT_PAGER: 'cat',
        LC_ALL: 'C.UTF-8',
        LANG: 'C.UTF-8',
      },
    })
    const output = `${result.stdout}${result.stderr}`.trim()
    return { ok: true, summary: summarizeSync(action, output), output }
  } catch (error) {
    const failure = error as GitFailure
    const detail = `${failure.stdout ?? ''}${failure.stderr ?? ''}${failure.message ?? ''}`.trim()
    if (/Authentication failed|terminal prompts disabled|could not read Username|Permission denied/i.test(detail)) {
      throw new GitError('需要远端凭据，但非交互环境无法输入密码；请先在本机配置 SSH key 或凭据管理器', 401, detail)
    }
    throw new Error(detail.split('\n').filter(Boolean).slice(-1)[0] || `${action} 失败`)
  }
}

function summarizeSync(action: string, output: string): string {
  if (output === '') return action === 'fetch' ? '已是最新' : `${action} 完成`
  const label = action === 'fetch' ? '已拉取' : action === 'pull' ? '已拉取并合并' : '已推送'
  return `${label}（${output.split('\n').length} 行输出）`
}

/* ------------------------------------------------------------------- remotes */

export interface RemoteInfo {
  name: string
  /** fetch URL */
  url: string
  pushUrl: string
}

export async function remotes(cwd: string): Promise<RemoteInfo[]> {
  let raw: string
  try {
    raw = await gitOrThrow(cwd, ['remote', '-v'])
  } catch {
    return []
  }
  const byName = new Map<string, RemoteInfo>()
  for (const line of raw.split('\n')) {
    if (line.trim() === '') continue
    const match = /^(\S+)\s+(\S+)\s+\((fetch|push)\)$/.exec(line.trim())
    if (match === null) continue
    const [, name, url, kind] = match
    const current = byName.get(name) ?? { name, url: '', pushUrl: '' }
    if (kind === 'fetch') current.url = url
    else current.pushUrl = url
    byName.set(name, current)
  }
  return [...byName.values()]
}

export async function addRemote(cwd: string, name: string, url: string): Promise<void> {
  const clean = name.trim()
  if (clean === '' || !/^[A-Za-z0-9._-]+$/.test(clean)) throw new GitError('远端名只能是字母、数字、点、下划线、短横线', 400)
  if (url.trim() === '') throw new GitError('缺少远端 URL', 400)
  if ((await remotes(cwd)).some((remote) => remote.name === clean)) {
    throw new GitError(`远端 ${clean} 已存在`, 409)
  }
  await gitOrThrow(cwd, ['remote', 'add', clean, url.trim()])
}

export async function removeRemote(cwd: string, name: string): Promise<void> {
  await gitOrThrow(cwd, ['remote', 'remove', name])
}

export async function setRemoteUrl(cwd: string, name: string, url: string): Promise<void> {
  if (url.trim() === '') throw new GitError('缺少远端 URL', 400)
  await gitOrThrow(cwd, ['remote', 'set-url', name, url.trim()])
}

/* ------------------------------------------------------------------- switches */

export async function checkout(cwd: string, target: string, options: { create?: boolean } = {}): Promise<string> {
  const name = target.trim()
  if (name === '') throw new GitError('缺少分支名', 400)
  const args = options.create === true ? ['switch', '-c', name] : ['switch', name]
  try {
    await gitOrThrow(cwd, args)
  } catch (error) {
    const detail = error instanceof GitError ? error.detail : ''
    if (/already exists/i.test(detail)) throw new GitError(`分支 ${name} 已存在`, 409, detail)
    if (/does not match any|pathspec .* did not match|invalid reference/i.test(detail)) {
      throw new GitError(`分支 ${name} 不存在`, 404, detail)
    }
    if (/local changes|would be overwritten/i.test(detail)) {
      throw new GitError('工作区有未提交的更改，先提交或暂存再切分支', 409, detail)
    }
    throw error
  }
  return (await gitOrThrow(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim()
}

export async function createBranch(cwd: string, name: string, startPoint = ''): Promise<void> {
  const clean = name.trim()
  if (clean === '') throw new GitError('缺少分支名', 400)
  const args = ['switch', '-c', clean]
  if (startPoint.trim() !== '') args.push(startPoint.trim())
  await gitOrThrow(cwd, args)
}

export async function deleteBranch(cwd: string, name: string, force = false): Promise<void> {
  await gitOrThrow(cwd, ['branch', force ? '-D' : '-d', name])
}

/* -------------------------------------------------------------- commit detail */

export interface CommitDetail {
  sha: string
  short: string
  author: string
  email: string
  time: number
  committer: string
  parents: string[]
  refs: string[]
  subject: string
  body: string
  files: Array<{ path: string; from: string; added: number; removed: number; binary: boolean }>
  patch: string
  added: number
  removed: number
  tooLarge: boolean
}

const MAX_COMMIT_PATCH = 600_000

/**
 * One commit's metadata, changed files and patch.
 *
 * `--first-parent` is NOT used: the patch is the diff against the first parent
 * (`sha^`), which is what VS Code shows for a selected commit. A root commit has
 * no parent, so it is diffed against the empty tree instead.
 */
export async function commitDetail(cwd: string, sha: string): Promise<CommitDetail> {
  const target = (sha ?? '').trim()
  if (!/^[0-9a-fA-F]{4,40}$/.test(target)) throw new GitError('提交哈希格式不正确', 400)

  const meta = await gitOrThrow(cwd, [
    'show',
    '--no-patch',
    '--pretty=format:%H%x1f%an%x1f%ae%x1f%at%x1f%cn%x1f%P%x1f%D%x1f%s%x1f%b',
    target,
  ])
  const [full, author, email, time, committer, parents, refs, subject, body] = meta.split('\x1f')

  const hasParent = (parents ?? '').trim() !== ''
  const diffTarget = hasParent ? `${target}^` : emptyTree(cwd)

  let numstat = ''
  try {
    numstat = await gitOrThrow(cwd, ['diff', '--numstat', '--find-renames', await diffTarget, target])
  } catch {
    numstat = ''
  }

  const files: CommitDetail['files'] = []
  for (const line of numstat.split('\n')) {
    if (line.trim() === '') continue
    const [added, removed, ...rest] = line.split('\t')
    const path = rest.join('\t')
    if (path === '') continue
    let from = ''
    let shown = path
    const arrow = path.indexOf('=>')
    if (arrow !== -1) {
      from = path.slice(0, arrow).replace(/[{}]/g, '').trim()
      shown = path.slice(arrow + 2).trim()
    }
    files.push({
      path: shown,
      from,
      added: Number(added) || 0,
      removed: Number(removed) || 0,
      binary: added === '-' || removed === '-',
    })
  }

  let patch = ''
  try {
    patch = await gitOrThrow(cwd, [
      'diff',
      '--no-color',
      '--no-ext-diff',
      '--find-renames',
      '--unified=3',
      await diffTarget,
      target,
    ])
  } catch {
    patch = ''
  }

  const tooLarge = patch.length > MAX_COMMIT_PATCH
  let added = 0
  let removed = 0
  for (const line of patch.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue
    if (line.startsWith('+')) added += 1
    else if (line.startsWith('-')) removed += 1
  }

  return {
    sha: full ?? target,
    short: (full ?? target).slice(0, 7),
    author: author ?? '',
    email: email ?? '',
    time: Number(time) || 0,
    committer: committer ?? '',
    parents: (parents ?? '').split(' ').filter(Boolean),
    refs: parseDecorations(refs ?? ''),
    subject: subject ?? '',
    body: body ?? '',
    files,
    patch: tooLarge ? patch.slice(0, MAX_COMMIT_PATCH) : patch,
    added,
    removed,
    tooLarge,
  }
}

/** SHA of the empty tree, so a root commit can be diffed like any other. */
function emptyTree(cwd: string): Promise<string> {
  return gitOrThrow(cwd, ['hash-object', '-t', 'tree', '--stdin']).then((out) => out.trim() || '4b825dc642cb6eb9a060e54bf8d69288fbee4904')
}

/* ------------------------------------------------------------ history rewrite */

export type CommitAction = 'revert' | 'reset-soft' | 'reset-mixed' | 'reset-hard' | 'rebase'

export interface CommitActionResult {
  ok: true
  action: CommitAction
  summary: string
  /** Restored/parked work is reported so the caller can warn before it happens. */
  output: string
}

/**
 * The history operations the commit context menu offers.
 *
 * `reset --hard` and `rebase` are destructive, so the caller is expected to have
 * asked first; this function does exactly what it is told and reports git's own
 * words back rather than paraphrasing them.
 */
export async function commitAction(
  cwd: string,
  sha: string,
  action: CommitAction,
): Promise<CommitActionResult> {
  const target = (sha ?? '').trim()
  if (!/^[0-9a-fA-F]{4,40}$/.test(target)) throw new GitError('提交哈希格式不正确', 400)

  const labels: Record<CommitAction, string> = {
    revert: '已生成反向提交',
    'reset-soft': `已软重置到 ${target.slice(0, 7)}（改动全在暂存区）`,
    'reset-mixed': `已混合重置到 ${target.slice(0, 7)}（改动保留在工作区）`,
    'reset-hard': `已硬重置到 ${target.slice(0, 7)}（工作区已回滚）`,
    rebase: `已 rebase 到 ${target.slice(0, 7)}`,
  }

  let output = ''
  try {
    if (action === 'revert') {
      output = await gitOrThrow(cwd, ['revert', '--no-edit', target])
    } else if (action === 'reset-soft') {
      output = await gitOrThrow(cwd, ['reset', '--soft', target])
    } else if (action === 'reset-mixed') {
      output = await gitOrThrow(cwd, ['reset', '--mixed', target])
    } else if (action === 'reset-hard') {
      output = await gitOrThrow(cwd, ['reset', '--hard', target])
    } else {
      output = await gitOrThrow(cwd, ['rebase', target])
    }
  } catch (error) {
    const detail = error instanceof GitError ? error.detail : ''
    if (/would be overwritten|local changes/i.test(detail)) {
      throw new GitError('工作区有未提交的更改，先提交或放弃后再操作', 409, detail)
    }
    if (/no tracking information/i.test(detail)) throw new GitError('当前分支没有上游分支', 409, detail)
    throw error
  }
  return { ok: true, action, summary: labels[action], output: output.trim() }
}

/* --------------------------------------------------------------- terminal */

export interface TerminalResult {
  /** Command line as typed. */
  command: string
  /** Combined stdout+stderr. */
  output: string
  /** Process exit code; `null` when the command was killed by the timeout. */
  code: number | null
  /** Working directory after the command (so `cd` persists between calls). */
  cwd: string
  durationMs: number
}

const TERMINAL_TIMEOUT_MS = 120_000
const TERMINAL_MAX_OUTPUT = 400_000

/**
 * Run one line in a shell rooted at the repo.
 *
 * This is a deliberately interactive surface: the user types the command, so it
 * goes through a shell rather than an argv array — quoting, pipes and `&&` behave
 * the way they do in any terminal. `cwd` is tracked by echoing it back on a
 * sentinel line, which keeps `cd` working without keeping a real PTY alive.
 */
export async function terminalRun(cwd: string, command: string): Promise<TerminalResult> {
  const line = command.trim()
  if (line === '') throw new GitError('命令不能为空', 400)
  if (line.length > 4000) throw new GitError('命令过长', 400)
  const started = Date.now()

  const isWindows = process.platform === 'win32'
  const sentinel = `__WAGQ_CWD_${Math.random().toString(36).slice(2)}__`
  // The payload after the sentinel is TAB-separated: a Windows path contains
  // `:` (`C:\...`), so a colon separator would split the drive letter off.
  const script = isWindows
    ? `${line}\r
$dshExit = if ($LASTEXITCODE -eq $null) { 0 } else { $LASTEXITCODE }
Write-Output "${sentinel}\`t$((Get-Location).Path)\`t$dshExit"`
    : `${line}\n__dsh_exit=$?; printf '%s\\t%s\\t%s\\n' '${sentinel}' "$PWD" "$__dsh_exit"`

  const shellArgs = isWindows
    ? ['-NoLogo', '-NonInteractive', '-NoProfile', '-Command', script]
    : ['-lc', script]

  try {
    // spawn the shell binary directly with its own flags — no extra quoting layer
    const result = await run(isWindows ? 'powershell.exe' : '/bin/sh', shellArgs, {
      cwd,
      windowsHide: true,
      timeout: TERMINAL_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
      encoding: 'utf8',
      env: {
        ...process.env,
        GIT_PAGER: 'cat',
        PAGER: 'cat',
        GIT_TERMINAL_PROMPT: '0',
        // Colour codes would render as escapes in the panel's <pre>.
        NO_COLOR: '1',
        TERM: 'dumb',
      },
    })
    const combined = `${result.stdout}${result.stderr}`
    const { output, nextCwd, code } = splitSentinel(combined, sentinel, cwd)
    return {
      command: line,
      output: output.length > TERMINAL_MAX_OUTPUT ? output.slice(-TERMINAL_MAX_OUTPUT) : output,
      code,
      cwd: nextCwd,
      durationMs: Date.now() - started,
    }
  } catch (error) {
    const failure = error as GitFailure & { killed?: boolean }
    const combined = `${failure.stdout ?? ''}${failure.stderr ?? ''}`
    const { output, nextCwd, code } = splitSentinel(combined, sentinel, cwd)
    if (failure.killed === true) {
      return {
        command: line,
        output: `${output}\n[超时] 命令超过 ${TERMINAL_TIMEOUT_MS / 1000} 秒未结束，已中止。`,
        code: null,
        cwd: nextCwd,
        durationMs: Date.now() - started,
      }
    }
    return {
      command: line,
      output: `${output}${output === '' ? '' : '\n'}${failure.message ?? ''}`.trim(),
      code: typeof failure.code === 'number' ? failure.code : 1,
      cwd: nextCwd,
      durationMs: Date.now() - started,
    }
  }
}

function splitSentinel(text: string, sentinel: string, fallbackCwd: string): { output: string; nextCwd: string; code: number | null } {
  const index = text.lastIndexOf(sentinel)
  if (index === -1) return { output: text.trimEnd(), nextCwd: fallbackCwd, code: 0 }
  const head = text.slice(0, index)
  const tail = text.slice(index + sentinel.length)
  // `<sentinel>\t<cwd>\t<exit>` — TAB-separated so a `C:\…` path stays whole.
  const parts = tail.split('\n')[0].split('\t')
  const nextCwd = (parts[1] ?? '').trim()
  const codeText = (parts[2] ?? '').trim()
  return {
    output: head.trimEnd(),
    nextCwd: nextCwd === '' ? fallbackCwd : nextCwd,
    code: codeText === '' ? 0 : Number(codeText) || 0,
  }
}

/* ---------------------------------------------------------------- conflicts */

export interface ConflictFile {
  path: string
  /** Our side (stage 2), from the current branch. */
  ours: string
  /** Their side (stage 3), from the incoming branch. */
  theirs: string
  /** Common ancestor (stage 1), when the file was modified on both sides. */
  base: string
  /** Worktree file including the `<<<<<<<` / `=======` / `>>>>>>>` markers. */
  worktree: string
}

/** Which stages exist for a path in `git ls-files -u` output. */
async function conflictStages(cwd: string, path: string): Promise<Record<number, string>> {
  let raw = ''
  try {
    raw = await gitOrThrow(cwd, ['ls-files', '-u', '-z', '--', path])
  } catch {
    return {}
  }
  const stages: Record<number, string> = {}
  for (const record of raw.split('\0')) {
    if (record === '') continue
    // "<mode> <sha> <stage>\t<path>"
    const match = /^\S+\s+(\S+)\s+([123])\t/.exec(record)
    if (match === null) continue
    stages[Number(match[2])] = match[1]
  }
  return stages
}

async function blobText(cwd: string, sha: string | undefined): Promise<string> {
  if (sha === undefined) return ''
  try {
    return await gitOrThrow(cwd, ['cat-file', 'blob', sha])
  } catch {
    return ''
  }
}

/**
 * Read a conflicted file's three stages so the popup can show ours / theirs.
 *
 * A delete/modify conflict has only one stage; the missing side is returned as an
 * empty string and the UI labels it accordingly.
 */
export async function conflictFiles(cwd: string, paths: string[]): Promise<ConflictFile[]> {
  const out: ConflictFile[] = []
  for (const path of paths) {
    const stages = await conflictStages(cwd, path)
    let worktree = ''
    try {
      worktree = await readFile(join(cwd, path), 'utf8')
    } catch {
      // deleted by one side
    }
    out.push({
      path,
      ours: await blobText(cwd, stages[2]),
      theirs: await blobText(cwd, stages[3]),
      base: await blobText(cwd, stages[1]),
      worktree,
    })
  }
  return out
}

export type ConflictResolution = 'ours' | 'theirs'

/**
 * Resolve a conflict by taking one whole side.
 *
 * `git checkout --ours/--theirs` restores the chosen stage into the worktree;
 * `git add` then marks the path resolved. This resolves the WHOLE file, which is
 * what "use ours / use theirs" means; hand-editing markers is still available
 * through the terminal tab for partial resolutions.
 */
export async function resolveConflict(
  cwd: string,
  paths: string[],
  side: ConflictResolution,
): Promise<string[]> {
  if (paths.length === 0) throw new GitError('没有要解决的冲突文件', 400)
  for (const path of paths) {
    await gitOrThrow(cwd, ['checkout', `--${side}`, '--', path])
    await gitOrThrow(cwd, ['add', '--', path])
  }
  const remaining = (await gitOrThrow(cwd, ['diff', '--name-only', '--diff-filter=U']))
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
  return remaining
}
