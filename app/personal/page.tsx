'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { createExpense, getExpenses, type Expense } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'

type PersonalCategory = 'HOUSEHOLD' | 'GROCERY' | 'MEDICAL' | 'OTHER_PERSONAL'

const CATEGORIES: { value: PersonalCategory; label: string; icon: string; color: string }[] = [
  { value: 'HOUSEHOLD',     label: 'Household', icon: '🏠', color: '#d8ccf1' },
  { value: 'GROCERY',       label: 'Grocery',   icon: '🛒', color: '#d4f7e8' },
  { value: 'MEDICAL',       label: 'Medical',   icon: '💊', color: '#fce8e8' },
  { value: 'OTHER_PERSONAL',label: 'Other',     icon: '📋', color: '#f2f2f2' },
]

type Step = 'category' | 'amount' | 'done'

export default function PersonalPage() {
  const { user, logout } = useAuth()
  const [recentExpenses, setRecent]   = useState<Expense[]>([])
  const [loading, setLoading]         = useState(true)

  const [step, setStep]         = useState<Step>('category')
  const [category, setCategory] = useState<PersonalCategory>('HOUSEHOLD')
  const [amount, setAmount]     = useState('')
  const [notes, setNotes]       = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState('')

  async function loadData() {
    setLoading(true)
    try {
      const exp = await getExpenses({ size: 10 })
      setRecent(exp.content)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadData() }, [])

  async function submit() {
    setError('')
    setSaving(true)
    try {
      await createExpense({
        amount: Number(amount),
        category,
        tripId: undefined,
        expenseDate: new Date().toISOString().slice(0, 10),
        notes,
        createdBy: user?.name ?? 'Mom',
      })
      setAmount('')
      setNotes('')
      setStep('done')
      loadData()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function reset() {
    setStep('category')
    setAmount('')
    setNotes('')
    setError('')
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--color-mute)' }}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '24px 16px' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
        }}
      >
        <div>
          <p
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 10, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--color-mute)',
            }}
          >
            brook
          </p>
          <p style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.4px', color: 'var(--color-ink)' }}>
            Hi, {user?.name ?? 'Mom'} 👋
          </p>
        </div>
        <button
          onClick={logout}
          style={{
            fontSize: 12, color: 'var(--color-mute)', background: 'none',
            border: 'none', cursor: 'pointer',
          }}
        >
          Sign out
        </button>
      </div>

      {/* ── STEP: Done ── */}
      {step === 'done' && (
        <div
          style={{
            background: 'var(--color-canvas-elevated)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 'var(--rounded-lg)',
            padding: '48px 32px', textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 48, marginBottom: 12 }}>✓</p>
          <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 8 }}>
            Expense saved!
          </p>
          <p style={{ fontSize: 14, color: 'var(--color-mute)', marginBottom: 24 }}>
            ₹{Number(amount).toLocaleString('en-IN')} · {category.replace(/_/g, ' ')}
          </p>
          <BigButton onClick={reset}>Add Another</BigButton>
        </div>
      )}

      {/* ── STEP: Category ── */}
      {step === 'category' && (
        <div>
          <p
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--color-mute)', marginBottom: 16,
            }}
          >
            What are you spending on?
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => { setCategory(c.value); setStep('amount') }}
                style={{
                  background: c.color,
                  border: '1px solid transparent',
                  borderRadius: 'var(--rounded-md)',
                  padding: '24px 16px',
                  fontSize: 15, fontWeight: 600, color: 'var(--color-ink)',
                  cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                  transition: 'transform 0.1s',
                }}
                onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.97)')}
                onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                <span style={{ fontSize: 32 }}>{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── STEP: Amount ── */}
      {step === 'amount' && (
        <div>
          <button
            onClick={() => setStep('category')}
            style={{
              fontSize: 13, color: 'var(--color-mute)', background: 'none',
              border: 'none', cursor: 'pointer', marginBottom: 16, padding: 0,
            }}
          >
            ← Back
          </button>

          <p
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--color-mute)', marginBottom: 8,
            }}
          >
            {category.replace(/_/g, ' ')} — Enter Amount
          </p>

          <div
            style={{
              background: 'var(--color-canvas-elevated)',
              border: '1px solid var(--color-hairline)',
              borderRadius: 'var(--rounded-md)',
              padding: '20px 20px 16px', marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 28, fontWeight: 300, color: 'var(--color-mute)' }}>₹</span>
              <input
                type="number"
                inputMode="numeric"
                autoFocus
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                style={{
                  flex: 1, fontSize: 40, fontWeight: 600, letterSpacing: '-1px',
                  color: 'var(--color-ink)', border: 'none', outline: 'none',
                  background: 'transparent', width: '100%',
                }}
              />
            </div>
            <input
              type="text"
              placeholder="Notes (optional)…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                width: '100%', fontSize: 14, color: 'var(--color-body)',
                border: 'none', borderTop: '1px solid var(--color-hairline)',
                paddingTop: 12, outline: 'none', background: 'transparent',
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: 'var(--color-error)', marginBottom: 12 }}>{error}</p>
          )}

          <BigButton
            onClick={submit}
            disabled={!amount || Number(amount) <= 0 || saving}
          >
            {saving ? 'Saving…' : 'Save Expense'}
          </BigButton>
        </div>
      )}

      {/* Recent expenses */}
      {step !== 'done' && recentExpenses.length > 0 && (
        <div style={{ marginTop: 36 }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: 'var(--color-mute)', marginBottom: 12,
            }}
          >
            Recent
          </p>
          {recentExpenses.slice(0, 5).map((e) => (
            <div
              key={e.id}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0',
                borderBottom: '1px solid var(--color-hairline-soft)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Badge type="category" value={e.category} />
                <span style={{ fontSize: 13, color: 'var(--color-mute)' }}>{e.expenseDate}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>
                ₹{e.amount.toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function BigButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: '100%', height: 56,
        background: disabled ? 'var(--color-hairline)' : 'var(--color-ink)',
        color: disabled ? 'var(--color-mute)' : '#ffffff',
        border: 'none', borderRadius: 'var(--rounded-pill)',
        fontSize: 16, fontWeight: 600,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'background 0.15s',
      }}
    >
      {children}
    </button>
  )
}
