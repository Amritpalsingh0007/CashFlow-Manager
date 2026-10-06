import type { ReactNode } from 'react'
import { Sidebar } from '@/components/admin/Sidebar'

// This layout renders a fully client-side admin SPA — opt out of static validation
export const ensureStatic = false

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--color-canvas)' }}>
      <Sidebar />
      <main style={{ flex: 1, minWidth: 0, padding: '32px 40px', overflowY: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
