/**
 * Unified-patch parsing and rendering.
 *
 * Two views come out of the same parse:
 *
 * - `DiffBody`      inline (one column, `+`/`-` line markers) — used when the
 *                   panel is narrow.
 * - `DiffBodySplit` VS Code's side-by-side: old text on the left, new text on
 *                   the right, aligned by pairing each removed run with the
 *                   added run that follows it. Both gutters keep real line
 *                   numbers, so a hunk reads exactly like the editor.
 *
 * File headers (`diff --git`, `index`, `---`/`+++`, mode lines) are dropped: they
 * carry no content and VS Code hides them too. A hunk header keeps only its
 * `@@ … @@` tail, which is the part that says *where* you are.
 */
import * as React from 'react'

export interface DiffLine {
  kind: 'add' | 'del' | 'ctx' | 'hunk'
  oldNo: number | null
  newNo: number | null
  text: string
}

const META_PREFIXES = [
  'diff --git',
  'index ',
  '--- ',
  '+++ ',
  'new file mode',
  'deleted file mode',
  'old mode',
  'new mode',
  'similarity index',
  'dissimilarity index',
  'rename from',
  'rename to',
  'copy from',
  'copy to',
  'Binary files',
  'GIT binary patch',
]

export interface PatchFile {
  path: string
  patch: string
  from?: string
}

/**
 * Split one combined `git diff` / `git show` patch into per-file sections.
 * Each section keeps its `diff --git` header (parsePatch drops it) and is
 * rendered under its own sticky file heading.
 */
export function splitPatchByFile(patch: string): PatchFile[] {
  const lines = patch.split('\n')
  const sections: { path: string; lines: string[] }[] = []
  let current: { path: string; lines: string[] } | null = null
  for (const line of lines) {
    if (line.startsWith('diff --git ')) {
      // "diff --git a/foo b/foo" — paths may contain spaces, so take the two
      // halves around the " b/" marker.
      const match = /^diff --git a\/(.*?) b\/(.*)$/.exec(line)
      const path = match !== null ? match[2] : line.slice('diff --git '.length)
      current = { path, lines: [] }
      sections.push(current)
    }
    if (current === null) continue
    current.lines.push(line)
  }
  return sections.map((section) => ({
    path: section.path,
    patch: section.lines.join('\n'),
  }))
}

export function parsePatch(patch: string): DiffLine[] {
  const out: DiffLine[] = []
  let oldNo = 0
  let newNo = 0
  const lines = patch.split('\n')
  // A patch always ends with a newline; that trailing empty element is not a
  // context line and would otherwise render as a phantom blank row.
  if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()

  for (const line of lines) {
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
    if (META_PREFIXES.some((prefix) => line.startsWith(prefix)) || line.startsWith('\\')) continue
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

/** Count `+`/`-` content lines, ignoring the `+++`/`---` headers. */
export function countPatch(patch: string): { added: number; removed: number } {
  let added = 0
  let removed = 0
  for (const line of patch.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue
    if (line.startsWith('+')) added += 1
    else if (line.startsWith('-')) removed += 1
  }
  return { added, removed }
}

/* --------------------------------------------------------------- inline view */

export function DiffBody(props: { patch: string; empty?: string }): React.ReactElement {
  const rows = parsePatch(props.patch)
  if (rows.length === 0) {
    return React.createElement('div', { className: 'dshg-diffempty' }, props.empty ?? '没有可显示的差异')
  }
  return React.createElement(
    'table',
    { className: 'dshg-difftable' },
    React.createElement(
      'colgroup',
      null,
      React.createElement('col', { style: { width: 40 } }),
      React.createElement('col', { style: { width: 40 } }),
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

/* --------------------------------------------------------------- split view */

interface SplitCell {
  kind: 'add' | 'del' | 'ctx' | 'void'
  no: number | null
  text: string
}

interface SplitRow {
  kind: 'pair' | 'hunk'
  text?: string
  left: SplitCell
  right: SplitCell
}

const EMPTY = (): SplitCell => ({ kind: 'void', no: null, text: '' })

/**
 * Pair removed lines against the added lines that follow them, index by index.
 *
 * That is how a replacement looks in a two-column diff: the 1st removed line sits
 * opposite the 1st added line, and whichever side runs out is padded with a void
 * cell. Lines that exist only on one side get a void opposite them.
 */
export function toSplitRows(rows: DiffLine[]): SplitRow[] {
  const out: SplitRow[] = []
  let dels: DiffLine[] = []
  let adds: DiffLine[] = []

  const flush = (): void => {
    const count = Math.max(dels.length, adds.length)
    for (let index = 0; index < count; index += 1) {
      const del = dels[index]
      const add = adds[index]
      out.push({
        kind: 'pair',
        left:
          del === undefined
            ? EMPTY()
            : { kind: 'del', no: del.oldNo, text: del.text },
        right:
          add === undefined
            ? EMPTY()
            : { kind: 'add', no: add.newNo, text: add.text },
      })
    }
    dels = []
    adds = []
  }

  for (const row of rows) {
    if (row.kind === 'hunk') {
      flush()
      out.push({ kind: 'hunk', text: row.text, left: EMPTY(), right: EMPTY() })
      continue
    }
    if (row.kind === 'del') {
      // A `del` after an `add` closes the previous replacement block.
      if (adds.length > 0) flush()
      dels.push(row)
      continue
    }
    if (row.kind === 'add') {
      adds.push(row)
      continue
    }
    flush()
    const cell: SplitCell = { kind: 'ctx', no: row.oldNo ?? row.newNo, text: row.text }
    out.push({
      kind: 'pair',
      left: cell,
      right: { kind: 'ctx', no: row.newNo ?? row.oldNo, text: row.text },
    })
  }
  flush()
  return out
}

function SplitSide(props: { cell: SplitCell; side: 'left' | 'right' }): React.ReactElement {
  const { cell, side } = props
  const tone =
    cell.kind === 'add' ? ' dshg-ln-add' : cell.kind === 'del' ? ' dshg-ln-del' : cell.kind === 'void' ? ' dshg-ln-void' : ''
  return React.createElement(
    'div',
    { className: `dshg-scell${tone}`, 'data-side': side },
    React.createElement('span', { className: 'dshg-snum' }, cell.no === null ? '' : String(cell.no)),
    React.createElement('span', { className: 'dshg-smark' }, cell.kind === 'add' ? '+' : cell.kind === 'del' ? '−' : ' '),
    React.createElement('span', { className: 'dshg-scode' }, cell.text === '' ? ' ' : cell.text),
  )
}

/**
 * Side-by-side diff. Rendered as a plain grid (not a table) so both columns keep
 * their own horizontal overflow while sharing the vertical scroll — a wide line
 * on one side never drags the other side's gutter out of view.
 */
export function DiffBodySplit(props: { patch: string; empty?: string }): React.ReactElement {
  const rows = toSplitRows(parsePatch(props.patch))
  if (rows.length === 0) {
    return React.createElement('div', { className: 'dshg-diffempty' }, props.empty ?? '没有可显示的差异')
  }
  return React.createElement(
    'div',
    { className: 'dshg-splitview' },
    ...rows.map((row, index) =>
      row.kind === 'hunk'
        ? React.createElement('div', { key: index, className: 'dshg-shunk' }, row.text)
        : React.createElement(
            'div',
            { key: index, className: 'dshg-srow' },
            React.createElement(SplitSide, { cell: row.left, side: 'left' }),
            React.createElement(SplitSide, { cell: row.right, side: 'right' }),
          ),
    ),
  )
}
