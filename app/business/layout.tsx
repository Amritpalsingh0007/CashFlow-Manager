import type { ReactNode } from 'react'

// Fully client-side SPA — opt out of static validation
export const ensureStatic = false

export default function BusinessLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-canvas)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  )
}
