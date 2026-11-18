/**
 * The slice of the host-side Cordis context this plugin needs.
 *
 * Written as a local structural type rather than an augmentation of
 * `@deepseek-ai/cordis`: the services here (`webServer`, `sessions`, `logger`)
 * are contributed by harness host packages this plugin does not depend on, so
 * there is no declaration to merge with. Structurally typed, the object the
 * loader passes satisfies it at runtime, and `inject` guarantees the service is
 * present before `apply` runs.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'

export interface WebRoute {
  kind: 'exact' | 'prefix'
  path: string
  handler: (req: IncomingMessage, res: ServerResponse, peer?: unknown) => void | Promise<void>
}

export interface WebServerService {
  register(route: WebRoute): () => void
}

export interface HostLogger {
  info?(message: string, ...rest: unknown[]): void
  warn?(message: string, ...rest: unknown[]): void
  error?(message: string, ...rest: unknown[]): void
}

export interface HostSessionHeader {
  cwd?: string
}

export interface HostSession {
  id?: string
  header?: HostSessionHeader
  title?: string
  summary?: { title?: string }
}

export interface SessionsService {
  list?(): HostSession[]
}

export interface HostContext {
  webServer: WebServerService
  logger?: HostLogger
  effect(callback: () => (() => void) | void, label?: string): () => void
  get(name: 'sessions'): SessionsService | undefined
  get(name: string): unknown
}
