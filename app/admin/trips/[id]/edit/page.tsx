'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getTrip, patchTrip, type TripDetail } from '@/lib/api'
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

export default function EditTripPage() {
  // Fixed: useParams hook imported above for route parameter access
  const { id } = useParams<{ id: string }>()
  const [trip, setTrip] = useState<TripDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [status, setStatus] = useState('')
  const [actualWeight, setActualWeight] = useState('')
  const [shortagePenalty, setShortagePenalty] = useState('')
  const [endDate, setEndDate] = useState('')
  const [brokerName, setBrokerName] = useState('')
  const [ratePerTon, setRatePerTon] = useState('')
  const [agreedWeight, setAgreedWeight] = useState('')

  async function load() {
    setLoading(true)
    try {
      const data = await getTrip(id)
      setTrip(data)
      setStatus(data.status)
      setActualWeight(data.actualWeight?.toString() ?? '')
      setShortagePenalty(data.shortagePenalty?.toString() ?? '0')
      setEndDate(data.endDate ?? '')
      setBrokerName(data.brokerName)
      setRatePerTon(data.ratePerTon.toString())
      setAgreedWeight(data.agreedWeight.toString())
    } catch (err) {
      setError('Failed to load trip')
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
      await patchTrip(id, {
        status: status as any,
        actualWeight: actualWeight ? Number(actualWeight) : undefined,
        shortagePenalty: Number(shortagePenalty),
        endDate: endDate || undefined,
        brokerName: brokerName || undefined,
        ratePerTon: ratePerTon ? Number(ratePerTon) : undefined,
        agreedWeight: agreedWeight ? Number(agreedWeight) : undefined,
      })
      // Redirect back to trip detail
      window.location.href = `/admin/trips/${id}` // Updated for useParams fix
    } catch (err: any) {
      setError(err.message ?? 'Failed to update trip')
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

  if (!trip) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--color-error)' }}>Trip not found</p>
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
            Edit Trip
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '-1px',
              color: 'var(--color-ink)',
            }}
          >
            {trip.brokerName}
          </h1>
        </div>
        <Link
          href={`/admin/trips/${id}`}
          style={{ fontSize: 13, color: 'var(--color-link)', textDecoration: 'none' }}
        >
          ← Back to Trip
        </Link>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input
            label="Broker Name"
            required
            value={brokerName}
            onChange={(e) => setBrokerName(e.target.value)}
            placeholder="Sharma Brothers"
          />
          <Input
            label="Rate per Ton (₹)"
            type="number"
            required
            min={0}
            value={ratePerTon}
            onChange={(e) => setRatePerTon(e.target.value)}
            placeholder="1200"
          />
          <Input
            label="Agreed Weight (t)"
            type="number"
            required
            min={0}
            step="0.1"
            value={agreedWeight}
            onChange={(e) => setAgreedWeight(e.target.value)}
            placeholder="22.5"
          />
        </div>

        <Select
          label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </Select>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input
            label="Actual Weight (t)"
            type="number"
            step="0.1"
            value={actualWeight}
            onChange={(e) => setActualWeight(e.target.value)}
            placeholder="22.0"
          />
          <Input
            label="Shortage Penalty (₹)"
            type="number"
            value={shortagePenalty}
            onChange={(e) => setShortagePenalty(e.target.value)}
          />
        </div>

        <Input
          label="End Date"
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        {error && <p style={{ fontSize: 13, color: 'var(--color-error)' }}>{error}</p>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="ghost" type="button" onClick={() => {
            window.location.href = `/admin/trips/${id}`
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