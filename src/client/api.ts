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
  stage(cwd: string, paths: string[]): Promise<{ ok: true }> {
    return post('stage', { cwd, paths })
  },
  unstage(cwd: string, paths: string[]): Promise<{ ok: true }> {
    return post('unstage', { cwd, paths })
  },
  discard(cwd: string, paths: string[]): Promise<{ ok: true }> {
    return post('discard', { cwd, paths })
  },
  commit(cwd: string, message: string, amend: boolean): Promise<CommitResult> {
    return post('commit', { cwd, message, amend })
  },
}
