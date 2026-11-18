/**
 * Unified-patch parsing and rendering, shared by the working-tree file diff and
 * the commit detail view.
 *
 * File headers (`diff --git`, `index`, `---`/`+++`, mode lines) are dropped: they
 * carry no content and VS Code's diff view hides them too. A hunk header is kept
 * but only its `@@ … @@` tail, which is the part that says *where* you are.
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

export function DiffBody(props: { patch: string; empty?: string }): React.ReactElement {
  const rows = parsePatch(props.patch)
  if (rows.length === 0) {
    return React.createElement('div', { className: 'dshg-diffempty' }, props.empty ?? '没有可显示的差异')
  }
  return React.createElement(
    'table',
    null,
    // Explicit widths: `table-layout: fixed` reads the colgroup, not the first
    // row (a hunk row spans all three columns and would equalise them).
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
