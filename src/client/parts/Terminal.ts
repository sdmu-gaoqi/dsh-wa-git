/**
 * The embedded git terminal.
 *
 * One <pre> transcript plus one command line. Each line is a round trip to
 * `POST /wagq-git/api/terminal`, which runs it in a shell rooted at the repo and
 * reports the resulting working directory — so `cd sub` persists for the next
 * line without any PTY.
 *
 * History is ↑/↓ over what *this panel* ran (not the host's shell history), and
 * Ctrl+L clears the transcript like a real terminal.
 */
import * as React from 'react'
import { api } from '../api'
import type { TerminalResult } from '../api'
import { ICONS } from '../icons'

const h = React.createElement

interface Entry {
  id: number
  kind: 'input' | 'output' | 'error' | 'notice'
  text: string
  cwd?: string
  code?: number | null
  durationMs?: number
}

const SUGGESTIONS = [
  'git status -sb',
  'git log --oneline --graph --all -20',
  'git stash list',
  'git diff --stat',
  'git branch -vv',
]

function Icon(props: { name: keyof typeof ICONS }): React.ReactElement {
  return h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true' }, h('path', { d: ICONS[props.name], fill: 'currentColor' }))
}

export function Terminal(props: { cwd: string; active: boolean }): React.ReactElement {
  const { cwd, active } = props
  const [entries, setEntries] = React.useState<Entry[]>([])
  const [line, setLine] = React.useState('')
  const [busy, setBusy] = React.useState(false)
  const [runCwd, setRunCwd] = React.useState(cwd)
  const [history, setHistory] = React.useState<string[]>([])
  const [historyAt, setHistoryAt] = React.useState(-1)
  const seq = React.useRef(0)
  const scrollRef = React.useRef<HTMLDivElement | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    setEntries([
      { id: ++seq.current, kind: 'notice', text: '仓库根目录已就绪，输入 git 命令回车执行（↑↓ 翻历史，Ctrl+L 清屏）。' },
    ])
    setRunCwd(cwd)
    setLine('')
    setHistory([])
    setHistoryAt(-1)
  }, [cwd])

  React.useEffect(() => {
    if (!active) return
    const node = scrollRef.current
    if (node !== null) node.scrollTop = node.scrollHeight
  }, [entries, active])

  React.useEffect(() => {
    if (active) inputRef.current?.focus()
  }, [active])

  const submit = (raw?: string): void => {
    const command = (raw ?? line).trim()
    if (command === '' || busy) return
    setLine('')
    setHistory((prev) => (prev[prev.length - 1] === command ? prev : [...prev, command]))
    setHistoryAt(-1)
    setEntries((prev) => [...prev, { id: ++seq.current, kind: 'input', text: command, cwd: runCwd }])

    if (command === 'clear' || command === 'cls') {
      setEntries([])
      return
    }

    setBusy(true)
    api
      .terminal(runCwd, command)
      .then((result: TerminalResult) => {
        setRunCwd(result.cwd)
        setEntries((prev) => {
          const next = [...prev]
          if (result.output !== '') {
            next.push({ id: ++seq.current, kind: 'output', text: result.output })
          }
          next.push({
            id: ++seq.current,
            kind: result.code === 0 ? 'notice' : 'error',
            text:
              result.code === null
                ? '已中止'
                : `退出码 ${result.code} · ${result.durationMs} ms · ${result.cwd}`,
            code: result.code,
            durationMs: result.durationMs,
            cwd: result.cwd,
          })
          return next
        })
      })
      .catch((error: unknown) => {
        setEntries((prev) => [
          ...prev,
          { id: ++seq.current, kind: 'error', text: error instanceof Error ? error.message : String(error) },
        ])
      })
      .finally(() => setBusy(false))
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault()
      submit()
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (history.length === 0) return
      const next = historyAt === -1 ? history.length - 1 : Math.max(0, historyAt - 1)
      setHistoryAt(next)
      setLine(history[next] ?? '')
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (historyAt === -1) return
      const next = historyAt + 1
      if (next >= history.length) {
        setHistoryAt(-1)
        setLine('')
      } else {
        setHistoryAt(next)
        setLine(history[next] ?? '')
      }
      return
    }
    if (event.ctrlKey && (event.key === 'l' || event.key === 'L')) {
      event.preventDefault()
      setEntries([])
    }
  }

  return h(
    'div',
    { className: 'dshg-term' },
    h(
      'div',
      { className: 'dshg-term-bar' },
      h(Icon, { name: 'terminal' }),
      h('span', { className: 'dshg-term-title' }, 'Git 终端'),
      h('span', { className: 'dshg-term-cwd', title: runCwd }, runCwd),
      h('span', { className: 'dshg-spacer' }),
      h(
        'button',
        {
          type: 'button',
          className: 'dshg-mini',
          title: '清屏（Ctrl+L）',
          onClick: () => setEntries([]),
        },
        h(Icon, { name: 'close' }),
      ),
    ),
    h(
      'div',
      { className: 'dshg-term-log', ref: scrollRef, onClick: () => inputRef.current?.focus() },
      ...entries.map((entry) =>
        entry.kind === 'input'
          ? h(
              'div',
              { key: entry.id, className: 'dshg-term-line dshg-term-input' },
              h('span', { className: 'dshg-term-prompt' }, '❯'),
              h('span', { className: 'dshg-term-cmd' }, entry.text),
            )
          : h(
              'pre',
              { key: entry.id, className: `dshg-term-line dshg-term-${entry.kind}` },
              entry.text,
            ),
      ),
      busy ? h('div', { className: 'dshg-term-line dshg-term-notice' }, '执行中…') : null,
    ),
    h(
      'div',
      { className: 'dshg-term-suggest' },
      ...SUGGESTIONS.map((suggestion) =>
        h(
          'button',
          {
            key: suggestion,
            type: 'button',
            className: 'dshg-chip',
            disabled: busy,
            onClick: () => submit(suggestion),
          },
          suggestion,
        ),
      ),
    ),
    h(
      'div',
      { className: 'dshg-term-inputrow' },
      h('span', { className: 'dshg-term-prompt' }, '❯'),
      h('input', {
        ref: inputRef,
        className: 'dshg-term-field',
        value: line,
        spellCheck: false,
        autoComplete: 'off',
        placeholder: busy ? '等待上一条命令结束…' : 'git status',
        disabled: busy,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => setLine(event.target.value),
        onKeyDown,
      }),
      h(
        'button',
        {
          type: 'button',
          className: 'dshg-primary dshg-term-run',
          disabled: busy || line.trim() === '',
          onClick: () => submit(),
        },
        busy ? '执行中…' : '运行',
      ),
    ),
  )
}
