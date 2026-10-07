'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getTrip, patchTrip, createPayment, createExpense, deleteTrip,
  type TripDetail,
} from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, StatCard } from '@/components/ui/Card'
import { Input, Select, Textarea } from '@/components/ui/Input'

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

const STATUSES = [
  'ORDER_RECEIVED', 'IN_TRANSIT', 'DELIVERED',
  'DOCS_SENT', 'PAYMENT_PENDING', 'COMPLETED',
]

const TRIP_EXPENSE_CATS = ['FUEL', 'TOLL', 'CLEANING', 'OTHER_TRIP']

export function TripDetailClient({ id }: { id: string }) {
  const router = useRouter()

  const [trip, setTrip]               = useState<TripDetail | null>(null)
  const [loading, setLoading]         = useState(true)
  const [showStatus, setShowStatus]   = useState(false)
  const [showPayment, setShowPayment] = useState(false)
  const [showExpense, setShowExpense] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await getTrip(id)
      setTrip(data)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function handleDelete() {
    if (!confirm('Delete this trip? This cannot be undone.')) return
    await deleteTrip(id)
    router.push('/admin/trips')
  }

  if (loading) {
    return <p style={{ color: 'var(--color-mute)', fontSize: 14 }}>Loading…</p>
  }

  if (!trip) {
    return (
      <div>
        <p style={{ color: 'var(--color-error)' }}>Trip not found.</p>
        <Link href="/admin/trips" style={{ color: 'var(--color-link)', fontSize: 14 }}>← Back</Link>
      </div>
    )
  }

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        href="/admin/trips"
        style={{ fontSize: 13, color: 'var(--color-mute)', textDecoration: 'none' }}
      >
        ← Trips
      </Link>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginTop: 12,
          marginBottom: 28,
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1
              style={{
                fontSize: 24, fontWeight: 600, letterSpacing: '-0.8px', color: 'var(--color-ink)',
              }}
            >
              {trip.brokerName}
            </h1>
            <Badge type="status" value={trip.status} />
          </div>
          <p style={{ fontSize: 13, color: 'var(--color-mute)' }}>
            {trip.startDate}
            {trip.endDate ? ` → ${trip.endDate}` : ' → ongoing'}
            {' · '}Trip {trip.id.slice(0, 8)}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button variant="ghost" size="sm" onClick={() => setShowStatus(true)}>Update Status</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowPayment(true)}>+ Payment</Button>
          <Button variant="ghost" size="sm" onClick={() => setShowExpense(true)}>+ Expense</Button>
          <Button variant="danger" size="sm" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: 12, marginBottom: 32,
        }}
      >
        <StatCard label="Agreed Fare" value={fmt(trip.ratePerTon * trip.agreedWeight)} />
        <StatCard
          label="Actual Fare"
          value={trip.actualWeight ? fmt(trip.ratePerTon * trip.actualWeight) : '—'}
          sub={trip.actualWeight ? `${trip.actualWeight}t` : 'Not set'}
        />
        <StatCard label="Total Revenue" value={fmt(trip.summary.totalRevenue)} />
        <StatCard label="Direct Expenses" value={fmt(trip.summary.totalExpenses)} />
        <StatCard
          label="Gross Profit"
          value={fmt(trip.summary.grossProfit)}
          accent={trip.summary.grossProfit >= 0 ? '#0a6640' : 'var(--color-error)'}
        />
      </div>

      {/* Trip details + payments */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20, marginBottom: 32,
        }}
      >
        <Card>
          <SectionTitle>Trip Details</SectionTitle>
          <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginTop: 12 }}>
            <Dt>Rate/ton</Dt>      <Dd>{fmt(trip.ratePerTon)}</Dd>
            <Dt>Agreed weight</Dt> <Dd>{trip.agreedWeight}t</Dd>
            <Dt>Actual weight</Dt> <Dd>{trip.actualWeight ? `${trip.actualWeight}t` : '—'}</Dd>
            <Dt>Shortage</Dt>      <Dd>{trip.shortagePenalty ? fmt(trip.shortagePenalty) : '—'}</Dd>
            <Dt>Brokerage</Dt>     <Dd>{trip.brokeragePct}%</Dd>
            <Dt>Payment</Dt>       <Dd>{trip.paymentReceived ? '✓ Received' : 'Pending'}</Dd>
          </dl>
        </Card>

        <Card>
          <SectionTitle>Payments</SectionTitle>
          {trip.payments.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-mute)', marginTop: 12 }}>No payments yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--color-hairline)' }}>
                  <th style={TH}>Type</th><th style={TH}>Amount</th><th style={TH}>Date</th>
                </tr>
              </thead>
              <tbody>
                {trip.payments.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}>
                    <td style={TD}>
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
                    <td style={{ ...TD, fontWeight: 600 }}>{fmt(p.amount)}</td>
                    <td style={{ ...TD, color: 'var(--color-mute)' }}>{p.receivedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Expenses */}
      <Card>
        <SectionTitle>Trip Expenses</SectionTitle>
        {trip.expenses.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--color-mute)', marginTop: 12 }}>No expenses linked.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 12 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-hairline)' }}>
                {['Date', 'Category', 'Amount', 'Notes'].map((h) => <th key={h} style={TH}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {trip.expenses.map((e) => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}>
                  <td style={{ ...TD, color: 'var(--color-mute)' }}>{e.expenseDate}</td>
                  <td style={TD}><Badge type="category" value={e.category} /></td>
                  <td style={{ ...TD, fontWeight: 600 }}>{fmt(e.amount)}</td>
                  <td style={{ ...TD, color: 'var(--color-mute)' }}>{e.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Modals */}
      {showStatus && (
        <StatusModal
          trip={trip}
          onClose={() => setShowStatus(false)}
          onSaved={() => { setShowStatus(false); load() }}
        />
      )}
      {showPayment && (
        <PaymentModal
          tripId={id}
          onClose={() => setShowPayment(false)}
          onSaved={() => { setShowPayment(false); load() }}
        />
      )}
      {showExpense && (
        <ExpenseModal
          tripId={id}
          onClose={() => setShowExpense(false)}
          onSaved={() => { setShowExpense(false); load() }}
        />
      )}
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500,
      textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-mute)',
    }}>
      {children}
    </p>
  )
}
function Dt({ children }: { children: React.ReactNode }) {
  return <dt style={{ fontSize: 12, color: 'var(--color-mute)' }}>{children}</dt>
}
function Dd({ children }: { children: React.ReactNode }) {
  return <dd style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-ink)' }}>{children}</dd>
}
const TH: React.CSSProperties = {
  padding: '8px 0', textAlign: 'left', fontSize: 11,
  fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--color-mute)', fontWeight: 500,
}
const TD: React.CSSProperties = { padding: '10px 0', paddingRight: 16 }

