/**
 * Host half of @wagq/dsh-git — the git plumbing behind the SCM popup.
 *
 * Routes (all under /wagq-git, loopback + same-origin fenced):
 *   GET  /wagq-git/api/sessions            live sessions with their working directory
 *   GET  /wagq-git/api/state?cwd=          repo info + porcelain status + commit graph
 *   GET  /wagq-git/api/diff?cwd&path&staged
 *   GET  /wagq-git/api/message?cwd         a suggested commit message
 *   POST /wagq-git/api/stage               { cwd, paths }
 *   POST /wagq-git/api/unstage             { cwd, paths }
 *   POST /wagq-git/api/discard             { cwd, paths }
 *   POST /wagq-git/api/commit              { cwd, message, amend?, signoff? }
 *
 * Everything is executed with an argv array (never a shell string), and every
 * directory is resolved + validated before git is asked about it, so a crafted
 * `cwd` cannot walk into a directory the request did not name.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { HostContext, SessionsService } from './host-context.js'
import {
  GitError,
  commit,
  diff,
  discard,
  graph,
  resolveRepoDir,
  stage,
  status,
  suggestMessage,
  unstage,
} from './git.js'

export const name = 'wagq-dsh-git'

// Wait until the web server is ready; `sessions` is looked up lazily so the
// plugin still loads on a profile that does not mount it.
export const inject = ['webServer']

const PREFIX = '/wagq-git'
const MAX_BODY = 256 * 1024

interface Body {
  cwd?: unknown
  paths?: unknown
  message?: unknown
  amend?: unknown
  signoff?: unknown
  path?: unknown
  staged?: unknown
}

function header(req: IncomingMessage, key: string): string {
  const value = req.headers[key]
  return typeof value === 'string' ? value : ''
}

/** Host-only fence: a loopback `Host` defeats DNS rebinding for every route. */
function isLoopbackHost(req: IncomingMessage): boolean {
  const host = header(req, 'host')
  if (host === '') return false
  const authority = host.replace(/:\d+$/, '').toLowerCase()
  return (
    authority === 'localhost' ||
    authority === '127.0.0.1' ||
    authority === '[::1]' ||
    authority === '::1' ||
    /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(authority)
  )
}

/** Loopback + `Origin`/`Sec-Fetch-Site` check for the state-changing routes. */
function isTrustedRequest(req: IncomingMessage): boolean {
  if (!isLoopbackHost(req)) return false
  if (header(req, 'sec-fetch-site').toLowerCase() === 'cross-site') return false
  const host = header(req, 'host')
  const origin = header(req, 'origin')
  if (origin === '') return true
  try {
    const parsed = new URL(origin)
    return parsed.host === host
  } catch {
    return false
  }
}

function sendJson(res: ServerResponse, statusCode: number, body: unknown): void {
  if (res.headersSent) {
    res.destroy()
    return
  }
  const data = JSON.stringify(body)
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
  })
  res.end(data)
}

function readBody(req: IncomingMessage): Promise<Body> {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks: Buffer[] = []
    req.on('data', (chunk: Buffer) => {
      size += chunk.length
      if (size > MAX_BODY) {
        reject(new GitError('请求体过大', 413))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('error', reject)
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({})
        return
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
        resolve(parsed !== null && typeof parsed === 'object' ? (parsed as Body) : {})
      } catch {
        reject(new GitError('请求体不是合法 JSON', 400))
      }
    })
  })
}

function pathList(value: unknown): string[] {
  if (!Array.isArray(value)) throw new GitError('paths 必须是字符串数组', 400)
  const paths = value.filter((item): item is string => typeof item === 'string' && item !== '')
  if (paths.length === 0) throw new GitError('paths 不能为空', 400)
  return paths
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') throw new GitError(`缺少 ${field}`, 400)
  return value
}

/**
 * Live sessions → `{ id, cwd, title }`. The browser half uses this when the
 * slot did not hand it a session id, so the popup still lands on the right repo.
 */
function liveSessions(ctx: HostContext, fallbackCwd: string): Array<{ id: string; cwd: string; title: string }> {
  const sessions: SessionsService | undefined = ctx.get('sessions')
  const rows: Array<{ id: string; cwd: string; title: string }> = []
  try {
    const all = typeof sessions?.list === 'function' ? sessions.list() : []
    for (const session of all ?? []) {
      const id = typeof session?.id === 'string' ? session.id : ''
      const cwd = typeof session?.header?.cwd === 'string' ? session.header.cwd : ''
      if (id === '' || cwd === '') continue
      const title = session?.title ?? session?.summary?.title ?? ''
      rows.push({ id, cwd, title: typeof title === 'string' ? title : '' })
    }
  } catch {
    // A profile without the sessions service simply has no fallback list.
  }
  if (rows.length === 0) rows.push({ id: '', cwd: fallbackCwd, title: '' })
  return rows
}

