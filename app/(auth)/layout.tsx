import type { ReactNode } from 'react'

export const ensureStatic = false

// Auth routes (login) need no chrome — just a plain canvas
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
