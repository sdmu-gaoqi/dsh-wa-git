/**
 * GitLab-style commit detail.
 *
 * Layout:
 *   header  — commit subject + sha + author + totals
 *   file list — one row per changed file, collapsible to reveal its diff,
 *               with a "查看文件" action showing the file AS OF this commit.
 *
 * The old meta blob (subject/author/body + a wall of file chips at the top of
 * the diff) is deliberately gone — that was the "乱七八糟" region. All file
 * information now lives in the structured list below the header.
 */
import * as React from 'react'
import { api } from '../api'
import type { CommitDetail, CommitFile } from '../api'
import { ICONS } from '../icons'
import { DiffBody, DiffBodySplit, splitPatchByFile } from './DiffBody'
import type { PatchFile } from './DiffBody'
import { highlight, languageOf } from './highlight'

const h = React.createElement

function Icon(props: { name: keyof typeof ICONS }): React.ReactElement {
  return h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true' }, h('path', { d: ICONS[props.name], fill: 'currentColor' }))
}

function CodeView(props: { text: string; name: string }): React.ReactElement {
  const lines = props.text.split('\n')
  const lang = languageOf(props.name)
  return h(
    'div',
    { className: `dshg-file-text dshg-lang-${lang}` },
    ...lines.map((line, index) =>
      h(
        'div',
        { key: index, className: 'dshg-file-textline' },
        h('span', { className: 'dshg-snum' }, index + 1),
        h(
          'span',
          { className: 'dshg-code' },
          ...(line === ''
            ? [' ']
            : highlight(line).map((token, i) =>
                h('span', { key: i, className: token.kind === 'plain' ? undefined : `dshg-tok-${token.kind}` }, token.text),
              )),
        ),
      ),
    ),
  )
}

/** Modal showing the file's content AT this commit (git show <sha>:<path>). */
function FileAtCommitModal(props: {
  cwd: string
  sha: string
  path: string
  onClose: () => void
}): React.ReactElement {
  const { cwd, sha, path, onClose } = props
  const [text, setText] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setText('')
    api
      .commitFile(cwd, sha, path)
      .then((result) => {
        if (alive) setText(result.text)
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
  }, [cwd, sha, path])

  return h(
    'div',
    { className: 'dshg-fullmask', onClick: onClose },
    h(
      'div',
      { className: 'dshg-fullscreen', onClick: (event: React.MouseEvent) => event.stopPropagation() },
      h(
        'div',
        { className: 'dshg-diffhead' },
        h(Icon, { name: 'file' }),
        h('span', { className: 'dshg-diffpath', title: path }, path),
        h('span', { className: 'dshg-cmeta-row-inline' }, `${sha.slice(0, 7)} 时的内容`),
        h('span', { className: 'dshg-spacer' }),
        h('button', { type: 'button', className: 'dshg-mini', title: '关闭', onClick: onClose }, h(Icon, { name: 'close' })),
      ),
      h(
        'div',
        { className: 'dshg-diffbody' },
        loading ? h('div', { className: 'dshg-diffempty' }, '正在读取文件…') : null,
        !loading && error !== '' ? h('div', { className: 'dshg-diffempty' }, error) : null,
        !loading && error === '' ? h(CodeView, { text, name: path }) : null,
      ),
    ),
  )
}

