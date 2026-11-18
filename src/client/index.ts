/**
 * Browser half of @wagq/dsh-git.
 *
 * Registers one icon into the session header's utility list
 * (`conversation.session.header.utilities`, kind: list, scope: session) — the
 * same seat dsh-tv uses — so the git button sits beside the other header
 * controls and opens the SCM popup.
 *
 * Props come from `inject`: a session-scoped slot calls it with the session id,
 * which is all the button needs to resolve the session's working directory.
 */
import type { ClientContext } from './context'
import { GitHeaderButton, ensureStyles, removeStyles } from './ScmPanel'

export const name = 'wagq-dsh-git-client'

export const inject = ['slots']

const SLOT = 'conversation.session.header.utilities'

interface SlotProps {
  sessionId?: string
}

export function apply(ctx: ClientContext): void {
  ensureStyles()

  ctx.effect(
    () =>
      ctx.slots.inject(SLOT, () =>
        ctx.slots.register<SlotProps>(
          {
            name: SLOT,
            id: 'wagq-dsh-git',
            order: 30,
            inject: ((sessionId?: string) => ({ sessionId })) as (...args: never[]) => SlotProps,
          },
          (props) => GitHeaderButton({ sessionId: props?.sessionId }),
        ),
      ),
    'wagq-dsh-git: header-button',
  )

  ctx.effect(() => () => removeStyles(), 'wagq-dsh-git: styles')
}
