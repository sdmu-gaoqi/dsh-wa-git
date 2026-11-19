/**
 * The popup's own dialog — DSH's WebView disables native `window.prompt`, so
 * "add remote" / "edit URL" need an in-app form instead.
 *
 * Used both as a plain confirmation (reset / rebase / delete) and as a small
 * text form (remote name + URL). Esc closes, Enter submits from a field.
 */
import * as React from 'react'

export interface ConfirmField {
  name: string
  label: string
  value: string
  placeholder?: string
}

export interface ConfirmData {
  title: string
  body: string
  fields?: ConfirmField[]
  okLabel?: string
  danger?: boolean
  run: (values: Record<string, string>) => void
}

export function ConfirmDialog(props: {
  confirm: ConfirmData
  onClose: () => void
}): React.ReactElement {
  const { confirm, onClose } = props
  const fields = confirm.fields ?? []
  const [values, setValues] = React.useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const field of fields) initial[field.name] = field.value
    return initial
  })
  const firstRef = React.useRef<HTMLInputElement | null>(null)

  React.useEffect(() => {
    firstRef.current?.focus()
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const submit = (): void => {
    const task = confirm.run
    onClose()
    task(values)
  }

  return React.createElement(
    'div',
    { className: 'dshg-confirm-mask', onClick: onClose },
    React.createElement(
      'div',
      { className: 'dshg-confirm', onClick: (event: React.MouseEvent) => event.stopPropagation() },
      React.createElement('div', { className: 'dshg-confirm-title' }, confirm.title),
      React.createElement('div', { className: 'dshg-confirm-body' }, confirm.body),
      fields.length > 0
        ? React.createElement(
            'div',
            { className: 'dshg-confirm-fields' },
            ...fields.map((field, index) =>
              React.createElement(
                'label',
                { key: field.name, className: 'dshg-confirm-field' },
                React.createElement('span', null, field.label),
                React.createElement('input', {
                  ref: index === 0 ? firstRef : undefined,
                  className: 'dshg-input',
                  value: values[field.name] ?? '',
                  placeholder: field.placeholder,
                  spellCheck: false,
                  autoComplete: 'off',
                  onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
                    setValues((prev) => ({ ...prev, [field.name]: event.target.value })),
                  onKeyDown: (event: React.KeyboardEvent) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      submit()
                    }
                  },
                }),
              ),
            ),
          )
        : null,
      React.createElement(
        'div',
        { className: 'dshg-confirm-actions' },
        React.createElement('button', { type: 'button', className: 'dshg-ghost', onClick: onClose }, '取消'),
        React.createElement(
          'button',
          {
            type: 'button',
            className: confirm.danger === true ? 'dshg-danger-btn' : 'dshg-primary dshg-confirm-ok',
            onClick: submit,
          },
          confirm.okLabel ?? '确认执行',
        ),
      ),
    ),
  )
}
