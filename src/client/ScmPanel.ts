/**
 * The SCM popup — VS Code「源代码管理 / 图表」shaped, extended with a branch bar,
 * a ⋯ menu, a commit detail view and an embedded git terminal.
 *
 * Three tabs:
 *   更改  working tree list (+ inline diff)
 *   图表  commit graph, click a row → commit detail, right-click → history ops
 *   终端  free-form git shell rooted at the repo
 *
 * All colours come from `--dsw-alias-*` host tokens, so the panel inherits the
 * active theme instead of pinning its own palette.
 */
import * as React from 'react'
import { ApiError, api } from './api'
import type {
  BranchInfo,
  CommitAction,
  CommitDetail,
  CommitNode,
  CompareResult,
  CompareSide,
  DiffPayload,
  RemoteInfo,
  RepoState,
  StatusEntry,
} from './api'
import { ICONS } from './icons'
import { CSS } from './styles'
import { layoutGraph, laneColor } from './graph'
import type { GraphRow } from './graph'
import { DiffBody, DiffBodySplit } from './parts/DiffBody'
import { ConflictPanel } from './parts/ConflictPanel'
import { ConfirmDialog } from './parts/ConfirmDialog'
import { Menu } from './parts/Menu'
import type { MenuItem } from './parts/Menu'
import { Terminal } from './parts/Terminal'

const STYLE_ID = '@wagq/dsh-git/scm.css'
const AUTO_REFRESH_MS = 20_000
const LANE_W = 14
const ROW_H = 26

type Tab = 'changes' | 'graph' | 'terminal'

/* ------------------------------------------------------------------ styles */

