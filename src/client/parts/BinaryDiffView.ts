/**
 * Fallback view for a binary diff. When the changed file is an image, show the
 * current worktree copy via the file-content route instead of the useless
 * "Binary files differ" line; other binary types still get a clear message.
 */
import * as React from 'react'
import { api } from '../api'

const IMAGE_RE = /\.(png|jpe?g|gif|webp|bmp|svg|ico)$/i

export function BinaryDiffView(props: { cwd: string; path: string }): React.ReactElement {
  const { cwd, path } = props
  const [data, setData] = React.useState<Awaited<ReturnType<typeof api.fileContent>> | null>(null)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(IMAGE_RE.test(path))

  React.useEffect(() => {
    if (!IMAGE_RE.test(path)) {
      setLoading(false)
      return undefined
    }
    let alive = true
    setLoading(true)
    setError('')
    setData(null)
    api
      .fileContent(cwd, path)
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
  }, [cwd, path])

  if (!IMAGE_RE.test(path)) {
    return React.createElement('div', { className: 'dshg-diffempty' }, '二进制文件，无法以文本显示差异')
  }
  if (loading) return React.createElement('div', { className: 'dshg-diffempty' }, '正在读取图片…')
  if (error !== '') return React.createElement('div', { className: 'dshg-diffempty' }, error)
  if (data !== null && data.mime !== null && data.base64 !== '') {
    return React.createElement(
      'div',
      { className: 'dshg-file-image' },
      React.createElement('img', { src: `data:${data.mime};base64,${data.base64}`, alt: path }),
    )
  }
  return React.createElement('div', { className: 'dshg-diffempty' }, '图片无法预览')
}