export function apply(ctx: HostContext) {
  const warn = (message: string): void => {
    const logger = ctx.logger
    if (typeof logger?.warn === 'function') logger.warn(message)
    else console.warn(message)
  }
  const note = (message: string): void => {
    const logger = ctx.logger
    if (typeof logger?.info === 'function') logger.info(message)
    else console.info(message)
  }

  const dispose = ctx.webServer.register({
    kind: 'prefix',
    path: PREFIX,
    handler: async (req: IncomingMessage, res: ServerResponse) => {
      const url = new URL(req.url ?? '/', 'http://127.0.0.1')
      if (!isTrustedRequest(req)) {
        sendJson(res, 403, { ok: false, error: 'forbidden' })
        return
      }
      const fallbackCwd = process.cwd()
      try {
        if (url.pathname === `${PREFIX}/api/sessions`) {
          if (req.method !== 'GET') {
            sendJson(res, 405, { ok: false, error: 'method not allowed' })
            return
          }
          sendJson(res, 200, { ok: true, sessions: liveSessions(ctx, fallbackCwd) })
          return
        }

        if (url.pathname === `${PREFIX}/api/state`) {
          if (req.method !== 'GET') {
            sendJson(res, 405, { ok: false, error: 'method not allowed' })
            return
          }
          const cwd = await resolveRepoDir(url.searchParams.get('cwd') ?? fallbackCwd)
          const [snapshot, commits] = await Promise.all([
            status(cwd),
            graph(cwd, Number(url.searchParams.get('limit') ?? 60)),
          ])
          sendJson(res, 200, { ok: true, cwd, ...snapshot, commits })
          return
        }

        if (url.pathname === `${PREFIX}/api/diff`) {
          if (req.method !== 'GET') {
            sendJson(res, 405, { ok: false, error: 'method not allowed' })
            return
          }
          const cwd = await resolveRepoDir(url.searchParams.get('cwd') ?? fallbackCwd)
          const path = requiredString(url.searchParams.get('path'), 'path')
          const staged = url.searchParams.get('staged') === '1'
          const from = url.searchParams.get('from') ?? ''
          const payload = await diff(cwd, path, staged, from)
          sendJson(res, 200, { ok: true, ...payload })
          return
        }

        if (url.pathname === `${PREFIX}/api/message`) {
          if (req.method !== 'GET') {
            sendJson(res, 405, { ok: false, error: 'method not allowed' })
            return
          }
          const cwd = await resolveRepoDir(url.searchParams.get('cwd') ?? fallbackCwd)
          sendJson(res, 200, { ok: true, message: await suggestMessage(cwd) })
          return
        }

        if (req.method !== 'POST') {
          sendJson(res, 405, { ok: false, error: 'method not allowed' })
          return
        }

        const body = await readBody(req)
        const cwd = await resolveRepoDir(typeof body.cwd === 'string' ? body.cwd : fallbackCwd)

        if (url.pathname === `${PREFIX}/api/stage`) {
          await stage(cwd, pathList(body.paths))
          sendJson(res, 200, { ok: true })
          return
        }
        if (url.pathname === `${PREFIX}/api/unstage`) {
          await unstage(cwd, pathList(body.paths))
          sendJson(res, 200, { ok: true })
          return
        }
        if (url.pathname === `${PREFIX}/api/discard`) {
          await discard(cwd, pathList(body.paths))
          sendJson(res, 200, { ok: true })
          return
        }
        if (url.pathname === `${PREFIX}/api/commit`) {
          const result = await commit(cwd, requiredString(body.message, 'message'), {
            amend: body.amend === true,
            signoff: body.signoff === true,
          })
          sendJson(res, 200, { ok: true, ...result })
          return
        }

        sendJson(res, 404, { ok: false, error: 'not found' })
      } catch (error) {
        if (error instanceof GitError) {
          sendJson(res, error.code, { ok: false, error: error.message, detail: error.detail })
          return
        }
        const message = error instanceof Error ? error.message : String(error)
        warn(`[wagq-git] ${url.pathname} failed: ${message}`)
        sendJson(res, 500, { ok: false, error: message })
      }
    },
  })

  ctx.effect(() => () => {
    try {
      dispose()
    } catch {
      // The route table is already gone when the web server unloads first.
    }
  })

  note(`[wagq-git] routes ready under ${PREFIX}`)
}
