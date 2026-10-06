'use client'

import { useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function RootPage() {
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (isLoading) return
    if (!user) {
      window.location.replace('/login')
      return
    }
    if (user.role === 'ADMIN')         window.location.replace('/admin/dashboard')
    else if (user.role === 'BUSINESS') window.location.replace('/business')
    else                               window.location.replace('/personal')
  }, [user, isLoading])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-canvas)',
      }}
    >
      <p style={{ color: 'var(--color-mute)', fontSize: 14 }}>Loading…</p>
    </div>
  )
}
