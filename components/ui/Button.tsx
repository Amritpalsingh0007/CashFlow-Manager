import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

const BASE: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontFamily: 'var(--font-sans)',
  fontWeight: 500,
  border: 'none',
  cursor: 'pointer',
  transition: 'background 0.15s, opacity 0.15s',
  whiteSpace: 'nowrap',
}

const VARIANTS: Record<Variant, React.CSSProperties> = {
  primary: {
    background: 'var(--color-ink)',
    color: '#ffffff',
    borderRadius: 'var(--rounded-pill)',
  },
  secondary: {
    background: 'var(--color-canvas-elevated)',
    color: 'var(--color-ink)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-pill)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--color-body)',
    border: '1px solid var(--color-hairline)',
    borderRadius: 'var(--rounded-sm)',
  },
  danger: {
    background: '#fce8e8',
    color: 'var(--color-error)',
    borderRadius: 'var(--rounded-sm)',
  },
}

const SIZES: Record<'sm' | 'md' | 'lg', React.CSSProperties> = {
  sm: { height: 28, padding: '0 8px',  fontSize: 12 },
  md: { height: 34, padding: '0 12px', fontSize: 13 },
  lg: { height: 40, padding: '0 16px', fontSize: 14 },
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      style={{
        ...BASE,
        ...VARIANTS[variant],
        ...SIZES[size],
        ...(disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
        ...style,
      }}
    >
      {children}
    </button>
  )
}
