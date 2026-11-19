/**
 * Browser half of @wagq/dsh-git.
 *
 * Registers the SCM icon in two seats:
 *   - `conversation.session.header.utilities` (session scope) — beside the other
 *     utilities when a conversation is open, using that session's model.
 *   - `conversation.header.leading` (root scope) — a permanent entry that is
 *     also rendered when NO session is selected. DSH hides every session-scoped
 *     slot on the blank home screen, so without this the plugin had no entry at
 *     all until a conversation existed. The two buttons never show at once
 *     (CSS hides the global one while a session one is present).
 *
 * Props come from `inject`: the session-scoped slot hands over the session id,
 * which the button uses to resolve its effective working directory.
 */
import type { ClientContext } from './context'
import { GitHeaderButton, ensureStyles, removeStyles } from './ScmPanel'
import type { UseSessions } from './ScmPanel'

export const name = 'wagq-dsh-git-client'

export const inject = ['slots']

const SESSION_SLOT = 'conversation.session.header.utilities'
const GLOBAL_SLOT = 'conversation.header.leading'

interface SlotProps {
  sessionId?: string
  useSessions?: UseSessions
}

export function apply(ctx: ClientContext): void {
  ensureStyles()

  // Per-session button (only exists while a conversation is open). Its own
  // .dshg-trigger-session class lets CSS suppress the global fallback whenever
  // this one is mounted, avoiding two identical icons.
  //
  // No `inject` here on purpose: `sessionId` and `useSessions` are standard
  // props the DSH slot runtime already hands to every session-scoped occupant
  // (see the `conversation.session.header.utilities` contract). Adding an
  // `inject` that returns `{ sessionId }` shadowed that value with `undefined`
  // whenever the callback ran without arguments, so the popup silently fell
  // back to the first session's repository instead of the current one.
  ctx.effect(
    () =>
      ctx.slots.inject(SESSION_SLOT, () =>
        ctx.slots.register<SlotProps>(
          {
            name: SESSION_SLOT,
            id: 'wagq-dsh-git',
            order: 30,
          },
          (props) => GitHeaderButton({ sessionId: props?.sessionId, useSessions: props?.useSessions, variant: 'session' }),
        ),
      ),
    'wagq-dsh-git: session-header-button',
  )

  // Root-scoped fallback, rendered on the blank home screen too. DSH's slot
  // contract explicitly marks conversation.header.leading as "available without
  // a Session", which is exactly the missing-entry case reported by the user.
  ctx.effect(
    () =>
      ctx.slots.inject(GLOBAL_SLOT, () =>
        ctx.slots.register(
          { name: GLOBAL_SLOT, id: 'wagq-dsh-git-global', order: 30 },
          () => GitHeaderButton({ variant: 'global' }),
        ),
      ),
    'wagq-dsh-git: global-header-button',
  )

  ctx.effect(() => () => removeStyles(), 'wagq-dsh-git: styles')
}
