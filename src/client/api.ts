/** Wire types shared by the client halves — mirrors src/index.ts responses. */

export interface RepoInfo {
  root: string
  name: string
  branch: string
  detached: boolean
  head: string
  upstream: string
  ahead: number
  behind: number
  empty: boolean
}

export type ChangeKind = 'staged' | 'unstaged' | 'untracked' | 'conflicted'

export interface StatusEntry {
  path: string
  from: string
  code: string
  index: string
  worktree: string
  kind: ChangeKind
  letter: string
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

export interface RepoState {
  ok: true
  cwd: string
  repo: RepoInfo
  staged: StatusEntry[]
  changes: StatusEntry[]
  untracked: StatusEntry[]
  commits: CommitNode[]
  stats: Record<string, { added: number; removed: number }>
}

export interface DiffPayload {
  ok: true
  path: string
  staged: boolean
  binary: boolean
  tooLarge: boolean
  patch: string
  added: number
  removed: number
}

export interface SessionRow {
  id: string
  cwd: string
  title: string
}

export interface CommitResult {
  ok: true
  sha: string
  short: string
  branch: string
  summary: string
}

export interface BranchInfo {
  name: string
  remote: boolean
  current: boolean
  upstream: string
  ahead: number
  behind: number
  sha: string
  subject: string
}

export interface RemoteInfo {
  name: string
  url: string
  pushUrl: string
}

export interface CommitFile {
  path: string
  from: string
  added: number
  removed: number
  binary: boolean
}

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
  files: CommitFile[]
  patch: string
  added: number
  removed: number
  tooLarge: boolean
}

export type SyncAction = 'fetch' | 'pull' | 'push'

export interface SyncResult {
  ok: true
  summary: string
  output: string
}

export type CommitAction = 'revert' | 'reset-soft' | 'reset-mixed' | 'reset-hard' | 'rebase'

export interface CommitActionResult {
  ok: true
  action: CommitAction
  summary: string
  output: string
}

export interface TerminalResult {
  ok: true
  command: string
  output: string
  code: number | null
  cwd: string
  durationMs: number
}

export interface CompareSide {
  sha: string
  short: string
  author: string
  time: number
  subject: string
}

export interface CompareResult {
  ok: true
  upstream: string
  /** Commits HEAD has that the upstream does not. */
  ahead: CompareSide[]
  /** Commits the upstream has that HEAD does not. */
  behind: CompareSide[]
}

export interface GeneratedMessage {
  ok: true
  message: string
  provider: string
  model: string
}

export interface ConflictFile {
  path: string
  ours: string
  theirs: string
  base: string
  worktree: string
}

export interface FileEntry {
  path: string
  rel: string
  name: string
  kind: 'dir' | 'file' | 'symlink'
  size: number
  mtime: number
}

export interface FileList {
  ok: true
  dir: string
  entries: FileEntry[]
}

export interface FileContent {
  ok: true
  path: string
  mime: string | null
  base64: string
  text: string | null
  binary: boolean
  tooLarge: boolean
  size: number
}

export class ApiError extends Error {
  status: number
  detail: string
  constructor(message: string, status: number, detail = '') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

const PREFIX = '/wagq-git/api'

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text()
  let parsed: unknown
  try {
    parsed = text === '' ? {} : JSON.parse(text)
  } catch {
    throw new ApiError(`响应不是 JSON（HTTP ${response.status}）`, response.status, text.slice(0, 400))
  }
  const body = (parsed ?? {}) as { ok?: unknown; error?: unknown; detail?: unknown }
  if (!response.ok || body.ok === false) {
    const message = typeof body.error === 'string' ? body.error : `HTTP ${response.status}`
    const detail = typeof body.detail === 'string' ? body.detail : ''
    throw new ApiError(message, response.status, detail)
  }
  return parsed as T
}

async function get<T>(path: string, params: Record<string, string>): Promise<T> {
  const search = new URLSearchParams(params)
  const response = await fetch(`${PREFIX}/${path}?${search.toString()}`, {
    headers: { accept: 'application/json' },
    credentials: 'same-origin',
  })
  return readJson<T>(response)
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${PREFIX}/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify(body),
  })
  return readJson<T>(response)
}

