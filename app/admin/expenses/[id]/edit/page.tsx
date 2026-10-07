'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getExpense, patchExpense, type Expense, getActiveTrips, type Trip } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

const CATEGORIES = [
  'FUEL', 'TOLL', 'CLEANING', 'OTHER_TRIP',
  'MAINTENANCE', 'TYRE', 'BREAKDOWN', 'TAX', 'FASTAG', 'OTHER_TRUCK',
  'HOUSEHOLD', 'GROCERY', 'MEDICAL', 'OTHER_PERSONAL',
]

export default function EditExpensePage() {
  const { id } = useParams<{ id: string }>()
  const [expense, setExpense] = useState<Expense | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('')
  const [expenseDate, setExpenseDate] = useState('')
  const [notes, setNotes] = useState('')
  const [tripId, setTripId] = useState<string | null>(null)
  const [trips, setTrips] = useState<Trip[]>([])

  async function load() {
    setLoading(true)
    try {
      const data = await getExpense(id)
      setExpense(data)
      setAmount(data.amount.toString())
      setCategory(data.category)
      setExpenseDate(data.expenseDate)
      setNotes(data.notes ?? '')
      setTripId(data.tripId ?? null)

      // Load trips if this is a business expense
      const isBusiness = !(PERSONAL_CATS.includes(data.category))
      if (isBusiness) {
        const tripData = await getActiveTrips()
        setTrips(tripData)
      }
    } catch (err) {
      setError('Failed to load expense')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  // Fetch trips when category changes to a business category
  useEffect(() => {
    if (!expense) return // Only run after initial load

    const isBusiness = !(PERSONAL_CATS.includes(category))
    if (isBusiness) {
      getActiveTrips().then((data) => {
        setTrips(data)
        // If we don't have a tripId yet, keep it as null to force selection
        if (!tripId && !expense?.tripId) {
          setTripId(null)
        }
      }).catch(() => {
        setTrips([])
      })
    } else {
      setTrips([])
      setTripId(null)
    }
  }, [category, expense])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const isBusiness = !(PERSONAL_CATS.includes(category))
      if (isBusiness && !tripId) {
        setError('Please select a trip for business expenses')
        setSaving(false)
        return
      }
      await patchExpense(id, {
        amount: Number(amount),
        category: category as any,
        expenseDate,
        notes,
        tripId: isBusiness ? tripId : undefined,
      })
      window.location.href = '/admin/expenses'
    } catch (err: any) {
      setError(err.message ?? 'Failed to update expense')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--color-mute)' }}>Loading…</p>
      </div>
    )
  }

  if (!expense) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--color-error)' }}>{error || 'Expense not found'}</p>
      </div>
    )
  }

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
            Edit Expense
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '-1px',
              color: 'var(--color-ink)',
            }}
          >
            {expense.category}
          </h1>
        </div>
        <Link
          href="/admin/expenses"
          style={{ fontSize: 13, color: 'var(--color-link)', textDecoration: 'none' }}
        >
          ← Back to Expenses
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
        <Input
          label="Amount (₹)"
          type="number"
          required
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="4500"
        />
        <Select
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </Select>
        <Input
          label="Date"
          type="date"
          required
          value={expenseDate}
          onChange={(e) => setExpenseDate(e.target.value)}
        />
        {!(PERSONAL_CATS.includes(category)) && (
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
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Details…"
        />

        {error && <p style={{ fontSize: 13, color: 'var(--color-error)' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="ghost" type="button" onClick={() => {
            window.location.href = '/admin/expenses'
          }}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  )
}