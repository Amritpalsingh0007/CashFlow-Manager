'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getTrips, createTrip, type Trip } from '@/lib/api'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export default function TripsPage() {
  const [trips, setTrips]       = useState<Trip[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)

  async function load() {
    setLoading(true)
    const data = await getTrips({ size: 50 })
    setTrips(data.content)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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
            Management
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '-1px',
              color: 'var(--color-ink)',
            }}
          >
            Trips
          </h1>
        </div>
        <Button onClick={() => setShowForm(true)}>+ New Trip</Button>
      </div>

      {showForm && (
        <NewTripForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); load() }}
        />
      )}

      {loading ? (
        <p style={{ color: 'var(--color-mute)', fontSize: 14 }}>Loading…</p>
      ) : trips.length === 0 ? (
        <EmptyState />
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
                {['Broker', 'Start', 'End', 'Rate/ton', 'Weight', 'Status', 'Payment'].map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      color: 'var(--color-mute)',
                      fontWeight: 500,
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trips.map((t) => (
                <tr
                  key={t.id}
                  style={{
                    borderBottom: '1px solid var(--color-hairline-soft)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = 'var(--color-hairline-soft)')
                  }
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>
                    <Link
                      href={`/admin/trips/${t.id}`}
                      style={{ color: 'var(--color-ink)', textDecoration: 'none' }}
                    >
                      {t.brokerName}
                    </Link>
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-body)' }}>{t.startDate}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-body)' }}>{t.endDate ?? '—'}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-body)' }}>{fmt(t.ratePerTon)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--color-body)' }}>
                    {t.actualWeight ? `${t.actualWeight}t` : `${t.agreedWeight}t (agreed)`}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Badge type="status" value={t.status} />
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        fontSize: 12,
                        color: t.paymentReceived ? '#0a6640' : 'var(--color-mute)',
                      }}
                    >
                      {t.paymentReceived ? '✓ Received' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EmptyState() {
  return (
    <div
      style={{
        background: 'var(--color-canvas-elevated)',
        border: '1px solid var(--color-hairline)',
        borderRadius: 'var(--rounded-md)',
        padding: '60px 32px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 32, marginBottom: 8 }}>🚛</p>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-ink)', marginBottom: 4 }}>
        No trips yet
      </p>
      <p style={{ fontSize: 14, color: 'var(--color-mute)' }}>
        Create your first trip to start tracking revenue.
      </p>
    </div>
  )
}

interface NewTripFormProps {
  onClose: () => void
  onSaved: () => void
}

function NewTripForm({ onClose, onSaved }: NewTripFormProps) {
  const [form, setForm] = useState({
    brokerName: '',
    ratePerTon: '',
    agreedWeight: '',
    brokeragePct: '5.5',
    startDate: new Date().toISOString().slice(0, 10),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createTrip({
        brokerName:   form.brokerName,
        ratePerTon:   Number(form.ratePerTon),
        agreedWeight: Number(form.agreedWeight),
        brokeragePct: Number(form.brokeragePct),
        startDate:    form.startDate,
      })
      onSaved()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create trip')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'var(--color-canvas-elevated)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--rounded-lg)',
          padding: 32,
          width: '100%',
          maxWidth: 480,
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 600,
            letterSpacing: '-0.4px',
            color: 'var(--color-ink)',
            marginBottom: 24,
          }}
        >
          New Trip
        </h2>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Input
            label="Broker Name"
            required
            value={form.brokerName}
            onChange={(e) => set('brokerName', e.target.value)}
            placeholder="Sharma Logistics"
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Rate per Ton (₹)"
              type="number"
              required
              min={0}
              value={form.ratePerTon}
              onChange={(e) => set('ratePerTon', e.target.value)}
              placeholder="1200"
            />
            <Input
              label="Agreed Weight (t)"
              type="number"
              required
              min={0}
              step="0.1"
              value={form.agreedWeight}
              onChange={(e) => set('agreedWeight', e.target.value)}
              placeholder="22"
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input
              label="Brokerage %"
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={form.brokeragePct}
              onChange={(e) => set('brokeragePct', e.target.value)}
            />
            <Input
              label="Start Date"
              type="date"
              required
              value={form.startDate}
              onChange={(e) => set('startDate', e.target.value)}
            />
          </div>

          {error && (
            <p style={{ fontSize: 13, color: 'var(--color-error)' }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create Trip'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