export function ensureStyles(): void {
  if (typeof document === 'undefined') return
  if (document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`) !== null) return
  const tag = document.createElement('style')
  tag.dataset.plugin = 'wagq-dsh-git'
  tag.dataset.pluginCss = STYLE_ID
  tag.textContent = CSS
  document.head.appendChild(tag)
}

export function removeStyles(): void {
  if (typeof document === 'undefined') return
  const tag = document.querySelector(`style[data-plugin-css="${STYLE_ID}"]`)
  if (tag !== null) tag.remove()
}

/* ------------------------------------------------------------------- icons */

function Icon(props: { name: keyof typeof ICONS }): React.ReactElement {
  return React.createElement(
    'svg',
    { viewBox: '0 0 16 16', 'aria-hidden': 'true', focusable: 'false' },
    React.createElement('path', { d: ICONS[props.name], fill: 'currentColor' }),
  )
}

/* ------------------------------------------------------------------- utils */

function splitPath(raw: string): { dir: string; base: string } {
  const path = raw.replace(/\\/g, '/')
  const cut = path.lastIndexOf('/')
  if (cut === -1) return { dir: '', base: path }
  return { dir: path.slice(0, cut + 1), base: path.slice(cut + 1) }
}

function relativeTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  const delta = Math.max(0, Math.floor(Date.now() / 1000 - seconds))
  if (delta < 60) return '刚刚'
  if (delta < 3600) return `${Math.floor(delta / 60)} 分钟前`
  if (delta < 86_400) return `${Math.floor(delta / 3600)} 小时前`
  if (delta < 86_400 * 30) return `${Math.floor(delta / 86_400)} 天前`
  const date = new Date(seconds * 1000)
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function absoluteTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return ''
  const date = new Date(seconds * 1000)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function refKind(ref: string): 'tag' | 'remote' | 'branch' {
  if (/^tag: /i.test(ref)) return 'tag'
  if (/^[^/\s]+\/[^/\s]+$/.test(ref)) return 'remote'
  return 'branch'
}

function refLabel(ref: string): string {
  return ref.replace(/^tag: /i, '').replace(/^origin\//, '')
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Clipboard API needs a secure context; fall back to a scratch textarea.
    try {
      const area = document.createElement('textarea')
      area.value = text
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch {
      return false
    }
  }
}

/* ------------------------------------------------------------------- graph */

function GraphLanes(props: { row: GraphRow; lanes: number }): React.ReactElement {
  const { row, lanes } = props
  const width = Math.max(lanes, 1) * LANE_W
  const cx = (lane: number): number => lane * LANE_W + LANE_W / 2
  const mid = ROW_H / 2
  const children: React.ReactElement[] = []

  for (const pass of row.passThrough) {
    children.push(
      React.createElement('line', {
        key: `v${pass.lane}`,
        x1: cx(pass.lane),
        y1: 0,
        x2: cx(pass.lane),
        y2: ROW_H,
        stroke: pass.color,
        strokeWidth: 2,
        strokeLinecap: 'round',
      }),
    )
  }
  if (row.fromTop) {
    children.push(
      React.createElement('line', {
        key: 'up',
        x1: cx(row.lane),
        y1: 0,
        x2: cx(row.lane),
        y2: mid,
        stroke: row.color,
        strokeWidth: 2,
        strokeLinecap: 'round',
      }),
    )
  }
  if (row.toBottom) {
    children.push(
      React.createElement('line', {
        key: 'down',
        x1: cx(row.lane),
        y1: mid,
        x2: cx(row.lane),
        y2: ROW_H,
        stroke: row.color,
        strokeWidth: 2,
        strokeLinecap: 'round',
      }),
    )
  }
  for (const merge of row.merges) {
    if (merge.lane === row.lane) continue
    const x1 = cx(row.lane)
    const x2 = cx(merge.lane)
    children.push(
      React.createElement('path', {
        key: `m${merge.lane}`,
        d: `M ${x1} ${mid} C ${x1} ${mid + ROW_H / 3}, ${x2} ${ROW_H - ROW_H / 3}, ${x2} ${ROW_H}`,
        fill: 'none',
        stroke: merge.color,
        strokeWidth: 2,
        strokeLinecap: 'round',
      }),
    )
  }
  children.push(
    React.createElement('circle', {
      key: 'node',
      cx: cx(row.lane),
      cy: mid,
      r: 4,
      fill: 'var(--dsw-alias-bg-layer-1)',
      stroke: row.color,
      strokeWidth: 2,
    }),
  )
  return React.createElement(
    'svg',
    { className: 'dshg-gsvg', width, height: ROW_H, viewBox: `0 0 ${width} ${ROW_H}`, 'aria-hidden': 'true' },
    ...children,
  )
}

/* ------------------------------------------------------------- repo loader */

interface RepoHook {
  state: RepoState | null
  loading: boolean
  error: string
  refresh: (quiet: boolean) => void
}

function useRepoState(cwd: string, open: boolean): RepoHook {
  const [state, setState] = React.useState<RepoState | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const seq = React.useRef(0)

  const load = React.useCallback(
    (quiet: boolean) => {
      if (cwd === '') return
      const mine = ++seq.current
      if (!quiet) setLoading(true)
      api
        .state(cwd, 120)
        .then((next) => {
          if (mine !== seq.current) return
          setState(next)
          setError('')
        })
        .catch((err: unknown) => {
          if (mine !== seq.current) return
          setState(null)
          setError(err instanceof ApiError && err.detail !== '' ? err.message : err instanceof Error ? err.message : String(err))
        })
        .finally(() => {
          if (mine === seq.current) setLoading(false)
        })
    },
    [cwd],
  )

  React.useEffect(() => {
    load(false)
  }, [load])

  React.useEffect(() => {
    if (!open) return undefined
    const timer = setInterval(() => load(true), AUTO_REFRESH_MS)
    return () => clearInterval(timer)
  }, [open, load])

  return { state, loading, error, refresh: load }
}

/* ------------------------------------------------------------ commit detail */

function CommitDetailView(props: {
  cwd: string
  sha: string
  split: boolean
  onToggleSplit: () => void
  onClose: () => void
}): React.ReactElement {
  const { cwd, sha, split, onClose } = props
  const [detail, setDetail] = React.useState<CommitDetail | null>(null)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setDetail(null)
    api
      .commitDetail(cwd, sha)
      .then((result) => {
        if (alive) setDetail(result.commit)
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [cwd, sha])

  const meta = (): React.ReactElement | null => {
    if (detail === null) return null
    return React.createElement(
      'div',
      { className: 'dshg-cmeta' },
      React.createElement('div', { className: 'dshg-cmeta-subject' }, detail.subject === '' ? '(no message)' : detail.subject),
      React.createElement(
        'div',
        { className: 'dshg-cmeta-row' },
        React.createElement('span', { className: 'dshg-gsha' }, detail.short),
        React.createElement('span', null, detail.author),
        React.createElement('span', { title: absoluteTime(detail.time) }, relativeTime(detail.time)),
        detail.parents.length > 1
          ? React.createElement('span', { className: 'dshg-gref', 'data-kind': 'remote' }, `merge · ${detail.parents.length} parents`)
          : null,
      ),
      detail.body.trim() === ''
        ? null
        : React.createElement('pre', { className: 'dshg-cmeta-body' }, detail.body.trim()),
      React.createElement(
        'div',
        { className: 'dshg-cmeta-files' },
        ...detail.files.map((file) =>
          React.createElement(
            'span',
            { key: `${file.path}:${file.from}`, className: 'dshg-cfile', title: file.from === '' ? file.path : `${file.from} → ${file.path}` },
            React.createElement('span', { className: 'dshg-cfile-name' }, file.path),
            file.binary
              ? React.createElement('span', { className: 'dshg-rowstat' }, 'bin')
              : React.createElement(
                  'span',
                  { className: 'dshg-rowstat' },
                  React.createElement('span', { className: 'dshg-add' }, `+${file.added}`),
                  React.createElement('span', { className: 'dshg-del' }, `−${file.removed}`),
                ),
          ),
        ),
      ),
    )
  }

  return React.createElement(
    'div',
    { className: 'dshg-diff dshg-cdetail' },
    React.createElement(
      'div',
      { className: 'dshg-diffhead' },
      React.createElement(Icon, { name: 'commit' }),
      React.createElement('span', { className: 'dshg-diffpath' }, `提交 ${sha.slice(0, 7)}`),
      detail !== null
        ? React.createElement(
            'span',
            { className: 'dshg-rowstat' },
            React.createElement('span', { className: 'dshg-add' }, `+${detail.added}`),
            React.createElement('span', { className: 'dshg-del' }, `−${detail.removed}`),
          )
        : null,
      React.createElement('span', { className: 'dshg-spacer' }),
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'dshg-mini',
          title: split ? '切换为行内视图' : '切换为并排视图',
          'aria-pressed': split,
          onClick: () => props.onToggleSplit(),
        },
        React.createElement('span', { className: 'dshg-viewtoggle' }, split ? '并排' : '行内'),
      ),
      React.createElement(
        'button',
        { type: 'button', className: 'dshg-mini', title: '关闭（Esc）', onClick: onClose },
        React.createElement(Icon, { name: 'close' }),
      ),
    ),
    React.createElement(
      'div',
      { className: `dshg-diffbody${split ? ' dshg-diffbody-split' : ''}` },
      loading ? React.createElement('div', { className: 'dshg-diffempty' }, '正在读取提交…') : null,
      !loading && error !== '' ? React.createElement('div', { className: 'dshg-diffempty' }, error) : null,
      !loading && detail !== null
        ? React.createElement(
            React.Fragment,
            null,
            meta(),
            React.createElement(split ? DiffBodySplit : DiffBody, { patch: detail.patch, empty: '这个提交没有文本差异' }),
            detail.tooLarge ? React.createElement('div', { className: 'dshg-diffempty' }, '差异过大，仅显示前 60 万字符') : null,
          )
        : null,
    ),
  )
}

/* -------------------------------------------------------------- branch menu */

function BranchPicker(props: {
  cwd: string
  current: string
  onClose: () => void
  onSwitched: () => void
  x: number
  y: number
}): React.ReactElement {
  const { cwd, current, onClose, onSwitched, x, y } = props
  const [list, setList] = React.useState<BranchInfo[] | null>(null)
  const [error, setError] = React.useState('')
  const [filter, setFilter] = React.useState('')
  const [newName, setNewName] = React.useState('')

  React.useEffect(() => {
    let alive = true
    api
      .branches(cwd)
      .then((result) => {
        if (alive) setList(result.branches)
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof Error ? err.message : String(err))
      })
    return () => {
      alive = false
    }
  }, [cwd])

  const switchTo = (name: string): void => {
    api
      .checkout(cwd, name)
      .then(() => {
        onSwitched()
        onClose()
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
  }

  const filtered = (list ?? []).filter((branch) => filter === '' || branch.name.toLowerCase().includes(filter.toLowerCase()))
  const local = filtered.filter((branch) => !branch.remote)
  const remote = filtered.filter((branch) => branch.remote)

  return React.createElement(
    'div',
    {
      className: 'dshg-menu dshg-branchpicker',
      style: { left: Math.max(8, x - 260), top: y + 6, width: 300 },
      role: 'dialog',
      'aria-label': '切换分支',
    },
    React.createElement('div', { className: 'dshg-menu-head' }, '切换分支 / 标签'),
    React.createElement('input', {
      className: 'dshg-input',
      placeholder: '筛选分支名…',
      value: filter,
      autoFocus: true,
      spellCheck: false,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => setFilter(event.target.value),
      onKeyDown: (event: React.KeyboardEvent) => {
        if (event.key === 'Escape') onClose()
        if (event.key === 'Enter') {
          const first = filtered[0]
          if (first !== undefined && !first.current) switchTo(first.name)
        }
      },
    }),
    error !== '' ? React.createElement('div', { className: 'dshg-err' }, error) : null,
    list === null
      ? React.createElement('div', { className: 'dshg-loading' }, '读取分支…')
      : React.createElement(
          'div',
          { className: 'dshg-menu-scroll' },
          local.length > 0 ? React.createElement('div', { className: 'dshg-menu-head' }, '本地') : null,
          ...local.map((branch) =>
            React.createElement(
              'button',
              {
                key: `l:${branch.name}`,
                type: 'button',
                className: `dshg-menu-item${branch.current ? ' dshg-menu-current' : ''}`,
                disabled: branch.current,
                title: branch.subject,
                onClick: () => switchTo(branch.name),
              },
              React.createElement('span', { className: 'dshg-menu-icon' }, branch.current ? React.createElement(Icon, { name: 'check' }) : null),
              React.createElement('span', { className: 'dshg-menu-label' }, branch.name),
              branch.ahead > 0 || branch.behind > 0
                ? React.createElement('span', { className: 'dshg-menu-hint' }, `↑${branch.ahead} ↓${branch.behind}`)
                : React.createElement('span', { className: 'dshg-menu-hint' }, branch.sha),
            ),
          ),
          remote.length > 0 ? React.createElement('div', { className: 'dshg-menu-head' }, '远程') : null,
          ...remote.map((branch) =>
            React.createElement(
              'button',
              {
                key: `r:${branch.name}`,
                type: 'button',
                className: 'dshg-menu-item',
                title: branch.subject,
                onClick: () => {
                  // A remote ref is not checked out directly; create a local branch
                  // that tracks it, which is what the user means by "switch to it".
                  const localName = branch.name.replace(/^[^/]+\//, '')
                  api
                    .checkout(cwd, localName, true)
                    .then(() => {
                      onSwitched()
                      onClose()
                    })
                    .catch(() => {
                      switchTo(branch.name)
                    })
                },
              },
              React.createElement('span', { className: 'dshg-menu-icon' }, null),
              React.createElement('span', { className: 'dshg-menu-label' }, branch.name),
              React.createElement('span', { className: 'dshg-menu-hint' }, branch.sha),
            ),
          ),
        ),
    React.createElement(
      'div',
      { className: 'dshg-branchnew' },
      React.createElement('input', {
        className: 'dshg-input',
        placeholder: '新分支名（从当前 HEAD 创建）',
        value: newName,
        spellCheck: false,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => setNewName(event.target.value),
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === 'Enter' && newName.trim() !== '') {
            api
              .checkout(cwd, newName.trim(), true)
              .then(() => {
                onSwitched()
                onClose()
              })
              .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
          }
        },
      }),
    ),
  )
}

/* --------------------------------------------------------- upstream compare */

/**
 * 「和远程对比」: the two commit lists `HEAD...upstream` produces.
 *
 * VS Code shows the same thing as two groups in the SCM view (↓ incoming,
 * ↑ outgoing). Here it is a side panel so it can be read next to the list, and
 * each row is clickable to inspect that commit.
 */
function CompareView(props: {
  cwd: string
  onClose: () => void
  onPick: (sha: string) => void
}): React.ReactElement {
  const { cwd, onClose, onPick } = props
  const [data, setData] = React.useState<CompareResult | null>(null)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  const load = React.useCallback(() => {
    setLoading(true)
    setError('')
    api
      .compare(cwd, 60)
      .then((result) => setData(result))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false))
  }, [cwd])

  React.useEffect(load, [load])

  const group = (
    title: string,
    hint: string,
    list: CompareSide[],
    tone: 'in' | 'out',
  ): React.ReactNode =>
    React.createElement(
      'div',
      { className: 'dshg-cmp-group' },
      React.createElement(
        'div',
        { className: 'dshg-sechead dshg-static' },
        React.createElement('span', { className: `dshg-cmp-arrow dshg-cmp-${tone}` }, tone === 'in' ? '↓' : '↑'),
        React.createElement('span', { className: 'dshg-sectitle' }, title),
        React.createElement('span', { className: 'dshg-count' }, list.length),
        React.createElement('span', { className: 'dshg-secactions' },
          React.createElement('span', { className: 'dshg-gsha' }, hint),
        ),
      ),
      list.length === 0
        ? React.createElement('div', { className: 'dshg-cmp-empty' }, '没有提交')
        : React.createElement(
            'div',
            null,
            ...list.map((side) =>
              React.createElement(
                'div',
                {
                  key: side.sha,
                  className: 'dshg-cmp-row',
                  role: 'button',
                  tabIndex: 0,
                  title: `${side.sha}\n${side.author}\n${side.subject}`,
                  onClick: () => onPick(side.sha),
                  onKeyDown: (event: React.KeyboardEvent) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onPick(side.sha)
                    }
                  },
                },
                React.createElement('span', { className: 'dshg-cmp-subject' }, side.subject === '' ? '(no message)' : side.subject),
                React.createElement('span', { className: 'dshg-gside' },
                  React.createElement('span', { className: 'dshg-gsha' }, side.short),
                  React.createElement('span', null, relativeTime(side.time)),
                ),
              ),
            ),
          ),
    )

  return React.createElement(
    'div',
    { className: 'dshg-diff dshg-compare' },
    React.createElement(
      'div',
      { className: 'dshg-diffhead' },
      React.createElement(Icon, { name: 'sync' }),
      React.createElement(
        'span',
        { className: 'dshg-diffpath' },
        data === null || data.upstream === '' ? '与远程对比' : `与 ${data.upstream} 对比`,
      ),
      React.createElement('span', { className: 'dshg-spacer' }),
      React.createElement(
        'button',
        { type: 'button', className: 'dshg-mini', title: '刷新对比', onClick: load },
        React.createElement(Icon, { name: 'refresh' }),
      ),
      React.createElement(
        'button',
        { type: 'button', className: 'dshg-mini', title: '关闭（Esc）', onClick: onClose },
        React.createElement(Icon, { name: 'close' }),
      ),
    ),
    React.createElement(
      'div',
      { className: 'dshg-diffbody dshg-cmp-body' },
      loading ? React.createElement('div', { className: 'dshg-diffempty' }, '正在对比远程…') : null,
      !loading && error !== '' ? React.createElement('div', { className: 'dshg-diffempty' }, error) : null,
      !loading && error === '' && data !== null && data.upstream === ''
        ? React.createElement(
            'div',
            { className: 'dshg-diffempty' },
            '当前分支没有上游分支，无法对比。先推送一次（会建立上游）再回来看。',
          )
        : null,
      !loading && data !== null && data.upstream !== ''
        ? React.createElement(
            React.Fragment,
            null,
            group('落后（远端有、本地没有）', data.upstream, data.behind, 'in'),
            group('领先（本地有、远端没有）', 'HEAD', data.ahead, 'out'),
          )
        : null,
    ),
  )
}

/* ------------------------------------------------------------------- popup */

interface PopupProps {
  cwd: string
  /** Session whose model writes commit messages; empty falls back to the default. */
  sessionId: string
  anchor: DOMRect | null
  onClose: () => void
}

function Popup(props: PopupProps): React.ReactElement {
  const { cwd, sessionId, anchor, onClose } = props
  const repo = useRepoState(cwd, true)
  const state = repo.state

  const [tab, setTab] = React.useState<Tab>('changes')
  const [message, setMessage] = React.useState('')
  const [amend, setAmend] = React.useState(false)
  const [busy, setBusy] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const [failure, setFailure] = React.useState('')
  const [selected, setSelected] = React.useState<StatusEntry | null>(null)
  const [open, setOpen] = React.useState({ staged: true, changes: true, untracked: true })
  const [menu, setMenu] = React.useState<{ x: number; y: number; items: MenuItem[] } | null>(null)
  const [branchPicker, setBranchPicker] = React.useState<{ x: number; y: number } | null>(null)
  /** Anchor rect of the ⋯ button, reused by every remote submenu so they stay
   *  next to the button instead of jumping to the middle of the screen. */
  const menuAnchor = React.useRef<{ x: number; y: number } | null>(null)

  /** Open a menu at the ⋯ button and make sure the branch picker is closed. */
  const showMenu = (items: MenuItem[], at?: { x: number; y: number }): void => {
    setBranchPicker(null)
    const anchor = at ?? menuAnchor.current ?? { x: window.innerWidth - 230, y: 96 }
    menuAnchor.current = anchor
    setMenu({ x: anchor.x, y: anchor.y, items })
  }

  /** Open the branch picker and close the ⋯ menu so the two never overlap. */
  const showBranchPicker = (at: { x: number; y: number }): void => {
    setMenu(null)
    setBranchPicker(at)
  }
  const [commitSha, setCommitSha] = React.useState('')
  const [detail, setDetail] = React.useState<CommitDetail | null>(null)
  /** A confirm dialog, optionally with text fields (remote add / edit URL). */
  const [confirm, setConfirm] = React.useState<{
    title: string
    body: string
    fields?: Array<{ name: string; label: string; value: string; placeholder?: string }>
    okLabel?: string
    danger?: boolean
    run: (values: Record<string, string>) => void
  } | null>(null)
  /** `true` while the 「与远程对比」 side panel is open. */
  const [compareOpen, setCompareOpen] = React.useState(false)
  /** Side-by-side (VS Code style) vs inline diff. Remembered for this popup. */
  const [diffSplit, setDiffSplit] = React.useState(true)
  /** A conflicted file being resolved; takes over the side panel. */
  const [conflictFile, setConflictFile] = React.useState('')
  const messageRef = React.useRef<HTMLTextAreaElement | null>(null)

  const stagedCount = state?.staged.length ?? 0

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      if (menu !== null || branchPicker !== null || confirm !== null) return // those handle it first
      event.preventDefault()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose, menu, branchPicker, confirm])

  React.useEffect(() => {
    setSelected(null)
    setMessage('')
    setAmend(false)
    setNotice('')
    setFailure('')
    setCommitSha('')
    setCompareOpen(false)
    setConflictFile('')
    setTab('changes')
  }, [cwd])

  const run = (label: string, task: () => Promise<unknown>, after?: () => void): void => {
    setBusy(label)
    setFailure('')
    setNotice('')
    task()
      .then(() => {
        repo.refresh(true)
        after?.()
      })
      .catch((err: unknown) => {
        const detailText = err instanceof ApiError ? err.detail : ''
        setFailure(detailText !== '' ? detailText : err instanceof Error ? err.message : String(err))
      })
      .finally(() => setBusy(''))
  }

  const notify = (text: string): void => {
    setNotice(text)
    window.setTimeout(() => setNotice((prev) => (prev === text ? '' : prev)), 4000)
  }

  const doSync = (action: 'fetch' | 'pull' | 'push'): void => {
    run(action, () =>
      api.sync(cwd, action, { setUpstream: action === 'push' }).then((result) => {
        notify(result.summary)
        if (action === 'pull' || action === 'push') repo.refresh(true)
      }),
    )
  }

  const doCommit = (): void => {
    if (message.trim() === '') {
      messageRef.current?.focus()
      return
    }
    run('commit', async () => {
      const result = await api.commit(cwd, message.trim(), amend)
      setMessage('')
      setAmend(false)
      notify(`已提交 ${result.short}${result.branch === '' ? '' : ` · ${result.branch}`}`)
    })
  }

  const doGenerate = (): void => {
    run('generate', async () => {
      const result = await api.generateMessage(cwd, sessionId)
      setMessage(result.message)
      messageRef.current?.focus()
      notify(`由 ${result.model} 生成`)
    })
  }

  const doManualRefresh = (): void => {
    repo.refresh(false)
  }

  /* ---- ⋯ menu ---- */
  const openMainMenu = (event: React.MouseEvent): void => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const behind = state?.repo.behind ?? 0
    const ahead = state?.repo.ahead ?? 0
    menuAnchor.current = { x: rect.right - 214, y: rect.bottom + 4 }
    showMenu([
        { id: 'h1', label: '同步', heading: true },
        {
          id: 'pull',
          label: '拉取（Pull）',
          icon: React.createElement(Icon, { name: 'download' }),
          hint: behind > 0 ? `落后 ${behind}` : undefined,
          onSelect: () => doSync('pull'),
        },
        {
          id: 'push',
          label: '推送（Push）',
          icon: React.createElement(Icon, { name: 'upload' }),
          hint: ahead > 0 ? `领先 ${ahead}` : undefined,
          onSelect: () => {
            if (ahead === 0) {
              // Nothing to push is not an error worth a round trip — but the user
              // may still want to publish an unpushed branch, so ask git anyway.
            }
            doSync('push')
          },
        },
        {
          id: 'fetch',
          label: '抓取（Fetch）',
          icon: React.createElement(Icon, { name: 'sync' }),
          onSelect: () => doSync('fetch'),
        },
        { id: 'h2', label: '分支与远端', heading: true, separated: true },
        {
          id: 'switch',
          label: '切换分支…',
          icon: React.createElement(Icon, { name: 'branch' }),
          onSelect: () => showBranchPicker({ x: rect.right, y: rect.bottom }),
        },
        {
          id: 'stage',
          label: '暂存全部更改',
          icon: React.createElement(Icon, { name: 'plus' }),
          disabled: state === null || state.changes.length + state.untracked.length === 0,
          onSelect: () => {
            if (state === null) return
            const paths = [...state.changes, ...state.untracked].map((entry) => entry.path)
            run('stage', () => api.stage(cwd, paths))
          },
        },
        { id: 'remotes', label: '远程管理…', icon: React.createElement(Icon, { name: 'repo' }), onSelect: openRemotesMenu },
        { id: 'h3', label: '其它', heading: true, separated: true },
        { id: 'terminal', label: '打开 Git 终端', icon: React.createElement(Icon, { name: 'terminal' }), onSelect: () => setTab('terminal') },
        { id: 'refresh', label: '刷新', icon: React.createElement(Icon, { name: 'refresh' }), onSelect: doManualRefresh },
      ])
  }

  const openRemotesMenu = (): void => {
    api
      .remotes(cwd)
      .then((result) => {
        const items: MenuItem[] = [{ id: 'rh', label: '远程', heading: true }]
        for (const remote of result.remotes) {
          items.push({
            id: `r:${remote.name}`,
            label: remote.name,
            hint: shortenUrl(remote.url),
            onSelect: () => openRemoteEdit(remote),
          })
        }
        if (result.remotes.length === 0) {
          items.push({ id: 'none', label: '还没有配置远端', disabled: true })
        }
        items.push({
          id: 'add',
          label: '添加远端…',
          separated: true,
          icon: React.createElement(Icon, { name: 'plus' }),
          onSelect: () => addRemoteFlow(),
        })
        showMenu(items)
      })
      .catch((err: unknown) => setFailure(err instanceof Error ? err.message : String(err)))
  }

  const shortenUrl = (url: string): string => {
    const clean = url.replace(/\.git$/, '')
    return clean.length > 28 ? `…${clean.slice(-27)}` : clean
  }

  const openRemoteEdit = (remote: RemoteInfo): void => {
    showMenu([
      { id: 'h', label: remote.name, heading: true },
      {
        id: 'copy',
        label: '复制远端地址',
        onSelect: () => {
          void copyText(remote.url).then((ok) => notify(ok ? '已复制远端地址' : '复制失败'))
        },
      },
      {
        id: 'url',
        label: '修改地址…',
        onSelect: () =>
          setConfirm({
            title: `修改 ${remote.name} 的地址`,
            body: '填新的 URL 后保存；clone / fetch / push 都会改用这个地址。',
            fields: [{ name: 'url', label: '远端 URL', value: remote.url, placeholder: 'https://… 或 git@…' }],
            okLabel: '保存',
            run: (values) => {
              const next = (values.url ?? '').trim()
              if (next === '' || next === remote.url) return
              run('remote', () => api.setRemoteUrl(cwd, remote.name, next))
            },
          }),
      },
      {
        id: 'remove',
        label: `删除远端 ${remote.name}`,
        danger: true,
        separated: true,
        onSelect: () =>
          setConfirm({
            title: `删除远端 ${remote.name}`,
            body: '这会移除本地对它的配置，不会影响远端服务器上的仓库。',
            danger: true,
            okLabel: '删除',
            run: () => run('remote', () => api.removeRemote(cwd, remote.name)),
          }),
      },
    ])
  }

  const addRemoteFlow = (): void => {
    setConfirm({
      title: '添加远端',
      body: '加好后就可以拉取和推送了。名称通常是 origin、upstream 之类的短名字。',
      fields: [
        { name: 'name', label: '名称', value: 'origin', placeholder: 'origin' },
        { name: 'url', label: 'URL', value: '', placeholder: 'https://… 或 git@…' },
      ],
      okLabel: '添加',
      run: (values) => {
        const name = (values.name ?? '').trim()
        const url = (values.url ?? '').trim()
        if (name === '' || url === '') return
        run('remote', () => api.addRemote(cwd, name, url))
      },
    })
  }

  /* ---- commit context menu ---- */
  const openCommitMenu = (event: React.MouseEvent, commit: CommitNode): void => {
    event.preventDefault()
    event.stopPropagation()
    const behind = commit.sha !== state?.repo.head
    showMenu([
      { id: 'h', label: `${commit.short} · ${commit.subject.slice(0, 28)}`, heading: true },
        {
          id: 'copy-sha',
          label: '复制提交哈希',
          hint: 'SHA',
          onSelect: () => {
            void copyText(commit.sha).then((ok) => notify(ok ? '已复制哈希' : '复制失败'))
          },
        },
        {
          id: 'copy-msg',
          label: '复制提交消息',
          hint: 'message',
          onSelect: () => {
            void copyText(commit.subject).then((ok) => notify(ok ? '已复制提交消息' : '复制失败'))
          },
        },
        {
          id: 'revert',
          label: '恢复至当前提交（生成反向提交）',
          separated: true,
          onSelect: () =>
            run('commit-action', () =>
              api.commitAction(cwd, commit.sha, 'revert').then((result) => notify(result.summary)),
            ),
        },
        { id: 'h2', label: '重置（reset）', heading: true },
        {
          id: 'reset-soft',
          label: '软重置到此提交',
          hint: '保留暂存',
          onSelect: () => runReset(commit, 'reset-soft'),
        },
        {
          id: 'reset-mixed',
          label: '混合重置到此提交',
          hint: '保留工作区',
          onSelect: () => runReset(commit, 'reset-mixed'),
        },
        {
          id: 'reset-hard',
          label: '硬重置到此提交',
          hint: '丢弃改动',
          danger: true,
          onSelect: () => runReset(commit, 'reset-hard'),
        },
        {
          id: 'rebase',
          label: 'rebase 到此提交',
          separated: true,
          danger: true,
          disabled: !behind,
          onSelect: () =>
            setConfirm({
              title: `rebase 到 ${commit.short}`,
              body: '当前分支的提交会被重放到这个提交之上，历史会被改写（已推送的提交需要强推）。',
              danger: true,
              run: () =>
                run('commit-action', () =>
                  api.commitAction(cwd, commit.sha, 'rebase').then((result) => notify(result.summary)),
                ),
            }),
        },
      ], { x: event.clientX, y: event.clientY })
  }

  const runReset = (commit: CommitNode, action: CommitAction): void => {
    const label = action === 'reset-soft' ? '软重置' : action === 'reset-mixed' ? '混合重置' : '硬重置'
    const body =
      action === 'reset-hard'
        ? `工作区和暂存区的改动会全部丢弃，HEAD 会移动到 ${commit.short}。这个操作不能撤销。`
        : action === 'reset-mixed'
          ? `HEAD 会移动到 ${commit.short}，之后的提交取消暂存但内容留在工作区。`
          : `HEAD 会移动到 ${commit.short}，之后的提交内容全部进入暂存区。`
    setConfirm({
      title: `${label}到 ${commit.short}`,
      body,
      danger: true,
      okLabel: '确认执行',
      run: () =>
        run('commit-action', () => api.commitAction(cwd, commit.sha, action).then((result) => notify(result.summary))),
    })
  }

  /* ---- rows ---- */
  const rowView = (entry: StatusEntry): React.ReactElement => {
    const { dir, base } = splitPath(entry.path)
    const isStaged = entry.kind === 'staged'
    const isConflict = entry.kind === 'conflicted'
    const active = selected !== null && selected.path === entry.path && selected.kind === entry.kind
    const stat = state?.stats?.[entry.path]
    const changed = stat === undefined ? 0 : stat.added + stat.removed
    const open = (): void => {
      if (isConflict) setConflictFile(entry.path)
      else {
        setConflictFile('')
        setSelected(entry)
      }
    }
    return React.createElement(
      'div',
      {
        key: `${entry.kind}:${entry.path}:${entry.from}`,
        className: `dshg-row${isConflict ? ' dshg-row-conflict' : ''}`,
        role: 'button',
        tabIndex: 0,
        'data-active': active,
        title: isConflict ? `${entry.path}（点击解决冲突）` : entry.from === '' ? entry.path : `${entry.from} → ${entry.path}`,
        onClick: open,
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            open()
          }
        },
      },
      React.createElement(
        'span',
        { className: 'dshg-rowname' },
        dir === '' ? null : React.createElement('span', { className: 'dshg-rowdir' }, dir),
        base,
      ),
      React.createElement(
        'span',
        { className: 'dshg-rowdeco' },
        stat !== undefined && changed > 0
          ? React.createElement(
              'span',
              { className: 'dshg-rowstat' },
              React.createElement('span', { className: 'dshg-add' }, `+${stat.added}`),
              React.createElement('span', { className: 'dshg-del' }, `−${stat.removed}`),
            )
          : null,
        React.createElement('span', { className: `dshg-rowletter dshg-letter-${entry.letter}` }, entry.letter),
      ),
      React.createElement(
        'span',
        { className: 'dshg-rowbtns' },
        isStaged
          ? React.createElement(
              'button',
              {
                type: 'button',
                className: 'dshg-mini',
                title: '取消暂存',
                onClick: (event: React.MouseEvent) => {
                  event.stopPropagation()
                  run('unstage', () => api.unstage(cwd, [entry.path]))
                },
              },
              React.createElement(Icon, { name: 'minus' }),
            )
          : React.createElement(
              'button',
              {
                type: 'button',
                className: 'dshg-mini',
                title: '暂存更改',
                onClick: (event: React.MouseEvent) => {
                  event.stopPropagation()
                  run('stage', () => api.stage(cwd, [entry.path]))
                },
              },
              React.createElement(Icon, { name: 'plus' }),
            ),
        isStaged
          ? null
          : React.createElement(
              'button',
              {
                type: 'button',
                className: 'dshg-mini',
                title: entry.kind === 'untracked' ? '删除文件' : '放弃更改',
                onClick: (event: React.MouseEvent) => {
                  event.stopPropagation()
                  run('discard', () => api.discard(cwd, [entry.path]))
                },
              },
              React.createElement(Icon, { name: 'undo' }),
            ),
      ),
    )
  }

  const section = (
    key: 'staged' | 'changes' | 'untracked',
    title: string,
    entries: StatusEntry[],
    actions: React.ReactNode,
  ): React.ReactElement | null => {
    if (entries.length === 0) return null
    const isOpen = open[key]
    const toggle = (): void => setOpen((prev) => ({ ...prev, [key]: !prev[key] }))
    return React.createElement(
      'div',
      { className: 'dshg-section', key },
      React.createElement(
        'div',
        {
          className: 'dshg-sechead',
          role: 'button',
          tabIndex: 0,
          onClick: toggle,
          onKeyDown: (event: React.KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              toggle()
            }
          },
        },
        React.createElement('span', { className: 'dshg-caret', 'data-open': isOpen }, React.createElement(Icon, { name: 'chevron' })),
        React.createElement('span', { className: 'dshg-sectitle' }, title),
        React.createElement('span', { className: 'dshg-count' }, entries.length),
        React.createElement('span', { className: 'dshg-secactions' }, actions),
      ),
      isOpen ? React.createElement('div', null, ...entries.map(rowView)) : null,
    )
  }

  /* ---- diff for a working-tree file ---- */
  const [diffPayload, setDiffPayload] = React.useState<DiffPayload | null>(null)
  const [diffError, setDiffError] = React.useState('')
  const [diffLoading, setDiffLoading] = React.useState(false)
  React.useEffect(() => {
    if (selected === null) {
      setDiffPayload(null)
      setDiffError('')
      return undefined
    }
    let alive = true
    setDiffLoading(true)
    setDiffError('')
    setDiffPayload(null)
    api
      .diff(cwd, selected.path, selected.kind === 'staged', selected.from)
      .then((next) => {
        if (alive) setDiffPayload(next)
      })
      .catch((err: unknown) => {
        if (alive) setDiffError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => {
        if (alive) setDiffLoading(false)
      })
    return () => {
      alive = false
    }
  }, [cwd, selected])

  /* ---- commit detail loader ---- */
  React.useEffect(() => {
    if (commitSha === '') {
      setDetail(null)
      return undefined
    }
    let alive = true
    api
      .commitDetail(cwd, commitSha)
      .then((result) => {
        if (alive) setDetail(result.commit)
      })
      .catch(() => {
        if (alive) setDetail(null)
      })
    return () => {
      alive = false
    }
  }, [cwd, commitSha])

  /* ---- graph ---- */
  const graphRows = state === null ? [] : layoutGraph(state.commits)
  const laneTotal = graphRows.reduce((max, row) => Math.max(max, row.laneCount), 1)
  const commitBySha = new Map<string, CommitNode>()
  if (state !== null) for (const commit of state.commits) commitBySha.set(commit.sha, commit)

  const clickCommit = (commit: CommitNode): void => {
    setCommitSha((prev) => (prev === commit.sha ? '' : commit.sha))
  }

  /* ---- layout ---- */
  const position = (): React.CSSProperties => {
    // A side panel needs room for the list + a two-column diff. Prefer using
    // most of the viewport instead of squeezing everything into 860px.
    const needsSide = compareOpen || (tab === 'graph' && commitSha !== '') || (tab === 'changes' && selected !== null)
    const preferred = needsSide ? Math.max(1080, Math.round(window.innerWidth * 0.9)) : 480
    const width = Math.min(preferred, Math.max(320, window.innerWidth - 24))
    if (anchor === null || typeof window === 'undefined') return { top: 64, right: 16, width }
    const right = Math.max(12, Math.min(window.innerWidth - width - 12, window.innerWidth - anchor.right))
    const top = Math.max(12, Math.min(anchor.bottom + 8, window.innerHeight - 320))
    return { top, right, width }
  }

  const banner =
    failure !== ''
      ? React.createElement(
          'div',
          { className: 'dshg-err' },
          failure,
          React.createElement(
            'button',
            { type: 'button', className: 'dshg-err-close', onClick: () => setFailure('') },
            '×',
          ),
        )
      : repo.error !== ''
        ? React.createElement('div', { className: 'dshg-err' }, repo.error)
        : null

  const tabButton = (id: Tab, label: string, count?: number): React.ReactElement =>
    React.createElement(
      'button',
      {
        type: 'button',
        role: 'tab',
        'aria-selected': tab === id,
        className: `dshg-tab${tab === id ? ' dshg-tab-on' : ''}`,
        onClick: () => setTab(id),
      },
      label,
      count === undefined ? null : React.createElement('span', { className: 'dshg-count' }, count),
    )

  const behind = state?.repo.behind ?? 0
  const ahead = state?.repo.ahead ?? 0
  const conflicts = state?.changes.filter((entry) => entry.kind === 'conflicted') ?? []

  const bodyForTab = (): React.ReactNode => {
    if (tab === 'terminal') return React.createElement(Terminal, { cwd, active: tab === 'terminal' })
    if (repo.loading && state === null) return React.createElement('div', { className: 'dshg-loading' }, '正在读取仓库…')

    if (tab === 'changes') {
      if (state === null) return null
      const clean = state.staged.length + state.changes.length + state.untracked.length === 0
      const list = React.createElement(
        'div',
        { className: 'dshg-list' },
        clean
          ? React.createElement(
              'div',
              { className: 'dshg-empty' },
              React.createElement(Icon, { name: 'check' }),
              React.createElement('div', { className: 'dshg-empty-title' }, '没有更改'),
              React.createElement(
                'div',
                { className: 'dshg-empty-body' },
                state.repo.empty ? '这个仓库还没有提交。' : '工作区是干净的。',
              ),
            )
          : null,
          conflicts.length > 0
            ? React.createElement(
                'div',
                { className: 'dshg-section dshg-conflict-group' },
                React.createElement(
                  'div',
                  { className: 'dshg-sechead dshg-static' },
                  React.createElement(Icon, { name: 'warning' }),
                  React.createElement('span', { className: 'dshg-sectitle' }, '合并冲突'),
                  React.createElement('span', { className: 'dshg-count' }, conflicts.length),
                ),
                ...conflicts.map(rowView),
              )
            : null,
          section(
            'staged',
            '暂存的更改',
            state.staged,
            state.staged.length > 0
              ? React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'dshg-mini',
                    title: '全部取消暂存',
                    onClick: (event: React.MouseEvent) => {
                      event.stopPropagation()
                      run('unstage', () => api.unstage(cwd, state.staged.map((entry) => entry.path)))
                    },
                  },
                  React.createElement(Icon, { name: 'minus' }),
                )
              : null,
          ),
          section(
            'changes',
            '更改',
            state.changes,
            state.changes.length > 0
              ? React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      className: 'dshg-mini',
                      title: '放弃全部更改',
                      onClick: (event: React.MouseEvent) => {
                        event.stopPropagation()
                        run('discard', () => api.discard(cwd, state.changes.map((entry) => entry.path)))
                      },
                    },
                    React.createElement(Icon, { name: 'undo' }),
                  ),
                  React.createElement(
                    'button',
                    {
                      type: 'button',
                      className: 'dshg-mini',
                      title: '全部暂存',
                      onClick: (event: React.MouseEvent) => {
                        event.stopPropagation()
                        run('stage', () => api.stage(cwd, state.changes.map((entry) => entry.path)))
                      },
                    },
                    React.createElement(Icon, { name: 'plus' }),
                  ),
                )
              : null,
          ),
          section(
            'untracked',
            '未跟踪',
            state.untracked,
            state.untracked.length > 0
              ? React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'dshg-mini',
                    title: '暂存全部未跟踪文件',
                    onClick: (event: React.MouseEvent) => {
                      event.stopPropagation()
                      run('stage', () => api.stage(cwd, state.untracked.map((entry) => entry.path)))
                    },
                  },
                  React.createElement(Icon, { name: 'plus' }),
                )
              : null,
          ),
      )

      const diffPanel =
        selected === null
          ? null
          : React.createElement(
              'div',
              { className: 'dshg-diff' },
              React.createElement(
                'div',
                { className: 'dshg-diffhead' },
                React.createElement(Icon, { name: 'file' }),
                React.createElement('span', { className: 'dshg-diffpath', title: selected.path }, selected.path),
                diffPayload !== null && !diffPayload.binary
                  ? React.createElement(
                      'span',
                      { className: 'dshg-rowstat' },
                      React.createElement('span', { className: 'dshg-add' }, `+${diffPayload.added}`),
                      React.createElement('span', { className: 'dshg-del' }, `−${diffPayload.removed}`),
                    )
                  : null,
                React.createElement('span', { className: 'dshg-spacer' }),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    className: 'dshg-mini',
                    title: diffSplit ? '切换为行内视图' : '切换为并排视图',
                    'aria-pressed': diffSplit,
                    onClick: () => setDiffSplit((prev) => !prev),
                  },
                  React.createElement('span', { className: 'dshg-viewtoggle' }, diffSplit ? '并排' : '行内'),
                ),
                React.createElement(
                  'button',
                  { type: 'button', className: 'dshg-mini', title: '关闭差异（Esc）', onClick: () => setSelected(null) },
                  React.createElement(Icon, { name: 'close' }),
                ),
              ),
              React.createElement(
                'div',
                { className: `dshg-diffbody${diffSplit ? ' dshg-diffbody-split' : ''}` },
                diffLoading ? React.createElement('div', { className: 'dshg-diffempty' }, '正在读取差异…') : null,
                !diffLoading && diffError !== '' ? React.createElement('div', { className: 'dshg-diffempty' }, diffError) : null,
                !diffLoading && diffPayload !== null && diffPayload.binary
                  ? React.createElement('div', { className: 'dshg-diffempty' }, '二进制文件，无法以文本显示差异')
                  : null,
                !diffLoading && diffPayload !== null && !diffPayload.binary
                  ? React.createElement(diffSplit ? DiffBodySplit : DiffBody, { patch: diffPayload.patch })
                  : null,
                diffPayload?.tooLarge === true
                  ? React.createElement('div', { className: 'dshg-diffempty' }, '差异过大，仅显示前 60 万字符')
                  : null,
              ),
            )

      // Side-by-side: the list keeps its height, the diff takes the other column.
      return React.createElement(
        React.Fragment,
        null,
        list,
        diffPanel,
      )
    }

    // graph
    if (state === null) return null
    return React.createElement(
      'div',
      { className: 'dshg-list dshg-list-graph' },
      React.createElement(
        'div',
        { className: 'dshg-sechead dshg-static' },
        React.createElement('span', { className: 'dshg-sectitle' }, '图表'),
        React.createElement('span', { className: 'dshg-count' }, state.commits.length),
        React.createElement('span', { className: 'dshg-secactions' },
          React.createElement('span', { className: 'dshg-gsha' }, state.repo.branch),
        ),
      ),
      ...graphRows.map((row) => {
        const commit = commitBySha.get(row.sha)
        if (commit === undefined) return null
        const head = commit.sha === state.repo.head
        return React.createElement(
          'div',
          {
            key: row.sha,
            className: `dshg-grow${head ? ' dshg-grow-head' : ''}${commitSha === commit.sha ? ' dshg-grow-on' : ''}`,
            role: 'button',
            tabIndex: 0,
            title: `${commit.sha}\n${commit.author}\n${commit.subject}`,
            onClick: () => clickCommit(commit),
            onContextMenu: (event: React.MouseEvent) => openCommitMenu(event, commit),
            onKeyDown: (event: React.KeyboardEvent) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                clickCommit(commit)
              }
            },
          },
          React.createElement(GraphLanes, { row, lanes: laneTotal }),
          React.createElement(
            'span',
            { className: 'dshg-gmeta' },
            ...commit.refs.slice(0, 3).map((ref, index) =>
              React.createElement(
                'span',
                { key: `${ref}-${index}`, className: 'dshg-gref', 'data-kind': refKind(ref) },
                refLabel(ref),
              ),
            ),
            React.createElement('span', { className: 'dshg-gsubject' }, commit.subject === '' ? '(no message)' : commit.subject),
          ),
          React.createElement(
            'span',
            { className: 'dshg-gside' },
            React.createElement('span', { className: 'dshg-gsha' }, commit.short),
            React.createElement('span', null, relativeTime(commit.time)),
          ),
        )
      }),
    )
  }

  const commitPanel =
    commitSha !== '' && tab === 'graph'
      ? detail !== null
        ? React.createElement(CommitDetailView, {
            cwd,
            sha: commitSha,
            split: diffSplit,
            onToggleSplit: () => setDiffSplit((prev) => !prev),
            onClose: () => setCommitSha(''),
          })
        : React.createElement(
            'div',
            { className: 'dshg-diff' },
            React.createElement(
              'div',
              { className: 'dshg-diffhead' },
              React.createElement(Icon, { name: 'commit' }),
              React.createElement('span', { className: 'dshg-diffpath' }, `提交 ${commitSha.slice(0, 7)}`),
              React.createElement('span', { className: 'dshg-spacer' }),
              React.createElement(
                'button',
                { type: 'button', className: 'dshg-mini', title: '关闭', onClick: () => setCommitSha('') },
                React.createElement(Icon, { name: 'close' }),
              ),
            ),
            React.createElement('div', { className: 'dshg-diffbody' }, React.createElement('div', { className: 'dshg-diffempty' }, '正在读取提交…')),
          )
      : null

  // The right-hand column: conflict > compare > commit detail, whichever is open.
  const sideOpen = conflictFile !== '' || compareOpen || (tab === 'graph' && commitSha !== '')
  const sidePanel =
    conflictFile !== ''
      ? React.createElement(ConflictPanel, {
          cwd,
          file: conflictFile,
          onClose: () => setConflictFile(''),
          onResolved: () => {
            setSelected(null)
            repo.refresh(false)
          },
        })
      : compareOpen
        ? React.createElement(CompareView, {
            cwd,
            onClose: () => setCompareOpen(false),
            onPick: (sha) => {
              setCompareOpen(false)
              setTab('graph')
              setCommitSha(sha)
            },
          })
        : commitPanel

  return React.createElement(
    React.Fragment,
    null,
    React.createElement('div', {
      style: { position: 'fixed', inset: 0, zIndex: 2147482000, background: 'transparent' },
      onClick: onClose,
    }),
    React.createElement(
      'div',
      {
        className: 'dshg-root',
        role: 'dialog',
        'aria-label': '源代码管理',
        'data-dsh-plugin': 'wagq-dsh-git',
        'data-dsh-part': 'scm-popup',
        'data-dsh-surface': 'overlay',
        // `data-side` pins the shell height once a column is split in two.
        'data-side': sideOpen || (tab === 'changes' && selected !== null),
        style: { position: 'fixed', zIndex: 2147482001, ...position() },
        onClick: (event: React.MouseEvent) => event.stopPropagation(),
      },

      /* ---- header ---- */
      React.createElement(
        'div',
        { className: 'dshg-head' },
        React.createElement('span', { className: 'dshg-title' }, React.createElement(Icon, { name: 'git' }), '源代码管理'),
        state !== null
          ? React.createElement(
              'button',
              {
                type: 'button',
                className: 'dshg-branch dshg-branch-btn',
                title: `当前分支 ${state.repo.branch}${state.repo.upstream === '' ? '' : `（跟踪 ${state.repo.upstream}）`}\n点击切换分支`,
                onClick: (event) => {
                  const rect = event.currentTarget.getBoundingClientRect()
                  showBranchPicker({ x: rect.right, y: rect.bottom })
                },
              },
              React.createElement(Icon, { name: 'branch' }),
              state.repo.branch,
              state.repo.detached ? React.createElement('span', { className: 'dshg-branch-tag' }, 'detached') : null,
            )
          : React.createElement('span', { className: 'dshg-repo' }, cwd === '' ? '未绑定工作目录' : cwd),
        state !== null && (ahead > 0 || behind > 0)
          ? React.createElement(
              'button',
              {
                type: 'button',
                className: `dshg-ahead${compareOpen ? ' dshg-ahead-on' : ''}`,
                title: `与 ${state.repo.upstream === '' ? '远程' : state.repo.upstream} 对比（领先 ${ahead} / 落后 ${behind}）\n点击查看两边的提交`,
                onClick: () => setCompareOpen((prev) => !prev),
              },
              ahead > 0 ? React.createElement('span', { className: 'dshg-ahead-up' }, `↑${ahead}`) : null,
              behind > 0 ? React.createElement('span', { className: 'dshg-ahead-down' }, `↓${behind}`) : null,
            )
          : state !== null
            ? React.createElement(
                'button',
                {
                  type: 'button',
                  className: `dshg-ahead${compareOpen ? ' dshg-ahead-on' : ''}`,
                  title: state.repo.upstream === '' ? '没有上游分支' : `与 ${state.repo.upstream} 对比：已同步`,
                  onClick: () => setCompareOpen((prev) => !prev),
                },
                React.createElement('span', { className: 'dshg-ahead-even' }, '⇅'),
              )
            : null,
        React.createElement('span', { className: 'dshg-spacer' }),
        React.createElement(
          'button',
          {
            type: 'button',
            className: `dshg-iconbtn${repo.loading ? ' dshg-spinning' : ''}`,
            title: '刷新',
            disabled: repo.loading,
            onClick: doManualRefresh,
          },
          React.createElement(Icon, { name: 'refresh' }),
        ),
        React.createElement(
          'button',
          {
            type: 'button',
            className: 'dshg-iconbtn',
            title: '更多操作',
            'aria-haspopup': 'menu',
            onClick: openMainMenu,
          },
          React.createElement(Icon, { name: 'dots' }),
        ),
        React.createElement(
          'button',
          { type: 'button', className: 'dshg-iconbtn', title: '关闭（Esc）', onClick: onClose },
          React.createElement(Icon, { name: 'close' }),
        ),
      ),

      banner,

      /* ---- tabs ---- */
      React.createElement(
        'div',
        { className: 'dshg-tabs', role: 'tablist' },
        tabButton('changes', '更改', state === null ? undefined : state.staged.length + state.changes.length + state.untracked.length),
        tabButton('graph', '图表', state === null ? undefined : state.commits.length),
        tabButton('terminal', '终端'),
      ),

      /* ---- commit box ---- */
      tab === 'changes' && cwd !== ''
        ? React.createElement(
            'div',
            { className: 'dshg-commit' },
            React.createElement('textarea', {
              ref: messageRef,
              className: 'dshg-msg',
              placeholder: `消息（Ctrl+Enter 在 ${state?.repo.branch ?? 'main'} 上提交）`,
              value: message,
              spellCheck: false,
              onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(event.target.value),
              onKeyDown: (event: React.KeyboardEvent) => {
                if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                  event.preventDefault()
                  doCommit()
                }
              },
            }),
            React.createElement(
              'div',
              { className: 'dshg-commitrow' },
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'dshg-primary',
                  disabled: busy !== '' || (stagedCount === 0 && !amend) || message.trim() === '',
                  title: stagedCount === 0 ? '先暂存要提交的文件' : '提交（Ctrl+Enter）',
                  onClick: doCommit,
                },
                React.createElement(Icon, { name: 'check' }),
                busy === 'commit' ? '提交中…' : '提交',
              ),
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'dshg-split-arrow',
                  title: amend ? '这次提交将覆盖上一次提交' : '更多提交选项',
                  disabled: busy !== '',
                  onClick: () => setAmend((prev) => !prev),
                },
                React.createElement(Icon, { name: 'chevron' }),
              ),
            ),
            React.createElement(
              'div',
              { className: 'dshg-subrow' },
              React.createElement(
                'label',
                { className: 'dshg-check' },
                React.createElement('input', {
                  type: 'checkbox',
                  checked: amend,
                  onChange: (event: React.ChangeEvent<HTMLInputElement>) => setAmend(event.target.checked),
                }),
                '修改上次提交',
              ),
              // Generated by the SAME model the conversation is running on.
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'dshg-genbtn',
                  disabled: busy !== '' || (stagedCount === 0 && (state?.changes.length ?? 0) + (state?.untracked.length ?? 0) === 0),
                  title: '用当前会话的模型，根据差异自动生成提交消息',
                  onClick: doGenerate,
                },
                React.createElement(Icon, { name: 'spark' }),
                busy === 'generate' ? '生成中…' : '生成提交消息',
              ),
              React.createElement('span', { className: 'dshg-spacer' }),
              notice !== ''
                ? React.createElement('span', { className: 'dshg-rowstat dshg-add' }, notice)
                : stagedCount > 0
                  ? React.createElement('span', { className: 'dshg-rowstat' }, `${stagedCount} 个文件已暂存`)
                  : null,
            ),
          )
        : null,

      /* ---- body ---- */
      // `dshg-pane` is the left column and `sidePanel` the right one; `bodyForTab`
      // returns only the content, never its own column wrapper.
      React.createElement('div', { className: 'dshg-body' }, bodyForTab(), sidePanel),

      /* ---- footer ---- */
      React.createElement(
        'div',
        { className: 'dshg-foot' },
        React.createElement('span', { title: state?.repo.upstream === '' ? '没有上游分支' : `跟踪 ${state?.repo.upstream}` },
          state === null || state.repo.upstream === '' ? '无上游' : state.repo.upstream),
        React.createElement('span', null, '更改 ', React.createElement('b', null, String((state?.changes.length ?? 0) + (state?.untracked.length ?? 0)))),
        React.createElement('span', null, '暂存 ', React.createElement('b', null, String(stagedCount))),
        React.createElement('span', { className: 'dshg-spacer' }),
        React.createElement('span', null, busy === '' ? '右键提交可复制/重置' : `${busy}…`),
      ),
    ),

    /* ---- floating layers ---- */
    menu !== null
      ? React.createElement(Menu, { x: menu.x, y: menu.y, items: menu.items, onClose: () => setMenu(null) })
      : null,
    branchPicker !== null
      ? React.createElement(BranchPicker, {
          cwd,
          current: state?.repo.branch ?? '',
          x: branchPicker.x,
          y: branchPicker.y,
          onClose: () => setBranchPicker(null),
          onSwitched: () => repo.refresh(false),
        })
      : null,
    confirm !== null
      ? React.createElement(ConfirmDialog, {
          confirm,
          onClose: () => setConfirm(null),
        })
      : null,
  )
}

/* ------------------------------------------------------------------ button */

export interface GitHeaderButtonProps {
  /** Injected by the slot (scope: session). */
  sessionId?: string
  /** Optional direct directory override. */
  cwd?: string
}

/**
 * The header icon plus its popup. The directory is resolved lazily on first
 * open through `/wagq-git/api/sessions`, so the button never guesses a path and
 * always follows the session's *effective* working directory.
 */
export function GitHeaderButton(props: GitHeaderButtonProps): React.ReactElement {
  ensureStyles()
  const [open, setOpen] = React.useState(false)
  const [anchor, setAnchor] = React.useState<DOMRect | null>(null)
  const [cwd, setCwd] = React.useState(props.cwd ?? '')
  const [resolving, setResolving] = React.useState(false)
  const [resolveError, setResolveError] = React.useState('')
  const buttonRef = React.useRef<HTMLButtonElement | null>(null)

  React.useEffect(() => {
    if (!open || cwd !== '' || resolving) return
    setResolving(true)
    setResolveError('')
    api
      .sessions()
      .then((result) => {
        const wanted = props.sessionId ?? ''
        const hit = result.sessions.find((row) => row.id === wanted) ?? result.sessions[0]
        if (hit === undefined) {
          setResolveError('没有可用的工作目录')
          return
        }
        setCwd(hit.cwd)
      })
      .catch((err: unknown) => setResolveError(err instanceof Error ? err.message : String(err)))
      .finally(() => setResolving(false))
  }, [open, cwd, resolving, props.sessionId])

  return React.createElement(
    React.Fragment,
    null,
    React.createElement(
      'button',
      {
        ref: buttonRef,
        type: 'button',
        className: `dshg-iconbtn dshg-trigger${open ? ' dshg-trigger-on' : ''}`,
        title: '源代码管理（Git）',
        'aria-label': '源代码管理',
        'aria-expanded': open,
        'data-dsh-plugin': 'wagq-dsh-git',
        'data-dsh-part': 'scm-button',
        onClick: () => {
          setAnchor(buttonRef.current?.getBoundingClientRect() ?? null)
          setOpen((prev) => !prev)
        },
      },
      React.createElement(Icon, { name: 'git' }),
    ),
    open
      ? resolveError !== ''
        ? React.createElement(
            'div',
            { className: 'dshg-err', style: { position: 'fixed', top: 64, right: 16, maxWidth: 360, margin: 0, zIndex: 2147482001 } },
            resolveError,
          )
        : React.createElement(Popup, { cwd, sessionId: props.sessionId ?? '', anchor, onClose: () => setOpen(false) })
      : null,
  )
}

export { laneColor }
