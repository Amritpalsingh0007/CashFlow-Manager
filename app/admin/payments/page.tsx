'use client'

import { useEffect, useState } from 'react'
import { getTripPayments, createPayment, type Payment, getTrips, type Trip } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select, Textarea } from '@/components/ui/Input'
import { StatCard } from '@/components/ui/Card'

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

const PAYMENT_TYPES = ['ADVANCE', 'FINAL']

export default function PaymentsPage() {
  const [payments, setPayments]   = useState<Payment[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [filter, setFilter]       = useState<'ALL' | 'ADVANCE' | 'FINAL'>('ALL')
  const [trips, setTrips]         = useState<Trip[]>([])

  async function load() {
    setLoading(true)
    // Fetch all payments by getting all trips and their payments
    try {
      const tripsData = await getTrips({ size: 100 })
      const allTrips = tripsData.content
      setTrips(allTrips)

      // Fetch payments for each trip
      const allPayments: Payment[] = []
      for (const trip of allTrips) {
        const tripPayments = await getTripPayments(trip.id)
        allPayments.push(...tripPayments)
      }
      setPayments(allPayments)
    } catch (err) {
      console.error('Failed to load payments:', err)
      setPayments([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = payments.filter((p) => {
    if (filter === 'ADVANCE')     return p.type === 'ADVANCE'
    if (filter === 'FINAL')       return p.type === 'FINAL'
    return true
  })

  const totalAll      = payments.reduce((s, p) => s + p.amount, 0)
  const totalAdvance  = payments.filter((p) => p.type === 'ADVANCE').reduce((s, p) => s + p.amount, 0)
  const totalFinal    = payments.filter((p) => p.type === 'FINAL').reduce((s, p) => s + p.amount, 0)

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
            Payments
          </h1>
        </div>
        <Button onClick={() => setShowForm(true)}>+ Add Payment</Button>
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
        <StatCard label="Advance" value={fmt(totalAdvance)} />
        <StatCard label="Final" value={fmt(totalFinal)} />
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {(['ALL', 'ADVANCE', 'FINAL'] as const).map((f) => (
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
            {f === 'ALL' ? 'All' : f === 'ADVANCE' ? 'Advance' : 'Final'}
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
          No payments in this category.
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
                {['Trip', 'Type', 'Amount', 'Received Date', 'Actions'].map((h) => (
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
              {filtered.map((p) => {
                const trip = trips.find(t => t.id === p.tripId)
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}>
                    <td style={{ padding: '11px 16px', color: 'var(--color-body)' }}>
                      {trip ? trip.brokerName : 'Unknown Trip'}
                    </td>
                    <td style={{ padding: '11px 16px' }}>
                      <span
                        style={{
                          fontSize: 11, fontWeight: 500,
                          background: p.type === 'ADVANCE' ? '#fff3d6' : '#d4f7e8',
                          color: p.type === 'ADVANCE' ? '#ab570a' : '#0a6640',
                          padding: '2px 7px', borderRadius: 100,
                        }}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td style={{ padding: '11px 16px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {fmt(p.amount)}
                    </td>
                    <td style={{ padding: '11px 16px', color: 'var(--color-mute)' }}>{p.receivedDate}</td>
                    <td style={{ padding: '11px 16px' }}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.location.href = `/admin/payments/${p.id}/edit`}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <AddPaymentModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}
    </div>
  )
}

function AddPaymentModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [type, setType]       = useState<'ADVANCE' | 'FINAL'>('ADVANCE')
  const [amount, setAmount]   = useState('')
  const [date, setDate]       = useState(new Date().toISOString().slice(0, 10))
  const [tripId, setTripId]   = useState<string | null>(null)
  const [trips, setTrips]     = useState<Trip[]>([])
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  // Fetch all trips when modal opens
  useEffect(() => {
    getTrips({ size: 100 }).then((data) => {
      setTrips(data.content)
    }).catch(() => {
      setTrips([])
    })
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (!tripId) {
        setError('Please select a trip')
        setSaving(false)
        return
      }
      await createPayment({
        tripId,
        amount: Number(amount),
        type,
        receivedDate: date,
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
          Add Payment
        </h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Select label="Type" value={type} onChange={(e) => setType(e.target.value as any)}>
            <option value="ADVANCE">Advance</option>
            <option value="FINAL">Final</option>
          </Select>
          <Input
            label="Amount (₹)" type="number" required min={1}
            value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="10000"
          />
          <Input
            label="Received Date" type="date" required
            value={date} onChange={(e) => setDate(e.target.value)}
          />
          <Select label="Trip" value={tripId ?? ''} onChange={(e) => setTripId(e.target.value || null)}>
            <option value="">Select a trip</option>
            {trips.map((t) => (
              <option key={t.id} value={t.id}>
                {t.brokerName} ({t.startDate} to {t.endDate ?? 'ongoing'})
              </option>
            ))}
          </Select>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}