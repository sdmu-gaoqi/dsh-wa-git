/**
 * The SCM popup — VS Code「源代码管理 / 图表」shaped.
 *
 * Layout follows the reference screenshot: repo + branch pill in the header,
 * a commit message box with 提交 under it, the 更改 list (暂存的更改 → 更改 →
 * 未跟踪), the inline diff of the picked file, and the 图表 commit graph.
 *
 * All colours come from `--dsw-alias-*` host tokens, so the panel inherits the
 * active theme instead of pinning its own palette.
 */
import * as React from 'react'
import { ApiError, api } from './api'
import type { CommitNode, DiffPayload, RepoState, StatusEntry } from './api'
import { ICONS } from './icons'
import { CSS } from './styles'
import { layoutGraph, laneColor } from './graph'
import type { GraphRow } from './graph'

const STYLE_ID = '@wagq/dsh-git/scm.css'
const AUTO_REFRESH_MS = 15_000
const LANE_W = 14
const ROW_H = 24

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

type RefKind = 'head' | 'tag' | 'remote' | 'branch'

function refKind(ref: string): RefKind {
  if (/^tag: /i.test(ref)) return 'tag'
  if (/^[^/\s]+\/[^/\s]+$/.test(ref) && !/^(HEAD|tag:)/i.test(ref)) return 'remote'
  return 'branch'
}

function refLabel(ref: string): string {
  return ref.replace(/^tag: /i, '').replace(/^origin\//, '')
}

function refTitle(refs: string[]): string {
  if (refs.length === 0) return ''
  return refs.join('\n')
}

/* -------------------------------------------------------------------- diff */

interface DiffLine {
  kind: 'add' | 'del' | 'ctx' | 'hunk'
  oldNo: number | null
  newNo: number | null
  text: string
}

function parsePatch(patch: string): DiffLine[] {
  const out: DiffLine[] = []
  let oldNo = 0
  let newNo = 0
  for (const line of patch.split('\n')) {
    if (line.startsWith('@@')) {
      const match = /@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)/.exec(line)
      if (match !== null) {
        oldNo = Number(match[1])
        newNo = Number(match[2])
        const tail = (match[3] ?? '').trim()
        out.push({ kind: 'hunk', oldNo: null, newNo: null, text: tail === '' ? `@@ -${oldNo} +${newNo} @@` : tail })
      }
      continue
    }
    // File headers (`diff --git`, `index`, `---`, `+++`, mode lines) carry no
    // content — VS Code's diff view hides them too.
    if (
      line.startsWith('diff --git') ||
      line.startsWith('index ') ||
      line.startsWith('--- ') ||
      line.startsWith('+++ ') ||
      line.startsWith('new file mode') ||
      line.startsWith('deleted file mode') ||
      line.startsWith('similarity index') ||
      line.startsWith('rename from') ||
      line.startsWith('rename to') ||
      line.startsWith('old mode') ||
      line.startsWith('new mode') ||
      line.startsWith('\\')
    ) {
      continue
    }
    if (line.startsWith('+')) {
      out.push({ kind: 'add', oldNo: null, newNo, text: line.slice(1) })
      newNo += 1
      continue
    }
    if (line.startsWith('-')) {
      out.push({ kind: 'del', oldNo, newNo: null, text: line.slice(1) })
      oldNo += 1
      continue
    }
    out.push({ kind: 'ctx', oldNo, newNo, text: line.startsWith(' ') ? line.slice(1) : line })
    oldNo += 1
    newNo += 1
  }
  return out
}