// ── Modal shell ────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: {
  title: string; onClose: () => void; children: React.ReactNode
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--color-canvas-elevated)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 'var(--rounded-lg)',
        padding: 32, width: '100%', maxWidth: 440,
      }}>
        <h2 style={{
          fontSize: 18, fontWeight: 600, letterSpacing: '-0.4px',
          color: 'var(--color-ink)', marginBottom: 20,
        }}>
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}

// ── Status modal ───────────────────────────────────────────────────────────────
function StatusModal({ trip, onClose, onSaved }: {
  trip: TripDetail; onClose: () => void; onSaved: () => void
}) {
  const [status, setStatus]     = useState(trip.status)
  const [actualWeight, setAW]   = useState(trip.actualWeight?.toString() ?? '')
  const [shortage, setShortage] = useState(trip.shortagePenalty?.toString() ?? '0')
  const [endDate, setEnd]       = useState(trip.endDate ?? '')
  const [saving, setSaving]     = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await patchTrip(trip.id, {
      status: status as any,
      actualWeight:    actualWeight ? Number(actualWeight) : undefined,
      shortagePenalty: Number(shortage),
      endDate:         endDate || undefined,
    })
    setSaving(false)
    onSaved()
  }

  return (
    <Modal title="Update Trip" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
        </Select>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Actual Weight (t)" type="number" step="0.1" value={actualWeight}
            onChange={(e) => setAW(e.target.value)} placeholder="21.5" />
          <Input label="Shortage Penalty (₹)" type="number" value={shortage}
            onChange={(e) => setShortage(e.target.value)} />
        </div>
        <Input label="End Date" type="date" value={endDate} onChange={(e) => setEnd(e.target.value)} />
        <p style={{ fontSize: 12, color: 'var(--color-mute)' }}>
          Payment status is set automatically when a final payment is recorded.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Payment modal ──────────────────────────────────────────────────────────────
function PaymentModal({ tripId, onClose, onSaved }: {
  tripId: string; onClose: () => void; onSaved: () => void
}) {
  const [type, setType]     = useState<'ADVANCE' | 'FINAL'>('ADVANCE')
  const [amount, setAmount] = useState('')
  const [date, setDate]     = useState(new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await createPayment({ tripId, amount: Number(amount), type, receivedDate: date })
    setSaving(false)
    onSaved()
  }

  return (
    <Modal title="Add Payment" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Type" value={type} onChange={(e) => setType(e.target.value as any)}>
          <option value="ADVANCE">Advance</option>
          <option value="FINAL">Final</option>
        </Select>
        <Input label="Amount (₹)" type="number" required min={1} value={amount}
          onChange={(e) => setAmount(e.target.value)} placeholder="10000" />
        <Input label="Received Date" type="date" required value={date}
          onChange={(e) => setDate(e.target.value)} />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add Payment'}</Button>
        </div>
      </form>
    </Modal>
  )
}

// ── Expense modal ──────────────────────────────────────────────────────────────
function ExpenseModal({ tripId, onClose, onSaved }: {
  tripId: string; onClose: () => void; onSaved: () => void
}) {
  const [cat, setCat]       = useState('FUEL')
  const [amount, setAmount] = useState('')
  const [date, setDate]     = useState(new Date().toISOString().slice(0, 10))
  const [notes, setNotes]   = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await createExpense({ tripId, amount: Number(amount), category: cat, expenseDate: date, notes })
    setSaving(false)
    onSaved()
  }

  return (
    <Modal title="Add Trip Expense" onClose={onClose}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Select label="Category" value={cat} onChange={(e) => setCat(e.target.value)}>
          {TRIP_EXPENSE_CATS.map((c) => (
            <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>
          ))}
        </Select>
        <Input label="Amount (₹)" type="number" required min={1} value={amount}
          onChange={(e) => setAmount(e.target.value)} placeholder="4500" />
        <Input label="Date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        <Textarea label="Notes (optional)" value={notes}
          onChange={(e) => setNotes(e.target.value)} placeholder="Diesel for full tank…" />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Add Expense'}</Button>
        </div>
      </form>
    </Modal>
  )
}
