'use client'

import { useEffect, useState } from 'react'
import { getOrgUsers, createOrgUser, type OrgUser } from '@/lib/api'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'

export default function UsersPage() {
  const [users, setUsers]     = useState<OrgUser[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShow]   = useState(false)

  async function load() {
    setLoading(true)
    try { setUsers(await getOrgUsers()) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const roleColor: Record<string, string> = {
    ADMIN:    '#171717',
    BUSINESS: '#ab570a',
    PERSONAL: '#7928ca',
  }

  return (
    <div>
      <div
        style={{
          display: 'flex', alignItems: 'flex-end',
          justifyContent: 'space-between', marginBottom: 28,
        }}
      >
        <div>
          <p className="mono-eyebrow" style={{ color: 'var(--color-mute)', marginBottom: 4 }}>
            Organisation
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-1px', color: 'var(--color-ink)' }}>
            Users
          </h1>
        </div>
        <Button onClick={() => setShow(true)}>+ Add User</Button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-mute)', fontSize: 14 }}>Loading…</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          {users.map((u) => (
            <div
              key={u.id}
              style={{
                background: 'var(--color-canvas-elevated)',
                border: '1px solid var(--color-hairline)',
                borderRadius: 'var(--rounded-md)',
                padding: '20px 24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div
                  style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: 'var(--color-hairline-soft)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, fontWeight: 600, color: 'var(--color-body)',
                  }}
                >
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>{u.name}</p>
                  <span
                    style={{
                      fontSize: 11, fontWeight: 500, fontFamily: 'var(--font-mono)',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      color: roleColor[u.role] ?? 'var(--color-mute)',
                    }}
                  >
                    {u.role}
                  </span>
                </div>
              </div>
              {u.phone && (
                <p style={{ fontSize: 13, color: 'var(--color-mute)' }}>{u.phone}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <AddUserModal
          onClose={() => setShow(false)}
          onSaved={() => { setShow(false); load() }}
        />
      )}
    </div>
  )
}

function AddUserModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '', phone: '', email: '', password: '', role: 'BUSINESS' as 'BUSINESS' | 'PERSONAL',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      await createOrgUser(form)
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
        <h2 style={{ fontSize: 18, fontWeight: 600, letterSpacing: '-0.4px', color: 'var(--color-ink)', marginBottom: 20 }}>
          Add User
        </h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input label="Name" required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Father" />
          <Input label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 98765 43210" />
          <Input label="Email" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="dad@brook.app" />
          <Input label="Password" type="password" required value={form.password} onChange={(e) => set('password', e.target.value)} />
          <Select label="Role" value={form.role} onChange={(e) => set('role', e.target.value)}>
            <option value="BUSINESS">Business (Father)</option>
            <option value="PERSONAL">Personal (Mom)</option>
          </Select>
          {error && <p style={{ fontSize: 13, color: 'var(--color-error)' }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Creating…' : 'Create User'}</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
