/**
 * Conflict resolver panel.
 *
 * A conflicted file has up to three stages (base / ours / theirs). This panel
 * shows ours and theirs side by side, plus the raw worktree with conflict
 * markers, and lets the user resolve the WHOLE file by taking one side —
 * `git checkout --ours/--theirs` followed by `git add`, the same operations the
 * editor's "Accept Current / Accept Incoming" commands perform.
 *
 * Partial, hand-edited resolutions remain possible through the terminal tab.
 */
import * as React from 'react'
import { api } from '../api'
import type { ConflictFile } from '../api'
import { ICONS } from '../icons'

const h = React.createElement

function Icon(props: { name: keyof typeof ICONS }): React.ReactElement {
  return h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true' }, h('path', { d: ICONS[props.name], fill: 'currentColor' }))
}

function CodeBlock(props: { text: string; tone: 'ours' | 'theirs' | 'raw' }): React.ReactElement {
  const lines = props.text === '' ? ['（此侧文件不存在 — 删除冲突）'] : props.text.split('\n')
  return h(
    'div',
    { className: `dshg-cf-code dshg-cf-${props.tone}` },
    ...lines.map((line, index) =>
      h(
        'div',
        { key: index, className: 'dshg-cf-line' },
        h('span', { className: 'dshg-cf-num' }, index + 1),
        h('span', { className: 'dshg-cf-text' }, line === '' ? ' ' : line),
      ),
    ),
  )
}

export function ConflictPanel(props: {
  cwd: string
  file: string
  onClose: () => void
  onResolved: () => void
}): React.ReactElement {
  const { cwd, file, onClose, onResolved } = props
  const [data, setData] = React.useState<ConflictFile | null>(null)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [busy, setBusy] = React.useState('')
  const [view, setView] = React.useState<'sides' | 'raw'>('sides')

  const load = React.useCallback(() => {
    setLoading(true)
    setError('')
    api
      .conflicts(cwd, [file])
      .then((result) => setData(result.conflicts[0] ?? null))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [cwd, file])

  React.useEffect(load, [load])

  const resolve = (side: 'ours' | 'theirs'): void => {
    setBusy(side)
    setError('')
    api
      .resolveConflict(cwd, [file], side)
      .then(() => {
        onResolved()
        onClose()
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setBusy(''))
  }

  return h(
    'div',
    { className: 'dshg-diff dshg-conflict' },
    h(
      'div',
      { className: 'dshg-diffhead' },
      h(Icon, { name: 'warning' }),
      h('span', { className: 'dshg-diffpath', title: file }, `冲突：${file}`),
      h('span', { className: 'dshg-spacer' }),
      h(
        'button',
        {
          type: 'button',
          className: 'dshg-mini',
          title: view === 'sides' ? '查看带标记的原文' : '查看双方对比',
          onClick: () => setView((prev) => (prev === 'sides' ? 'raw' : 'sides')),
        },
        h('span', { className: 'dshg-viewtoggle' }, view === 'sides' ? '双方' : '原文'),
      ),
      h('button', { type: 'button', className: 'dshg-mini', title: '关闭', onClick: onClose }, h(Icon, { name: 'close' })),
    ),
    h(
      'div',
      { className: 'dshg-cf-actions' },
      h(
        'button',
        { type: 'button', className: 'dshg-cf-btn dshg-cf-ours', disabled: busy !== '', onClick: () => resolve('ours') },
        busy === 'ours' ? '解决中…' : '采用当前分支（ours）',
      ),
      h(
        'button',
        { type: 'button', className: 'dshg-cf-btn dshg-cf-theirs', disabled: busy !== '', onClick: () => resolve('theirs') },
        busy === 'theirs' ? '解决中…' : '采用传入分支（theirs）',
      ),
    ),
    error !== '' ? h('div', { className: 'dshg-err' }, error) : null,
    h(
      'div',
      { className: 'dshg-diffbody dshg-cf-body' },
      loading ? h('div', { className: 'dshg-diffempty' }, '读取冲突内容…') : null,
      !loading && data === null && error === ''
        ? h('div', { className: 'dshg-diffempty' }, '这个文件已经没有冲突了')
        : null,
      !loading && data !== null && view === 'sides'
        ? h(
            'div',
            { className: 'dshg-cf-sides' },
            h(
              'div',
              { className: 'dshg-cf-col' },
              h('div', { className: 'dshg-cf-head dshg-cf-ours' }, '当前分支 · ours（HEAD）'),
              h(CodeBlock, { text: data.ours, tone: 'ours' }),
            ),
            h(
              'div',
              { className: 'dshg-cf-col' },
              h('div', { className: 'dshg-cf-head dshg-cf-theirs' }, '传入分支 · theirs（MERGE_HEAD）'),
              h(CodeBlock, { text: data.theirs, tone: 'theirs' }),
            ),
          )
        : null,
      !loading && data !== null && view === 'raw'
        ? h(
            'div',
            { className: 'dshg-cf-col' },
            h('div', { className: 'dshg-cf-head' }, '工作区原文（含冲突标记）'),
            h(CodeBlock, { text: data.worktree, tone: 'raw' }),
          )
        : null,
    ),
  )
}