export const api = {
  sessions(): Promise<{ ok: true; sessions: SessionRow[] }> {
    return get('sessions', {})
  },
  state(cwd: string, limit = 80): Promise<RepoState> {
    return get('state', { cwd, limit: String(limit) })
  },
  diff(cwd: string, path: string, staged: boolean, from: string): Promise<DiffPayload> {
    return get('diff', { cwd, path, staged: staged ? '1' : '0', from })
  },
  message(cwd: string): Promise<{ ok: true; message: string }> {
    return get('message', { cwd })
  },
  branches(cwd: string): Promise<{ ok: true; branches: BranchInfo[] }> {
    return get('branches', { cwd })
  },
  remotes(cwd: string): Promise<{ ok: true; remotes: RemoteInfo[] }> {
    return get('remotes', { cwd })
  },
  commitDetail(cwd: string, sha: string): Promise<{ ok: true; commit: CommitDetail }> {
    return get('commit', { cwd, sha })
  },
  compare(cwd: string, limit = 40): Promise<CompareResult> {
    return get('compare', { cwd, limit: String(limit) })
  },
  generateMessage(cwd: string, sessionId: string): Promise<GeneratedMessage> {
    return post('generate-message', { cwd, sessionId })
  },
  conflicts(cwd: string, paths: string[]): Promise<{ ok: true; conflicts: ConflictFile[] }> {
    return get('conflicts', { cwd, paths: paths.join('\0') })
  },
  resolveConflict(cwd: string, paths: string[], side: 'ours' | 'theirs'): Promise<{ ok: true; remaining: string[] }> {
    return post('resolve-conflict', { cwd, paths, side })
  },
  files(cwd: string, dir: string): Promise<FileList> {
    return get('files', { cwd, dir })
  },
  fileContent(cwd: string, path: string): Promise<FileContent> {
    return get('file-content', { cwd, path })
  },
  writeFile(cwd: string, path: string, text: string): Promise<{ ok: true; path: string; size: number }> {
    return post('write-file', { cwd, path, text })
  },
  commitFile(cwd: string, sha: string, path: string): Promise<{ ok: true; path: string; text: string; binary: boolean }> {
    return get('commit-file', { cwd, sha, path })
  },
  fileHistory(cwd: string, path: string): Promise<{ ok: true; commits: CommitNode[] }> {
    return get('file-history', { cwd, path })
  },
  openPath(cwd: string, target: string, reveal = false): Promise<{ ok: true }> {
    return post('open-path', { cwd, target, reveal })
  },
  stage(cwd: string, paths: string[]): Promise<{ ok: true }> {
    return post('stage', { cwd, paths })
  },
  unstage(cwd: string, paths: string[]): Promise<{ ok: true }> {
    return post('unstage', { cwd, paths })
  },
  discard(cwd: string, paths: string[]): Promise<{ ok: true }> {
    return post('discard', { cwd, paths })
  },
  commit(cwd: string, message: string, amend: boolean, signoff = false): Promise<CommitResult> {
    return post('commit', { cwd, message, amend, signoff })
  },
  sync(
    cwd: string,
    action: SyncAction,
    options: { remote?: string; branch?: string; setUpstream?: boolean; force?: boolean } = {},
  ): Promise<SyncResult> {
    return post('sync', { cwd, action, ...options })
  },
  checkout(cwd: string, target: string, create = false): Promise<{ ok: true; branch: string }> {
    return post('checkout', { cwd, target, create })
  },
  deleteBranch(cwd: string, name: string, force = false): Promise<{ ok: true }> {
    return post('branch-delete', { cwd, name, force })
  },
  addRemote(cwd: string, name: string, url: string): Promise<{ ok: true }> {
    return post('remote-add', { cwd, name, url })
  },
  removeRemote(cwd: string, name: string): Promise<{ ok: true }> {
    return post('remote-remove', { cwd, name })
  },
  setRemoteUrl(cwd: string, name: string, url: string): Promise<{ ok: true }> {
    return post('remote-url', { cwd, name, url })
  },
  commitAction(cwd: string, sha: string, action: CommitAction): Promise<CommitActionResult> {
    return post('commit-action', { cwd, sha, action })
  },
  terminal(cwd: string, command: string): Promise<TerminalResult> {
    return post('terminal', { cwd, command })
  },
}
