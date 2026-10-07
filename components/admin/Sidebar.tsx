'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

const NAV = [
  { href: '/admin/dashboard', label: 'Dashboard',   icon: '⊞' },
  { href: '/admin/trips',     label: 'Trips',        icon: '🚛' },
  { href: '/admin/expenses',  label: 'Expenses',     icon: '₹'  },
  { href: '/admin/payments',  label: 'Payments',     icon: '💰' },
  { href: '/admin/reports',   label: 'Reports',      icon: '📊' },
  { href: '/admin/truck',     label: 'Truck',        icon: '🚚' },
  { href: '/admin/users',     label: 'Users',        icon: '👤' },
  { href: '/admin/docs',      label: 'API Docs',     icon: '📚' },
]

function NavLinks() {
  const pathname = usePathname()
  return (
    <nav style={{ flex: 1, padding: '12px 8px' }}>
      {NAV.map(({ href, label, icon }) => {
        const active = pathname.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 12px',
              borderRadius: 'var(--rounded-sm)',
              fontSize: 14,
              fontWeight: active ? 500 : 400,
              color: active ? 'var(--color-ink)' : 'var(--color-body)',
              background: active ? 'var(--color-hairline-soft)' : 'transparent',
              textDecoration: 'none',
              transition: 'background 0.1s',
              marginBottom: 2,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1 }}>{icon}</span>
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside
      style={{
        width: 220,
        minHeight: '100vh',
        background: 'var(--color-canvas-elevated)',
        borderRight: '1px solid var(--color-hairline)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        flexShrink: 0,
      }}
    >
      {/* Wordmark */}
      <div
        style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid var(--color-hairline)',
        }}
      >
        <span
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: '-0.6px',
            color: 'var(--color-ink)',
          }}
        >
          brook
        </span>
        <span
          style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-mute)',
            marginTop: 2,
          }}
        >
          Admin
        </span>
      </div>

      {/* Nav links */}
      <Suspense
        fallback={
          <nav style={{ flex: 1, padding: '12px 8px' }}>
            {NAV.map(({ href, label, icon }) => (
              <div
                key={href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 'var(--rounded-sm)',
                  fontSize: 14, color: 'var(--color-body)', marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 16 }}>{icon}</span>
                {label}
              </div>
            ))}
          </nav>
        }
      >
        <NavLinks />
      </Suspense>

      {/* User + logout */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--color-hairline)',
        }}
      >
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>
          {user?.name ?? 'Admin'}
        </p>
        <button
          onClick={logout}
          style={{
            marginTop: 6,
            fontSize: 12,
            color: 'var(--color-mute)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Sign out →
        </button>
      </div>
    </aside>
  )
}
