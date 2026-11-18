/**
 * One popover primitive for both the ⋯ menu and the commit context menu.
 *
 * Positioning is `fixed` against the anchor's client rect, so it escapes the
 * popup's `overflow: hidden` instead of being clipped by it — the reason a plain
 * absolutely-positioned dropdown would cut off near the right edge.
 */
import * as React from 'react'

export interface MenuItem {
  id: string
  label: string
  /** Short right-aligned hint, e.g. `Ctrl+C`. */
  hint?: string
  icon?: React.ReactNode
  danger?: boolean
  disabled?: boolean
  /** Renders a divider above this item. */
  separated?: boolean
  /** Renders a small heading instead of a clickable row. */
  heading?: boolean
  onSelect?: () => void
}

export function Menu(props: {
  x: number
  y: number
  items: MenuItem[]
  onClose: () => void
  width?: number
}): React.ReactElement {
  const { x, y, items, onClose, width = 214 } = props
  const ref = React.useRef<HTMLDivElement | null>(null)
  const [pos, setPos] = React.useState({ left: x, top: y })

  // Keep the menu inside the viewport: flip up/left when it would overflow.
  React.useEffect(() => {
    const node = ref.current
    if (node === null) return
    const rect = node.getBoundingClientRect()
    const left = Math.max(8, Math.min(x, window.innerWidth - rect.width - 8))
    const top = y + rect.height > window.innerHeight - 8 ? Math.max(8, y - rect.height) : y
    setPos({ left, top })
  }, [x, y])

  React.useEffect(() => {
    const onDown = (event: MouseEvent): void => {
      if (ref.current !== null && !ref.current.contains(event.target as Node)) onClose()
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        event.preventDefault()
        onClose()
      }
    }
    // Capture phase: the popup itself listens for Escape to close, and the menu
    // must win that race.
    window.addEventListener('mousedown', onDown, true)
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('mousedown', onDown, true)
      window.removeEventListener('keydown', onKey, true)
    }
  }, [onClose])

  return React.createElement(
    'div',
    {
      ref,
      className: 'dshg-menu',
      role: 'menu',
      style: { left: pos.left, top: pos.top, width },
      onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
    },
    ...items.map((item, index) =>
      item.heading === true
        ? React.createElement('div', { key: item.id, className: 'dshg-menu-head' }, item.label)
        : React.createElement(
            React.Fragment,
            { key: item.id },
            item.separated === true ? React.createElement('div', { className: 'dshg-menu-sep' }) : null,
            React.createElement(
              'button',
              {
                type: 'button',
                role: 'menuitem',
                className: `dshg-menu-item${item.danger === true ? ' dshg-menu-danger' : ''}`,
                disabled: item.disabled === true,
                onClick: () => {
                  if (item.disabled === true) return
                  onClose()
                  item.onSelect?.()
                },
              },
              React.createElement('span', { className: 'dshg-menu-icon' }, item.icon ?? null),
              React.createElement('span', { className: 'dshg-menu-label' }, item.label),
              item.hint === undefined ? null : React.createElement('span', { className: 'dshg-menu-hint' }, item.hint),
            ),
            index === items.length - 1 ? null : null,
          ),
    ),
  )
}
