'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { getTrips, getExpenses, type Trip, type Expense } from '@/lib/api'

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

export default function DashboardPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getTrips({ size: 50 }),
      getExpenses({ size: 100 }),
    ]).then(([t, e]) => {
      setTrips(t.content)
      setExpenses(e.content)
    }).finally(() => setLoading(false))
  }, [])

  // ── Derived stats ────────────────────────────────────────────────────────
  const activeTrips   = trips.filter((t) => t.status !== 'COMPLETED')
  const completedTrips = trips.filter((t) => t.status === 'COMPLETED')

  const truckExpenses = expenses.filter((e) =>
    ['FUEL','TOLL','CLEANING','OTHER_TRIP','MAINTENANCE','TYRE','BREAKDOWN','TAX','FASTAG','OTHER_TRUCK'].includes(e.category)
  )
  const personalExpenses = expenses.filter((e) =>
    ['HOUSEHOLD','GROCERY','MEDICAL','OTHER_PERSONAL'].includes(e.category)
  )

  const totalTruck    = truckExpenses.reduce((s, e) => s + e.amount, 0)
  const totalPersonal = personalExpenses.reduce((s, e) => s + e.amount, 0)

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 32 }}>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            fontWeight: 500,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--color-mute)',
            marginBottom: 6,
          }}
        >
          Overview
        </p>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: '-1px',
            color: 'var(--color-ink)',
          }}
        >
          Dashboard
        </h1>
      </div>

      {loading ? (
        <p style={{ color: 'var(--color-mute)', fontSize: 14 }}>Loading…</p>
      ) : (
        <>
          {/* Stat cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 16,
              marginBottom: 40,
            }}
          >
            <StatCard
              label="Active Trips"
              value={activeTrips.length}
              sub={`${completedTrips.length} completed`}
            />
            <StatCard
              label="Truck Expenses"
              value={fmt(totalTruck)}
              sub="All categories"
            />
            <StatCard
              label="Personal Expenses"
              value={fmt(totalPersonal)}
              sub="Household + more"
            />
            <StatCard
              label="Total Expenses"
              value={fmt(totalTruck + totalPersonal)}
              sub="This period"
            />
          </div>

          {/* Active trips table */}
          <div style={{ marginBottom: 40 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: '-0.3px',
                  color: 'var(--color-ink)',
                }}
              >
                Active Trips
              </h2>
              <Link
                href="/admin/trips"
                style={{ fontSize: 13, color: 'var(--color-link)', textDecoration: 'none' }}
              >
                View all →
              </Link>
            </div>

            <TripTable trips={activeTrips.length > 0 ? activeTrips : trips.slice(0, 5)} />
          </div>

          {/* Recent expenses */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  letterSpacing: '-0.3px',
                  color: 'var(--color-ink)',
                }}
              >
                Recent Expenses
              </h2>
              <Link
                href="/admin/expenses"
                style={{ fontSize: 13, color: 'var(--color-link)', textDecoration: 'none' }}
              >
                View all →
              </Link>
            </div>

            <ExpenseTable expenses={expenses.slice(0, 6)} />
          </div>
        </>
      )}
    </div>
  )
}

function TripTable({ trips }: { trips: Trip[] }) {
  if (trips.length === 0) {
    return (
      <div
        style={{
          background: 'var(--color-canvas-elevated)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--rounded-md)',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-mute)',
          fontSize: 14,
        }}
      >
        No trips yet. <Link href="/admin/trips" style={{ color: 'var(--color-link)' }}>Create one →</Link>
      </div>
    )
  }

  return (
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
            {['Broker', 'Start Date', 'Rate/ton', 'Status'].map((h) => (
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
              style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}
            >
              <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--color-ink)' }}>
                <Link
                  href={`/admin/trips/${t.id}`}
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  {t.brokerName}
                </Link>
              </td>
              <td style={{ padding: '12px 16px', color: 'var(--color-body)' }}>{t.startDate}</td>
              <td style={{ padding: '12px 16px', color: 'var(--color-body)' }}>₹{t.ratePerTon}/t</td>
              <td style={{ padding: '12px 16px' }}>
                <Badge type="status" value={t.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ExpenseTable({ expenses }: { expenses: Expense[] }) {
  if (expenses.length === 0) {
    return (
      <div
        style={{
          background: 'var(--color-canvas-elevated)',
          border: '1px solid var(--color-hairline)',
          borderRadius: 'var(--rounded-md)',
          padding: '32px',
          textAlign: 'center',
          color: 'var(--color-mute)',
          fontSize: 14,
        }}
      >
        No expenses logged yet.
      </div>
    )
  }

  return (
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
            {['Date', 'Category', 'Amount', 'Notes', 'By'].map((h) => (
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
          {expenses.map((e) => (
            <tr key={e.id} style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}>
              <td style={{ padding: '10px 16px', color: 'var(--color-body)' }}>{e.expenseDate}</td>
              <td style={{ padding: '10px 16px' }}>
                <Badge type="category" value={e.category} />
              </td>
              <td style={{ padding: '10px 16px', fontWeight: 500, color: 'var(--color-ink)' }}>
                ₹{e.amount.toLocaleString('en-IN')}
              </td>
              <td style={{ padding: '10px 16px', color: 'var(--color-mute)', maxWidth: 200 }}>
                {e.notes || '—'}
              </td>
              <td style={{ padding: '10px 16px', color: 'var(--color-mute)' }}>{e.createdBy}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
