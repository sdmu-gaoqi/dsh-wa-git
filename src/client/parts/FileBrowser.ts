/**
 * Repository file browser — a simple directory navigator for the "文件浏览"
 * tab. Each row has a context menu matching VS Code's Source Control actions:
 * open in file manager, copy path, show Git history, reference in prompt.
 */
import * as React from 'react'
import { api } from '../api'
import type { FileEntry } from '../api'
import { ICONS } from '../icons'
import { Menu } from './Menu'
import type { MenuItem } from './Menu'

const h = React.createElement

function Icon(props: { name: keyof typeof ICONS }): React.ReactElement {
  return h('svg', { viewBox: '0 0 16 16', 'aria-hidden': 'true' }, h('path', { d: ICONS[props.name], fill: 'currentColor' }))
}

function fmtSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}

function fmtTime(seconds: number): string {
  if (!seconds) return ''
  const d = new Date(seconds * 1000)
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
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

export interface FilePreview {
  path: string
  name: string
  isImage: boolean
}

function FilePreviewPane(props: {
  cwd: string
  file: FilePreview
  onNotice: (message: string) => void
  onClose: () => void
}): React.ReactElement {
  const { cwd, file, onNotice, onClose } = props
  const [data, setData] = React.useState<Awaited<ReturnType<typeof api.fileContent>> | null>(null)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    let alive = true
    setLoading(true)
    setError('')
    setData(null)
    api
      .fileContent(cwd, file.path)
      .then((result) => {
        if (alive) setData(result)
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
  }, [cwd, file.path])

  const body = (): React.ReactElement => {
    if (loading) return h('div', { className: 'dshg-diffempty' }, '正在读取文件…')
    if (error !== '') return h('div', { className: 'dshg-diffempty' }, error)
    if (data === null) return h('div', { className: 'dshg-diffempty' }, '没有内容')
    if (data.tooLarge) {
      return h('div', { className: 'dshg-diffempty' }, `文件太大（${fmtSize(data.size)}），无法在插件内预览`)
    }
    if (data.binary) {
      return h('div', { className: 'dshg-diffempty' }, '二进制文件，无法预览内容')
    }
    if (data.mime !== null && data.base64 !== '') {
      return h(
        'div',
        { className: 'dshg-file-image' },
        h('img', { src: `data:${data.mime};base64,${data.base64}`, alt: file.name }),
      )
    }
    if (data.text !== null) {
      const lines = data.text.split('\n')
      return h(
        'div',
        { className: 'dshg-file-text' },
        ...lines.map((line, index) =>
          h(
            'div',
            { key: index, className: 'dshg-file-textline' },
            h('span', { className: 'dshg-snum' }, index + 1),
            h('span', { className: 'dshg-code' }, line === '' ? ' ' : line),
          ),
        ),
      )
    }
    return h('div', { className: 'dshg-diffempty' }, '没有可预览的内容')
  }

  return h(
    'div',
    { className: 'dshg-diff dshg-filepreview' },
    h(
      'div',
      { className: 'dshg-diffhead' },
      h(Icon, { name: file.isImage ? 'spark' : 'file' }),
      h('span', { className: 'dshg-diffpath', title: file.path }, file.name),
      h('span', { className: 'dshg-spacer' }),
      h(
        'button',
        { type: 'button', className: 'dshg-mini', title: '用系统默认应用打开', onClick: () => {
          void api.openPath(cwd, file.path, false).catch((err: unknown) => onNotice(err instanceof Error ? err.message : String(err)))
        } },
        h(Icon, { name: 'folder' }),
      ),
      h('button', { type: 'button', className: 'dshg-mini', title: '关闭预览', onClick: onClose }, h(Icon, { name: 'close' })),
    ),
    h('div', { className: 'dshg-diffbody' }, body()),
  )
}

export function FileBrowser(props: {
  cwd: string
  active: boolean
  onHistory: (rel: string) => void
  onNotice: (message: string) => void
}): React.ReactElement {
  const { cwd, active, onHistory, onNotice } = props
  const [dir, setDir] = React.useState('')
  const [data, setData] = React.useState<{ dir: string; entries: FileEntry[] } | null>(null)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(true)
  const [menu, setMenu] = React.useState<{ x: number; y: number; items: MenuItem[] } | null>(null)
  const [preview, setPreview] = React.useState<FilePreview | null>(null)
  const [listWidth, setListWidth] = React.useState<number | null>(null)
  const dragRef = React.useRef<{ startX: number; startW: number } | null>(null)

  const startDrag = (event: React.PointerEvent): void => {
    const wrap = (event.currentTarget as HTMLElement).parentElement
    if (wrap === null) return
    const list = wrap.querySelector('.dshg-files') as HTMLElement | null
    if (list === null) return
    dragRef.current = { startX: event.clientX, startW: list.getBoundingClientRect().width }
    ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
  }
  const onDrag = (event: React.PointerEvent): void => {
    if (dragRef.current === null) return
    setListWidth(Math.max(260, dragRef.current.startW + event.clientX - dragRef.current.startX))
  }
  const endDrag = (): void => {
    dragRef.current = null
  }

  const load = React.useCallback(
    (target: string) => {
      setLoading(true)
      setError('')
      api
        .files(cwd, target)
        .then((result) => {
          setData({ dir: result.dir, entries: result.entries })
          setDir(result.dir)
        })
        .catch((err: unknown) => setError(err instanceof Error ? err.message : String(err)))
        .finally(() => setLoading(false))
    },
    [cwd],
  )

  React.useEffect(() => {
    load('')
  }, [load])

  const up = (): void => {
    const parts = dir.split('/').filter(Boolean)
    parts.pop()
    load(parts.join('/'))
  }

  const isImageName = (name: string): boolean => /\.(png|jpe?g|gif|webp|bmp|svg|ico)$/i.test(name)

  /** Single click on a file previews its content inside the plugin. */
  const openEntry = (entry: FileEntry): void => {
    if (entry.kind === 'dir') {
      setPreview(null)
      load(entry.rel)
    } else {
      setPreview({ path: entry.rel, name: entry.name, isImage: isImageName(entry.name) })
    }
  }

  const openExternally = (entry: FileEntry): void => {
    void api
      .openPath(cwd, entry.path, false)
      .then(() => onNotice(`已用默认应用打开 ${entry.name}`))
      .catch((err: unknown) => onNotice(err instanceof Error ? err.message : String(err)))
  }

  const contextMenu = (event: React.MouseEvent, entry: FileEntry): void => {
    event.preventDefault()
    event.stopPropagation()
    setMenu({
      x: event.clientX,
      y: event.clientY,
      items: [
        { id: 'h', label: entry.name, heading: true },
        {
          id: 'open',
          label: entry.kind === 'dir' ? '进入文件夹' : '查看文件内容',
          icon: h(Icon, { name: 'file' }),
          onSelect: () => openEntry(entry),
        },
        {
          id: 'external',
          label: '用系统默认应用打开',
          separated: entry.kind === 'dir',
          onSelect: () => openExternally(entry),
        },
        {
          id: 'reveal',
          label: '在文件管理器中显示位置',
          onSelect: () => {
            void api
              .openPath(cwd, entry.path, true)
              .then(() => onNotice('已在文件管理器中定位'))
              .catch((err: unknown) => onNotice(err instanceof Error ? err.message : String(err)))
          },
        },
        {
          id: 'copy',
          label: '复制路径',
          icon: h(Icon, { name: 'branch' }),
          onSelect: () => {
            void copyText(entry.path).then((ok) => onNotice(ok ? '已复制完整路径' : '复制失败'))
          },
        },
        {
          id: 'copy-rel',
          label: '复制相对路径',
          onSelect: () => {
            void copyText(entry.rel).then((ok) => onNotice(ok ? '已复制相对路径' : '复制失败'))
          },
        },
        {
          id: 'history',
          label: '显示 Git 历史',
          separated: true,
          icon: h(Icon, { name: 'history' }),
          onSelect: () => onHistory(entry.rel),
        },
        {
          id: 'reference',
          label: '引用到输入框',
          hint: '@路径',
          onSelect: () => {
            void copyText(`@${entry.rel}`).then((ok) =>
              onNotice(ok ? '已复制 @路径，粘贴到输入框即可引用' : '复制失败'),
            )
          },
        },
      ],
    })
  }

  const crumbs = dir === '' ? [] : dir.split('/').filter(Boolean)
  const selectedRel = preview?.path ?? ''

  return h(
    'div',
    { className: 'dshg-files-wrap' },
    h(
      'div',
      { className: 'dshg-files', style: listWidth === null ? undefined : { flex: `0 0 ${listWidth}px` } },
    h(
      'div',
      { className: 'dshg-files-bar' },
      h(
        'button',
        { type: 'button', className: 'dshg-mini', title: '返回上级', disabled: dir === '', onClick: up },
        h(Icon, { name: 'chevron' }),
      ),
      h('span', { className: 'dshg-files-root', title: cwd, onClick: () => load('') }, '仓库'),
      ...crumbs.map((crumb, index) =>
        h(
          React.Fragment,
          { key: `${crumb}-${index}` },
          h('span', { className: 'dshg-files-sep' }, '/'),
          h(
            'span',
            {
              className: 'dshg-files-crumb',
              onClick: () => load(crumbs.slice(0, index + 1).join('/')),
            },
            crumb,
          ),
        ),
      ),
      h('span', { className: 'dshg-spacer' }),
      h(
        'button',
        { type: 'button', className: 'dshg-mini', title: '刷新', onClick: () => load(dir) },
        h(Icon, { name: 'refresh' }),
      ),
    ),
    error !== '' ? h('div', { className: 'dshg-err' }, error) : null,
    h(
      'div',
      { className: 'dshg-files-list' },
      loading ? h('div', { className: 'dshg-loading' }, '读取文件…') : null,
      !loading && data !== null && data.entries.length === 0
        ? h('div', { className: 'dshg-diffempty' }, '这个文件夹是空的')
        : null,
      !loading && data !== null
        ? data.entries.map((entry) =>
            h(
              'div',
              {
                key: entry.path,
                className: `dshg-filerow${selectedRel === entry.rel ? ' dshg-filerow-on' : ''}`,
                role: 'button',
                tabIndex: 0,
                title: entry.path,
                onClick: () => openEntry(entry),
                onDoubleClick: () => openExternally(entry),
                onContextMenu: (event: React.MouseEvent) => contextMenu(event, entry),
                onKeyDown: (event: React.KeyboardEvent) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    openEntry(entry)
                  }
                },
              },
              h(
                'span',
                { className: 'dshg-fileicon' },
                h(Icon, { name: entry.kind === 'dir' ? 'folder' : 'file' }),
              ),
              h('span', { className: 'dshg-filename' }, entry.name),
              h(
                'span',
                { className: 'dshg-filemeta' },
                entry.kind === 'dir' ? '文件夹' : fmtSize(entry.size),
              ),
              h('span', { className: 'dshg-filetime' }, fmtTime(entry.mtime)),
            ),
          )
        : null,
    ),
    menu !== null ? h(Menu, { x: menu.x, y: menu.y, items: menu.items, onClose: () => setMenu(null) }) : null,
    ),
    h('div', {
      className: 'dshg-files-split',
      title: '拖动调整宽度',
      onPointerDown: startDrag,
      onPointerMove: onDrag,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
    }),
    preview !== null
      ? h(FilePreviewPane, {
          cwd,
          file: preview,
          onNotice,
          onClose: () => setPreview(null),
        })
      : null,
  )
}
