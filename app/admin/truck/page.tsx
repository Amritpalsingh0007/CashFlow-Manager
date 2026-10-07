'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getTruck, createTruck, updateTruck, type Truck } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, StatCard } from '@/components/ui/Card'

export default function TruckPage() {
  const [trucks, setTrucks] = useState<Truck[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [regNumber, setRegNumber] = useState('')
  const [model, setModel] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    try {
      const truckData = await getTruck()
      // Since getTruck now returns an array, we'll handle it accordingly
      setTrucks(Array.isArray(truckData) ? truckData : [truckData].filter(Boolean))
    } catch (err) {
      console.error(err)
      setTrucks([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function saveTruck(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      if (editingId) {
        // Update existing truck
        await updateTruck(editingId, {
          regNumber: regNumber || undefined,
          model: model || undefined,
        })
      } else {
        // Create new truck
        await createTruck({
          regNumber,
          model: model || undefined,
        })
      }
      await load()
      setShowForm(false)
      setRegNumber('')
      setModel('')
      setEditingId(null)
    } catch (err: any) {
      setError(err.message ?? 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(truck: Truck) {
    setEditingId(truck.id)
    setRegNumber(truck.regNumber)
    setModel(truck.model ?? '')
    setShowForm(true)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--color-mute)' }}>Loading…</p>
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
            Trucks
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '-1px',
              color: 'var(--color-ink)',
            }}
          >
            Truck Fleet
          </h1>
        </div>
        <Button onClick={() => {
          setEditingId(null)
          setRegNumber('')
          setModel('')
          setShowForm(true)
        }}>
          + Add Truck
        </Button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-mute)', fontSize: 14 }}>Loading…</p>
      ) : trucks.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '40px',
          }}
        >
          <h2 style={{ color: 'var(--color-mute)', marginBottom: 16 }}>No trucks configured</h2>
          <p style={{ color: 'var(--color-body)' }}>Add your first truck to get started.</p>
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
                {['Registration Number', 'Model', 'Actions'].map((h) => (
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
              {trucks.map((truck) => (
                <tr key={truck.id} style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}>
                  <td style={{ padding: '11px 16px', color: 'var(--color-body)' }}>{truck.regNumber}</td>
                  <td style={{ padding: '11px 16px', color: 'var(--color-body)' }}>{truck.model || 'Not specified'}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(truck)}
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

      {/* Edit/Add Form */}
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
              {editingId ? 'Edit Truck' : 'Add Truck'}
            </h2>
            <form onSubmit={saveTruck} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
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
                  {saving ? 'Saving…' : editingId ? 'Update Truck' : 'Add Truck'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}