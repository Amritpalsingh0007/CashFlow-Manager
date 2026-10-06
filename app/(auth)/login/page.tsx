'use client'

import { useState, type FormEvent } from 'react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--color-canvas)' }}
    >
      {/* Subtle hero gradient blob */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(0,124,240,0.08) 0%, rgba(121,40,202,0.06) 50%, transparent 100%)',
          pointerEvents: 'none',
        }}
      />

      <div
        className="relative w-full max-w-sm"
        style={{ zIndex: 1 }}
      >
        {/* Wordmark */}
        <div className="mb-8 text-center">
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: '-0.8px',
              color: 'var(--color-ink)',
            }}
          >
            brook
          </span>
          <p
            className="mt-1"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--color-mute)',
            }}
          >
            Cashflow Manager
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'var(--color-canvas-elevated)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 'var(--rounded-lg)',
            padding: '32px',
          }}
        >
          <h1
            className="mb-6"
            style={{
              fontSize: 20,
              fontWeight: 600,
              letterSpacing: '-0.4px',
              color: 'var(--color-ink)',
            }}
          >
            Sign in
          </h1>

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="email"
                style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-body)' }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="raj@brook.app"
                style={{
                  background: 'var(--color-canvas-elevated)',
                  border: '1px solid var(--color-hairline)',
                  borderRadius: 'var(--rounded-sm)',
                  padding: '8px 12px',
                  fontSize: 14,
                  color: 'var(--color-ink)',
                  outline: 'none',
                  width: '100%',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-ink)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-hairline)')}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="password"
                style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-body)' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  background: 'var(--color-canvas-elevated)',
                  border: '1px solid var(--color-hairline)',
                  borderRadius: 'var(--rounded-sm)',
                  padding: '8px 12px',
                  fontSize: 14,
                  color: 'var(--color-ink)',
                  outline: 'none',
                  width: '100%',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--color-ink)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--color-hairline)')}
              />
            </div>

            {error && (
              <p
                role="alert"
                style={{
                  fontSize: 13,
                  color: 'var(--color-error)',
                  background: '#fff0f0',
                  border: '1px solid #fdd',
                  borderRadius: 'var(--rounded-sm)',
                  padding: '8px 12px',
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                background: loading ? 'var(--color-faint)' : 'var(--color-ink)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--rounded-pill)',
                padding: '0 14px',
                height: 36,
                fontSize: 14,
                fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer',
                width: '100%',
                transition: 'background 0.15s',
              }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p
          className="mt-4 text-center"
          style={{ fontSize: 12, color: 'var(--color-mute)' }}
        >
          Access is invite-only. Contact Raj to get an account.
        </p>
      </div>
    </div>
  )
}