function DiffView(props: { cwd: string; entry: StatusEntry; onClose: () => void }): React.ReactElement {
  const { cwd, entry, onClose } = props
  const [payload, setPayload] = React.useState<DiffPayload | null>(null)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setPayload(null)
    api
      .diff(cwd, entry.path, entry.kind === 'staged', entry.from)
      .then((next) => {
        if (alive) setPayload(next)
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
  }, [cwd, entry.path, entry.kind, entry.from])

  const rows = payload !== null && !payload.binary ? parsePatch(payload.patch) : []

  const body = (): React.ReactElement => {
    if (loading) return React.createElement('div', { className: 'dshg-diffempty' }, '正在读取差异…')
    if (error !== '') return React.createElement('div', { className: 'dshg-diffempty' }, error)
    if (payload === null) return React.createElement('div', { className: 'dshg-diffempty' }, '没有可显示的差异')
    if (payload.binary) return React.createElement('div', { className: 'dshg-diffempty' }, '二进制文件，无法以文本显示差异')
    if (rows.length === 0) return React.createElement('div', { className: 'dshg-diffempty' }, '没有可显示的差异')
    return React.createElement(
      'table',
      null,
      // Explicit widths: `table-layout: fixed` reads the colgroup, not the第一行
      // (a hunk row spans all three columns and would otherwise equalise them).
      React.createElement(
        'colgroup',
        null,
        React.createElement('col', { style: { width: 38 } }),
        React.createElement('col', { style: { width: 38 } }),
        React.createElement('col', null),
      ),
      React.createElement(
        'tbody',
        null,
        ...rows.map((row, index) =>
          row.kind === 'hunk'
            ? React.createElement(
                'tr',
                { key: index, className: 'dshg-hunk' },
                React.createElement('td', { className: 'dshg-code', colSpan: 3 }, row.text),
              )
            : React.createElement(
                'tr',
                {
                  key: index,
                  className: row.kind === 'add' ? 'dshg-ln-add' : row.kind === 'del' ? 'dshg-ln-del' : undefined,
                },
                React.createElement('td', { className: 'dshg-num' }, row.oldNo === null ? '' : String(row.oldNo)),
                React.createElement('td', { className: 'dshg-num' }, row.newNo === null ? '' : String(row.newNo)),
                React.createElement('td', { className: 'dshg-code' }, row.text === '' ? ' ' : row.text),
              ),
        ),
      ),
    )
  }

  return React.createElement(
    'div',
    { className: 'dshg-diff' },
    React.createElement(
      'div',
      { className: 'dshg-diffhead' },
      React.createElement(Icon, { name: 'file' }),
      React.createElement('span', { className: 'dshg-diffpath', title: entry.path }, entry.path),
      payload !== null && !payload.binary
        ? React.createElement(
            'span',
            { className: 'dshg-rowstat' },
            React.createElement('span', { className: 'dshg-add' }, `+${payload.added}`),
            React.createElement('span', { className: 'dshg-del' }, `-${payload.removed}`),
          )
        : null,
      React.createElement('span', { className: 'dshg-spacer' }),
      React.createElement(
        'button',
        { type: 'button', className: 'dshg-mini', title: '关闭差异', onClick: onClose },
        React.createElement(Icon, { name: 'close' }),
      ),
    ),
    React.createElement('div', { className: 'dshg-diffbody' }, body()),
    payload?.tooLarge === true
      ? React.createElement('div', { className: 'dshg-diffempty' }, '差异过大，仅显示前 60 万字符')
      : null,
  )
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

  // Above the node: only when a parent line actually arrives from a previous row.
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

  // Below the node: straight down to the first parent.
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
    {
      className: 'dshg-gsvg',
      width,
      height: ROW_H,
      viewBox: `0 0 ${width} ${ROW_H}`,
      'aria-hidden': 'true',
    },
    ...children,
  )
}

