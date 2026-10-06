import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

const FIELD_STYLE: React.CSSProperties = {
  background: 'var(--color-canvas-elevated)',
  border: '1px solid var(--color-hairline)',
  borderRadius: 'var(--rounded-sm)',
  padding: '8px 12px',
  fontSize: 14,
  color: 'var(--color-ink)',
  outline: 'none',
  width: '100%',
  fontFamily: 'var(--font-sans)',
}

interface FieldProps {
  label?: string
  error?: string
  hint?: string
}

export function Input({
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & FieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label
          htmlFor={props.id}
          style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-body)' }}
        >
          {label}
        </label>
      )}
      <input
        {...props}
        style={{
          ...FIELD_STYLE,
          ...(error ? { borderColor: 'var(--color-error)' } : {}),
          ...props.style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = 'var(--color-ink)'
          props.onFocus?.(e)
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error
            ? 'var(--color-error)'
            : 'var(--color-hairline)'
          props.onBlur?.(e)
        }}
      />
      {hint && !error && (
        <span style={{ fontSize: 12, color: 'var(--color-mute)' }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: 12, color: 'var(--color-error)' }}>{error}</span>
      )}
    </div>
  )
}

export function Select({
  label,
  error,
  hint,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & FieldProps & { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label
          htmlFor={props.id}
          style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-body)' }}
        >
          {label}
        </label>
      )}
      <select
        {...props}
        style={{
          ...FIELD_STYLE,
          ...(error ? { borderColor: 'var(--color-error)' } : {}),
          ...props.style,
        }}
      >
        {children}
      </select>
      {hint && !error && (
        <span style={{ fontSize: 12, color: 'var(--color-mute)' }}>{hint}</span>
      )}
      {error && (
        <span style={{ fontSize: 12, color: 'var(--color-error)' }}>{error}</span>
      )}
    </div>
  )
}

export function Textarea({
  label,
  error,
  hint,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <label
          htmlFor={props.id}
          style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-body)' }}
        >
          {label}
        </label>
      )}
      <textarea
        {...props}
        rows={props.rows ?? 3}
        style={{
          ...FIELD_STYLE,
          resize: 'vertical',
          ...(error ? { borderColor: 'var(--color-error)' } : {}),
          ...props.style,
        }}
      />
      {error && (
        <span style={{ fontSize: 12, color: 'var(--color-error)' }}>{error}</span>
      )}
    </div>
  )
}
