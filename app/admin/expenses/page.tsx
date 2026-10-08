'use client'

import { useEffect, useState } from 'react'
import { getExpenses, createExpense, type Expense, getActiveTrips, type Trip } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { StatCard } from '@/components/ui/Card'

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

const ALL_CATS = [
  'FUEL', 'TOLL', 'CLEANING', 'OTHER_TRIP',
  'MAINTENANCE', 'TYRE', 'BREAKDOWN', 'TAX', 'FASTAG', 'OTHER_TRUCK',
  'HOUSEHOLD', 'GROCERY', 'MEDICAL', 'OTHER_PERSONAL',
]

const TRUCK_OVERHEAD_CATS = ['MAINTENANCE', 'TYRE', 'BREAKDOWN', 'TAX', 'FASTAG', 'OTHER_TRUCK']
const PERSONAL_CATS       = ['HOUSEHOLD', 'GROCERY', 'MEDICAL', 'OTHER_PERSONAL']

export default function ExpensesPage() {
  const [expenses, setExpenses]   = useState<Expense[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [filter, setFilter]       = useState<'ALL' | 'TRIP' | 'TRUCK' | 'PERSONAL'>('ALL')

  async function load() {
    setLoading(true)
    const data = await getExpenses({ size: 100 })
    setExpenses(data.content)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = expenses.filter((e) => {
    if (filter === 'TRIP')     return ['FUEL','TOLL','CLEANING','OTHER_TRIP'].includes(e.category)
    if (filter === 'TRUCK')    return TRUCK_OVERHEAD_CATS.includes(e.category)
    if (filter === 'PERSONAL') return PERSONAL_CATS.includes(e.category)
    return true
  })

  const totalAll      = expenses.reduce((s, e) => s + e.amount, 0)
  const totalTrip     = expenses.filter((e) => ['FUEL','TOLL','CLEANING','OTHER_TRIP'].includes(e.category)).reduce((s, e) => s + e.amount, 0)
  const totalTruck    = expenses.filter((e) => TRUCK_OVERHEAD_CATS.includes(e.category)).reduce((s, e) => s + e.amount, 0)
  const totalPersonal = expenses.filter((e) => PERSONAL_CATS.includes(e.category)).reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <div>
          <p className="mono-eyebrow" style={{ color: 'var(--color-mute)', marginBottom: 4 }}>
            Finance
          </p>
          <h1
            style={{
              fontSize: 28, fontWeight: 600, letterSpacing: '-1px', color: 'var(--color-ink)',
            }}
          >
            Expenses
          </h1>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Add Expense</Button>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12,
          marginBottom: 28,
        }}
      >
        <StatCard label="Total" value={fmt(totalAll)} />
        <StatCard label="Trip Direct" value={fmt(totalTrip)} />
        <StatCard label="Truck Overhead" value={fmt(totalTruck)} />
        <StatCard label="Personal" value={fmt(totalPersonal)} />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['ALL', 'TRIP', 'TRUCK', 'PERSONAL'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '4px 14px',
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid var(--color-hairline)',
              background: filter === f ? 'var(--color-ink)' : 'var(--color-canvas-elevated)',
              color: filter === f ? '#fff' : 'var(--color-body)',
              cursor: 'pointer',
              transition: 'all 0.1s',
            }}
          >
            {f === 'ALL' ? 'All' : f === 'TRIP' ? 'Trip Direct' : f === 'TRUCK' ? 'Truck Overhead' : 'Personal'}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-mute)', fontSize: 14 }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div
          style={{
            background: 'var(--color-canvas-elevated)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 'var(--rounded-md)',
            padding: '48px 32px',
            textAlign: 'center',
            color: 'var(--color-mute)',
            fontSize: 14,
          }}
        >
          No expenses in this category.
        </div>
      ) : (
        <div
          style={{
            background: 'var(--color-canvas-elevated)',
            border: '1px solid var(--color-hairline)',
            borderRadius: 'var(--rounded-md)',
            overflow: 'hidden',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-hairline)' }}>
                {['Date', 'Category', 'Amount', 'Notes', 'Added by', 'Actions'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px', textAlign: 'left',
                      fontSize: 11, fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: 'var(--color-mute)', fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}>
                  <td style={{ padding: '11px 16px', color: 'var(--color-body)' }}>{e.expenseDate}</td>
                  <td style={{ padding: '11px 16px' }}><Badge type="category" value={e.category} /></td>
                  <td style={{ padding: '11px 16px', fontWeight: 600, color: 'var(--color-ink)' }}>
                    {fmt(e.amount)}
                  </td>
                  <td style={{ padding: '11px 16px', color: 'var(--color-mute)', maxWidth: 220 }}>
                    {e.notes || '—'}
                  </td>
                  <td style={{ padding: '11px 16px', color: 'var(--color-mute)' }}>{e.createdBy ?? '-'}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.href = `/admin/expenses/${e.id}/edit`}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AddExpenseModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

function AddExpenseModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [cat, setCat]       = useState('FUEL')
  const [amount, setAmount] = useState('')
  const [date, setDate]     = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')
  const [tripId, setTripId] = useState<string | null>(null)
  const [trips, setTrips]   = useState<Trip[]>([])

  // Fetch active trips when category changes to a business category
  useEffect(() => {
    const isBusiness = !(PERSONAL_CATS.includes(cat))
    if (isBusiness) {
      getActiveTrips().then((data) => {
        setTrips(data)
      }).catch(() => {
        setTrips([])
      })
    } else {
      setTrips([])
      setTripId(null)
    }
  }, [cat])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const isBusiness = !(PERSONAL_CATS.includes(cat))
      if (isBusiness && !tripId) {
        setError('Please select a trip for business expenses')
        setSaving(false)
        return
      }
      await createExpense({
        amount: Number(amount),
        category: cat,
        expenseDate: date,
        notes,
        tripId: isBusiness ? tripId! : undefined,
      })
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--color-canvas-elevated)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--rounded-lg)',
          padding: 32, width: '100%', maxWidth: 440,
        }}
      >
        <h2
          style={{
            fontSize: 18, fontWeight: 600, letterSpacing: '-0.4px',
            color: 'var(--color-ink)', marginBottom: 20,
          }}
        >
          Add Expense
        </h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Select label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
            <optgroup label="Trip Direct">
              {['FUEL','TOLL','CLEANING','OTHER_TRIP'].map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </optgroup>
            <optgroup label="Truck Overhead">
              {TRUCK_OVERHEAD_CATS.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </optgroup>
            <optgroup label="Personal">
              {PERSONAL_CATS.map((c) => (
                <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
              ))}
            </optgroup>
          </Select>
          <Input
            label="Amount (₹)" type="number" required min={1}
            value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="4500"
          />
          <Input
            label="Date" type="date" required
            value={date} onChange={(e) => setDate(e.target.value)}
          />
          {!(PERSONAL_CATS.includes(cat)) && (
            <>
              <Select label="Trip" value={tripId ?? ''} onChange={(e) => setTripId(e.target.value || null)}>
                <option value="">Select a trip</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.brokerName} ({t.startDate} to {t.endDate ?? 'ongoing'})
                  </option>
                ))}
              </Select>
            </>
          )}
          <Textarea
            label="Notes (optional)"
            value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Details…"
          />
          {error && <p style={{ fontSize: 13, color: 'var(--color-error)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
