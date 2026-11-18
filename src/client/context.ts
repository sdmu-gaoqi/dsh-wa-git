/**
 * The slice of the browser-side Cordis context this plugin touches.
 *
 * Declared locally instead of augmenting `@deepseek-ai/cordis`: the client
 * bundle must compile against the host's runtime shape (slots + effect), which
 * the host-side Context type does not describe, and this plugin needs nothing
 * else from it.
 */

export interface SlotRegistration<P = unknown> {
  name: string
  id?: string
  order?: number
  /**
   * Builds the props handed to the component. Session-scoped slots call it with
   * the session id (dsh-purge's `inject: (sessionId) => ({ sessionId })`), so a
   * component never receives framework state it did not ask for.
   */
  inject?: (...args: never[]) => P
}

export interface SlotsService {
  /** Register a component into a slot; the returned value disposes it. */
  register<P>(registration: SlotRegistration<P>, component: (props: P) => unknown): () => void
  /** Register only once the slot itself exists (it may mount later). */
  inject(name: string, callback: () => (() => void) | void): () => void
}

export interface ClientContext {
  slots: SlotsService
  effect(callback: () => (() => void) | void, label?: string): () => void
  get?(name: string): unknown
}