export function CommitDetailView(props: {
  cwd: string
  sha: string
  split: boolean
  onToggleSplit: () => void
  onClose: () => void
}): React.ReactElement {
  const { cwd, sha, split, onToggleSplit, onClose } = props
  const [detail, setDetail] = React.useState<CommitDetail | null>(null)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  /** Paths whose diff section is expanded. */
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set())
  const [viewFile, setViewFile] = React.useState('')

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setDetail(null)
    setExpanded(new Set())
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

  const toggle = (path: string): void =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })

  const parts: PatchFile[] = detail === null ? [] : splitPatchByFile(detail.patch)
  const partByPath = new Map(parts.map((part) => [part.path, part]))
  const statOf = (path: string): CommitFile | undefined => detail?.files.find((file) => file.path === path)

  // Keep the list order from detail.files (git --numstat), falling back to
  // patch order for any file absent from numstat.
  const rows: string[] = []
  if (detail !== null) {
    for (const file of detail.files) rows.push(file.path)
    for (const part of parts) if (!rows.includes(part.path)) rows.push(part.path)
  }

  return h(
    React.Fragment,
    null,
    h(
      'div',
      { className: 'dshg-diff dshg-cdetail' },
      h(
        'div',
        { className: 'dshg-diffhead' },
        h(Icon, { name: 'commit' }),
        h('span', { className: 'dshg-diffpath' }, `提交 ${sha.slice(0, 7)}`),
        detail !== null
          ? h(
              'span',
              { className: 'dshg-rowstat' },
              h('span', { className: 'dshg-add' }, `+${detail.added}`),
              h('span', { className: 'dshg-del' }, `−${detail.removed}`),
            )
          : null,
        h('span', { className: 'dshg-spacer' }),
        h(
          'button',
          {
            type: 'button',
            className: 'dshg-mini',
            title: split ? '切换为行内视图' : '切换为并排视图',
            'aria-pressed': split,
            onClick: onToggleSplit,
          },
          h('span', { className: 'dshg-viewtoggle' }, split ? '并排' : '行内'),
        ),
        h('button', { type: 'button', className: 'dshg-mini', title: '关闭（Esc）', onClick: onClose }, h(Icon, { name: 'close' })),
      ),
      h(
        'div',
        { className: 'dshg-diffbody dshg-cdetail-body' },
        loading ? h('div', { className: 'dshg-diffempty' }, '正在读取提交…') : null,
        !loading && error !== '' ? h('div', { className: 'dshg-diffempty' }, error) : null,
        !loading && detail !== null && rows.length === 0
          ? h('div', { className: 'dshg-diffempty' }, '这个提交没有文件变更')
          : null,
        !loading && detail !== null
          ? h(
              React.Fragment,
              null,
              // concise commit header (no wall of chips)
              h(
                'div',
                { className: 'dshg-gitlab-head' },
                h('div', { className: 'dshg-gitlab-title' }, detail.subject === '' ? '(no message)' : detail.subject),
                h(
                  'div',
                  { className: 'dshg-gitlab-meta' },
                  h('span', { className: 'dshg-gsha' }, detail.short),
                  h('span', null, detail.author),
                  h('span', { title: new Date(detail.time * 1000).toLocaleString() }, new Date(detail.time * 1000).toLocaleString()),
                  h('span', { className: 'dshg-gitlab-count' }, `${rows.length} 个文件`),
                  h('span', { className: 'dshg-add' }, `+${detail.added}`),
                  h('span', { className: 'dshg-del' }, `−${detail.removed}`),
                ),
                detail.body.trim() === '' ? null : h('pre', { className: 'dshg-gitlab-body' }, detail.body.trim()),
              ),
              // file list
              h(
                'div',
                { className: 'dshg-gitlab-files' },
                ...rows.map((path) => {
                  const stat = statOf(path)
                  const part = partByPath.get(path)
                  const isOpen = expanded.has(path)
                  return h(
                    'div',
                    { key: path, className: `dshg-gitlab-file${isOpen ? ' dshg-gitlab-file-open' : ''}` },
                    h(
                      'div',
                      { className: 'dshg-gitlab-row' },
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dshg-gitlab-toggle',
                          title: isOpen ? '收起差异' : '展开差异',
                          onClick: () => toggle(path),
                        },
                        h(Icon, { name: 'chevron' }),
                      ),
                      h(Icon, { name: 'file' }),
                      h('span', { className: 'dshg-gitlab-path', title: path }, path),
                      stat !== undefined && !stat.binary
                        ? h(
                            'span',
                            { className: 'dshg-rowstat' },
                            h('span', { className: 'dshg-add' }, `+${stat.added}`),
                            h('span', { className: 'dshg-del' }, `−${stat.removed}`),
                          )
                        : stat?.binary
                          ? h('span', { className: 'dshg-rowstat' }, '二进制')
                          : null,
                      h(
                        'button',
                        {
                          type: 'button',
                          className: 'dshg-mini dshg-textbtn',
                          title: '查看这个提交下的完整文件内容',
                          onClick: () => setViewFile(path),
                        },
                        '查看文件',
                      ),
                    ),
                    isOpen
                      ? h(
                          'div',
                          { className: 'dshg-gitlab-diff' },
                          part !== undefined
                            ? h(split ? DiffBodySplit : DiffBody, { patch: part.patch })
                            : h('div', { className: 'dshg-diffempty' }, '二进制文件，没有文本差异'),
                        )
                      : null,
                  )
                }),
              ),
              detail.tooLarge ? h('div', { className: 'dshg-diffempty' }, '差异过大，仅显示前 60 万字符') : null,
            )
          : null,
      ),
    ),
    viewFile !== ''
      ? h(FileAtCommitModal, { cwd, sha, path: viewFile, onClose: () => setViewFile('') })
      : null,
  )
}
