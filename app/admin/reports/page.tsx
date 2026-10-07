'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getTrips, getExpenses } from '@/lib/api'
import { StatCard } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
}

const TRUCK_OVERHEAD_CATS = ['MAINTENANCE', 'TYRE', 'BREAKDOWN', 'TAX', 'FASTAG', 'OTHER_TRUCK']
const PERSONAL_CATS = ['HOUSEHOLD', 'GROCERY', 'MEDICAL', 'OTHER_PERSONAL']
const TRIP_EXPENSE_CATS = ['FUEL', 'TOLL', 'CLEANING', 'OTHER_TRIP']

export default function ReportsPage() {
  const [trips, setTrips] = useState<any[]>([])
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // Calculate date range for current month by default
  useEffect(() => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    setStartDate(firstDay.toISOString().split('T')[0])
    setEndDate(lastDay.toISOString().split('T')[0])
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [tripRes, expRes] = await Promise.all([
        getTrips({ size: 1000, startDate, endDate }),
        getExpenses({ size: 1000, startDate, endDate }),
      ])
      setTrips(tripRes.content)
      setExpenses(expRes.content)
    } catch (err) {
      console.error('Failed to load reports data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleDateChange() {
    loadData()
  }

  // Calculate financials
  const monthlyGrossProfit = trips.reduce((sum, trip) => {
    // Calculate trip revenue
    const advance = (trip.payments || []).reduce((sum: number, p: any) => sum + (p.type === 'ADVANCE' ? p.amount : 0), 0)
    const finalPayment = (trip.payments || []).reduce((sum: number, p: any) => sum + (p.type === 'FINAL' ? p.amount : 0), 0)
    const totalRevenue = advance + finalPayment

    // Calculate trip direct expenses
    const tripExpenses = (trip.expenses || []).reduce((sum: number, e: any) =>
      TRIP_EXPENSE_CATS.includes(e.category) ? sum + e.amount : sum, 0)

    return sum + (totalRevenue - tripExpenses)
  }, 0)

  const truckOverhead = expenses.reduce((sum: number, e: any) =>
    TRUCK_OVERHEAD_CATS.includes(e.category) ? sum + e.amount : sum, 0)

  const netBusinessProfit = monthlyGrossProfit - truckOverhead

  const personalExpenses = expenses.reduce((sum: number, e: any) =>
    PERSONAL_CATS.includes(e.category) ? sum + e.amount : sum, 0)

  const remainingCash = netBusinessProfit - personalExpenses

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
            Financial Reports
          </p>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              letterSpacing: '-1px',
              color: 'var(--color-ink)',
            }}
          >
            Profit & Loss Statement
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
          <Button onClick={handleDateChange}>Apply Filter</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 16,
          marginBottom: 40,
        }}
      >
        <StatCard
          label="Monthly Gross Profit"
          value={fmt(monthlyGrossProfit)}
          sub="From all trips"
          accent={monthlyGrossProfit >= 0 ? '#0a6640' : 'var(--color-error)'}
        />
        <StatCard
          label="Truck Overhead"
          value={fmt(truckOverhead)}
          sub="Maintenance + Tyres + Tax"
          accent={truckOverhead > 0 ? '#ab570a' : 'var(--color-mute)'}
        />
        <StatCard
          label="Net Business Profit"
          value={fmt(netBusinessProfit)}
          sub="Gross Profit - Overhead"
          accent={netBusinessProfit >= 0 ? '#0a6640' : 'var(--color-error)'}
        />
        <StatCard
          label="Personal Expenses"
          value={fmt(personalExpenses)}
          sub="Household + Grocery + Medical"
        />
        <StatCard
          label="Remaining Cash"
          value={fmt(remainingCash)}
          sub="Net Business - Personal"
          accent={remainingCash >= 0 ? '#0a6640' : 'var(--color-error)'}
        />
      </div>

      {/* Detailed breakdown */}
      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--color-ink)', marginBottom: 16 }}>
          Income Breakdown
        </h2>
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
                {['Description', 'Amount'].map((h) => (
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
              <tr style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}>
                <td style={{ padding: '12px 16px', color: 'var(--color-body)' }}>
                  Total Trip Revenue
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-ink)' }}>
                  {fmt(
                    trips.reduce((sum, t) => {
                      const advance = (t.payments || []).reduce((sum: number, p: any) => sum + (p.type === 'ADVANCE' ? p.amount : 0), 0)
                      const finalPayment = (t.payments || []).reduce((sum: number, p: any) => sum + (p.type === 'FINAL' ? p.amount : 0), 0)
                      return sum + advance + finalPayment
                    }, 0)
                  )}
                </td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}>
                <td style={{ padding: '12px 16px', color: 'var(--color-body)' }}>
                  Less: Trip Direct Expenses
                </td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-ink)' }}>
                  {fmt(
                    trips.reduce((sum, t) => {
                      const tripExpenses = (t.expenses || []).reduce((sum: number, e: any) =>
                        TRIP_EXPENSE_CATS.includes(e.category) ? sum + e.amount : sum, 0)
                      return sum + tripExpenses
                    }, 0)
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--color-ink)', marginBottom: 16 }}>
          Expense Breakdown
        </h2>
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
                {['Category', 'Amount'].map((h) => (
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
              {/* Truck Overhead */}
              {TRUCK_OVERHEAD_CATS.map((cat) => {
                const amount = expenses.reduce((sum: number, e: any) =>
                  e.category === cat ? sum + e.amount : sum, 0)
                return amount > 0 && (
                  <tr key={cat} style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--color-body)' }}>
                      {cat.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {fmt(amount)}
                    </td>
                  </tr>
                )
              })}

              {/* Personal Expenses */}
              {PERSONAL_CATS.map((cat) => {
                const amount = expenses.reduce((sum: number, e: any) =>
                  e.category === cat ? sum + e.amount : sum, 0)
                return amount > 0 && (
                  <tr key={cat} style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--color-body)' }}>
                      {cat.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {fmt(amount)}
                    </td>
                  </tr>
                )
              })}

              {/* Trip Direct Expenses */}
              {TRIP_EXPENSE_CATS.map((cat) => {
                const amount = expenses.reduce((sum: number, e: any) =>
                  e.category === cat ? sum + e.amount : sum, 0)
                return amount > 0 && (
                  <tr key={cat} style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}>
                    <td style={{ padding: '12px 16px', color: 'var(--color-body)' }}>
                      {cat.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-ink)' }}>
                      {fmt(amount)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Trip Summary */}
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--color-ink)', marginBottom: 16 }}>
          Trip Summary ({trips.length} trips)
        </h2>
        {trips.length === 0 ? (
          <p style={{ color: 'var(--color-mute)', textAlign: 'center', padding: '40px' }}>
            No trips found for the selected period.
          </p>
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
                  {['Broker', 'Dates', 'Revenue', 'Expenses', 'Profit', 'Status'].map((h) => (
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
                {trips.map((trip) => {
                  const advance = (trip.payments || []).reduce((sum: number, p: any) => sum + (p.type === 'ADVANCE' ? p.amount : 0), 0)
                  const finalPayment = (trip.payments || []).reduce((sum: number, p: any) => sum + (p.type === 'FINAL' ? p.amount : 0), 0)
                  const totalRevenue = advance + finalPayment
                  const tripExpenses = (trip.expenses || []).reduce((sum: number, e: any) =>
                    TRIP_EXPENSE_CATS.includes(e.category) ? sum + e.amount : sum, 0)
                  const grossProfit = totalRevenue - tripExpenses

                  return (
                    <tr key={trip.id} style={{ borderBottom: '1px solid var(--color-hairline-soft)' }}>
                      <td style={{ padding: '12px 16px', color: 'var(--color-body)' }}>
                        {trip.brokerName}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--color-body)' }}>
                        {trip.startDate}{trip.endDate ? ` → ${trip.endDate}` : ''}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-ink)' }}>
                        {fmt(totalRevenue)}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--color-ink)' }}>
                        {fmt(tripExpenses)}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color:
                        grossProfit >= 0 ? '#0a6640' : 'var(--color-error)'
                      }}>
                        {fmt(grossProfit)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Badge type="status" value={trip.status} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}