function GraphRowView(props: { commit: CommitNode; row: GraphRow; lanes: number }): React.ReactElement {
  const { commit, row, lanes } = props
  const head = commit.refs.some((ref) => refKind(ref) === 'branch')
  return React.createElement(
    'div',
    {
      className: 'dshg-grow',
      'data-head': head,
      title: `${commit.short}\n${commit.author}\n${commit.subject}${commit.refs.length > 0 ? `\n${refTitle(commit.refs)}` : ''}`,
    },
    React.createElement(GraphLanes, { row, lanes }),
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
        .state(cwd, 80)
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

/* ------------------------------------------------------------------- popup */

interface PopupProps {
  cwd: string
  anchor: DOMRect | null
  onClose: () => void
}

function Popup(props: PopupProps): React.ReactElement {
  const { cwd, anchor, onClose } = props
  const repo = useRepoState(cwd, true)
  const state = repo.state

  const [message, setMessage] = React.useState('')
  const [amend, setAmend] = React.useState(false)
  const [busy, setBusy] = React.useState('')
  const [notice, setNotice] = React.useState('')
  const [failure, setFailure] = React.useState('')
  const [selected, setSelected] = React.useState<StatusEntry | null>(null)
  const [open, setOpen] = React.useState({ staged: true, changes: true, untracked: true, graph: true })
  const messageRef = React.useRef<HTMLTextAreaElement | null>(null)

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  React.useEffect(() => {
    setSelected(null)
    setMessage('')
    setAmend(false)
    setNotice('')
    setFailure('')
  }, [cwd])

  const run = (label: string, task: () => Promise<unknown>): void => {
    setBusy(label)
    setFailure('')
    setNotice('')
    task()
      .then(() => repo.refresh(true))
      .catch((err: unknown) => {
        const detail = err instanceof ApiError ? err.detail : ''
        setFailure(detail !== '' ? detail : err instanceof Error ? err.message : String(err))
      })
      .finally(() => setBusy(''))
  }

  const stagedCount = state?.staged.length ?? 0
  const canCommit = busy === '' && (stagedCount > 0 || amend) && message.trim() !== ''

  const doCommit = (): void => {
    if (message.trim() === '') {
      messageRef.current?.focus()
      return
    }
    run('commit', async () => {
      const result = await api.commit(cwd, message.trim(), amend)
      setMessage('')
      setAmend(false)
      setNotice(`已提交 ${result.short}`)
    })
  }

  const position = (): React.CSSProperties => {
    const width = 440
    if (anchor === null || typeof window === 'undefined') return { top: 72, right: 16, width }
    const right = Math.max(12, Math.min(window.innerWidth - width - 12, window.innerWidth - anchor.right))
    const top = Math.max(12, Math.min(anchor.bottom + 8, window.innerHeight - 300))
    return { top, right, width }
  }

  const rowView = (entry: StatusEntry): React.ReactElement => {
    const { dir, base } = splitPath(entry.path)
    const isStaged = entry.kind === 'staged'
    const active = selected !== null && selected.path === entry.path && selected.kind === entry.kind
    const stat = state?.stats?.[entry.path]
    const changed = stat === undefined ? 0 : stat.added + stat.removed
    return React.createElement(
      'div',
      {
        key: `${entry.kind}:${entry.path}:${entry.from}`,
        className: 'dshg-row',
        role: 'button',
        tabIndex: 0,
        'data-active': active,
        title: entry.from === '' ? entry.path : `${entry.from} → ${entry.path}`,
        onClick: () => setSelected(entry),
        onKeyDown: (event: React.KeyboardEvent) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            setSelected(entry)
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
              { className: 'dshg-rowstat', title: `+${stat.added} −${stat.removed}` },
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

  const graphRows = state === null ? [] : layoutGraph(state.commits)
  const lanes = graphRows.reduce((max, row) => Math.max(max, row.laneCount), 1)
  const commitBySha = new Map<string, CommitNode>()
  if (state !== null) for (const commit of state.commits) commitBySha.set(commit.sha, commit)

  const graphSection =
    state !== null && graphRows.length > 0
      ? React.createElement(
          'div',
          { className: 'dshg-section dshg-graph', key: 'graph' },
          React.createElement(
            'div',
            {
              className: 'dshg-sechead',
              role: 'button',
              tabIndex: 0,
              onClick: () => setOpen((prev) => ({ ...prev, graph: !prev.graph })),
              onKeyDown: (event: React.KeyboardEvent) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setOpen((prev) => ({ ...prev, graph: !prev.graph }))
                }
              },
            },
            React.createElement(
              'span',
              { className: 'dshg-caret', 'data-open': open.graph },
              React.createElement(Icon, { name: 'chevron' }),
            ),
            React.createElement('span', { className: 'dshg-sectitle' }, '图表'),
            React.createElement('span', { className: 'dshg-count' }, state.commits.length),
            React.createElement(
              'span',
              { className: 'dshg-secactions' },
              React.createElement('span', { className: 'dshg-gsha', title: '当前分支' }, state.repo.branch),
            ),
          ),
          open.graph
            ? React.createElement(
                'div',
                null,
                ...graphRows.map((row) => {
                  const commit = commitBySha.get(row.sha)
                  return commit === undefined
                    ? null
                    : React.createElement(GraphRowView, { key: row.sha, commit, row, lanes })
                }),
              )
            : null,
        )
      : null

  const banner = failure !== ''
    ? React.createElement('div', { className: 'dshg-err' }, failure)
    : repo.error !== ''
      ? React.createElement('div', { className: 'dshg-err' }, repo.error)
      : null

  const cleanMessage = (): React.ReactElement =>
    React.createElement(
      'div',
      { className: 'dshg-empty' },
      React.createElement(Icon, { name: 'check' }),
      React.createElement('div', { className: 'dshg-empty-title' }, '没有更改'),
      React.createElement(
        'div',
        { className: 'dshg-empty-body' },
        state?.repo.empty === true ? '这个仓库还没有提交。' : '工作区是干净的。',
      ),
    )

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
        style: { position: 'fixed', zIndex: 2147482001, ...position() },
        onClick: (event: React.MouseEvent) => event.stopPropagation(),
      },
      React.createElement(
        'div',
        { className: 'dshg-head' },
        React.createElement('span', { className: 'dshg-title' }, React.createElement(Icon, { name: 'git' }), '源代码管理'),
        state !== null
          ? React.createElement(
              'span',
              { className: 'dshg-repo', title: state.repo.root },
              React.createElement('span', null, state.repo.name),
              React.createElement(
                'span',
                {
                  className: 'dshg-branch',
                  title: state.repo.upstream === '' ? state.repo.branch : `跟踪 ${state.repo.upstream}`,
                },
                React.createElement(Icon, { name: 'branch' }),
                state.repo.branch,
              ),
              state.repo.ahead > 0 || state.repo.behind > 0
                ? React.createElement('span', { className: 'dshg-ahead' }, `↑${state.repo.ahead} ↓${state.repo.behind}`)
                : null,
            )
          : React.createElement('span', { className: 'dshg-repo' }, cwd === '' ? '未绑定工作目录' : cwd),
        React.createElement('span', { className: 'dshg-spacer' }),
        React.createElement(
          'button',
          {
            type: 'button',
            className: `dshg-iconbtn${repo.loading ? ' dshg-spinning' : ''}`,
            title: '刷新',
            disabled: repo.loading,
            onClick: () => repo.refresh(false),
          },
          React.createElement(Icon, { name: 'refresh' }),
        ),
        React.createElement(
          'button',
          { type: 'button', className: 'dshg-iconbtn', title: '关闭（Esc）', onClick: onClose },
          React.createElement(Icon, { name: 'close' }),
        ),
      ),
      banner,
      cwd !== ''
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
            // 和 VS Code 一样：提交按钮铺满一行，右侧带一个「更多提交选项」的箭头。
            React.createElement(
              'div',
              { className: 'dshg-commitrow' },
              React.createElement(
                'button',
                {
                  type: 'button',
                  className: 'dshg-primary',
                  disabled: !canCommit,
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
                  className: 'dshg-split',
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
              React.createElement('span', { className: 'dshg-spacer' }),
              notice !== ''
                ? React.createElement('span', { className: 'dshg-rowstat dshg-add' }, notice)
                : stagedCount > 0
                  ? React.createElement('span', { className: 'dshg-rowstat' }, `${stagedCount} 个文件已暂存`)
                  : null,
            ),
          )
        : null,
      React.createElement(
        'div',
        { className: 'dshg-body' },
        repo.loading && state === null ? React.createElement('div', { className: 'dshg-loading' }, '正在读取仓库…') : null,
        state !== null &&
        state.staged.length + state.changes.length + state.untracked.length === 0
          ? cleanMessage()
          : null,
        state !== null
          ? React.createElement(
              React.Fragment,
              null,
              // 列表自己滚（和 VS Code 一样），diff 固定在下方，打开文件不会把上面的列表顶走。
              React.createElement(
                'div',
                { className: 'dshg-list' },
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
                graphSection,
              ),
              selected !== null
                ? React.createElement(DiffView, { cwd, entry: selected, onClose: () => setSelected(null) })
                : null,
            )
          : null,
      ),
      React.createElement(
        'div',
        { className: 'dshg-foot' },
        React.createElement('span', null, '更改 ', React.createElement('b', null, String((state?.changes.length ?? 0) + (state?.untracked.length ?? 0)))),
        React.createElement('span', null, '暂存 ', React.createElement('b', null, String(stagedCount))),
        React.createElement('span', null, 'HEAD ', React.createElement('b', null, state === null || state.repo.head === '' ? '—' : state.repo.head)),
        React.createElement('span', { className: 'dshg-spacer' }),
        React.createElement('span', null, busy === '' ? 'Ctrl+Enter 提交' : `${busy}…`),
      ),
    ),
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
        : React.createElement(Popup, { cwd, anchor, onClose: () => setOpen(false) })
      : null,
  )
}

/** Kept for the theme contract: every exported surface declares its lane. */
export const SURFACE = 'scm'
export { laneColor }
