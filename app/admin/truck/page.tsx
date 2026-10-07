'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getOrgUsers, createOrgUser, type OrgUser } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, StatCard } from '@/components/ui/Card'

export default function TruckPage() {
  const [truck, setTruck] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [regNumber, setRegNumber] = useState('')
  const [model, setModel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/organisation/truck', {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to fetch truck')
      const data = await res.json()
      setTruck(data)
      setRegNumber(data.regNumber)
      setModel(data.model ?? '')
    } catch (err) {
      console.error(err)
      setTruck(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function updateTruck(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      const res = await fetch(`/api/v1/organisation/truck/${truck?.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          regNumber: regNumber || undefined,
          model: model || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to update truck')
      await load()
    } catch (err: any) {
      setError(err.message ?? 'Failed to save')
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

  if (!truck) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <h2 style={{ color: 'var(--color-mute)', marginBottom: 16 }}>No truck configured</h2>
        <p style={{ color: 'var(--color-body)' }}>Please add truck details to continue.</p>
        <Button onClick={() => setShowForm(true)}>Add Truck</Button>
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
            Truck
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '-1px',
              color: 'var(--color-ink)',
            }}
          >
            Truck Details
          </h1>
        </div>
        <Button onClick={() => setShowForm(true)}>Edit Truck</Button>
      </div>

      {/* Truck Card */}
      <Card>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
            padding: '24px 0',
          }}
        >
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-mute)', marginBottom: 4 }}>
              Registration Number
            </p>
            <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-ink)' }}>
              {truck.regNumber}
            </p>
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-mute)', marginBottom: 4 }}>
              Model
            </p>
            <p style={{ fontSize: 20, fontWeight: 600, color: 'var(--color-ink)' }}>
              {truck.model || 'Not specified'}
            </p>
          </div>
        </div>
      </Card>

      {/* Edit Form */}
      {showForm && (
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
              maxWidth: 440,
            }}
          >
            <h2
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: '-0.4px',
                color: 'var(--color-ink)',
                marginBottom: 20,
              }}
            >
              Edit Truck Details
            </h2>
            <form onSubmit={updateTruck} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Input
                label="Registration Number"
                required
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="MH-12-AB-1234"
              />
              <Input
                label="Model (optional)"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Tata Prima / Ashok Leyland"
              />
              {error && <p style={{ fontSize: 13, color: 'var(--color-error)' }}>{error}</p>}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <Button variant="ghost" type="button" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}