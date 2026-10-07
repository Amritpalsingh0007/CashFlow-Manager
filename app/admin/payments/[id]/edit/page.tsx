'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getPayment, patchPayment, type Payment, getTrips, type Trip } from '@/lib/api'
import { Select, Input} from '@/components/ui/Input'
import {Button} from '@/components/ui/Button'

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

const PAYMENT_TYPES = ['ADVANCE', 'FINAL']

export default function EditPaymentPage() {
  const { id } = useParams<{ id: string }>()
  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [type, setType]       = useState<'ADVANCE' | 'FINAL'>('ADVANCE')
  const [amount, setAmount]   = useState('')
  const [date, setDate]       = useState('')
  const [tripId, setTripId]   = useState<string | null>(null)
  const [trips, setTrips]     = useState<Trip[]>([])

  async function load() {
    setLoading(true)
    try {
      const paymentData = await getPayment(id)
      setPayment(paymentData)
      setType(paymentData.type)
      setAmount(paymentData.amount.toString())
      setDate(paymentData.receivedDate)
      setTripId(paymentData.tripId)

      // Load trips for dropdown
      const tripsData = await getTrips({ size: 100 })
      setTrips(tripsData.content)
    } catch (err) {
      console.error('Failed to load payment:', err)
      setError('Failed to load payment')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (!tripId) {
        setError('Please select a trip')
        setSaving(false)
        return
      }
      await patchPayment(id, {
        tripId,
        amount: Number(amount),
        type,
        receivedDate: date,
      })
      window.location.href = '/admin/payments'
    } catch (err: any) {
      setError(err.message ?? 'Failed to update payment')
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

  if (!payment) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--color-error)' }}>{error || 'Payment not found'}</p>
        <Link
          href="/admin/payments"
          style={{ fontSize: 13, color: 'var(--color-link)', textDecoration: 'none' }}
        >
          ← Back to Payments
        </Link>
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
            Edit Payment
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '-1px',
              color: 'var(--color-ink)',
            }}
          >
            Payment
          </h1>
        </div>
        <Link
          href="/admin/payments"
          style={{ fontSize: 13, color: 'var(--color-link)', textDecoration: 'none' }}
        >
          ← Back to Payments
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480 }}>
        <Select
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value as any)}
        >
          <option value="ADVANCE">Advance</option>
          <option value="FINAL">Final</option>
        </Select>
        <Input
          label="Amount (₹)"
          type="number"
          required
          min={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="10000"
        />
        <Input
          label="Received Date"
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <Select label="Trip" value={tripId ?? ''} onChange={(e) => setTripId(e.target.value || null)}>
          <option value="">Select a trip</option>
          {trips.map((t) => (
            <option key={t.id} value={t.id}>
              {t.brokerName} ({t.startDate} to {t.endDate ?? 'ongoing'})
            </option>
          ))}
        </Select>

        {error && <p style={{ fontSize: 13, color: 'var(--color-error)' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="ghost" type="button" onClick={() => {
            window.location.href = '/admin/payments'
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
