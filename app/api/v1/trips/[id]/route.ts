import { type NextRequest } from 'next/server'
import { db, toDb, fromDb } from '@/lib/db'
import { requireRole, authErrorResponse } from '@/lib/apiAuth'

function tripDetailFromRows(trip: Record<string, unknown>, payments: Record<string, unknown>[], expenses: Record<string, unknown>[]) {
  const advance  = payments.filter((p) => p.type === 'ADVANCE').reduce((s, p) => s + (p.amount as number), 0)
  const finalPmt = payments.filter((p) => p.type === 'FINAL').reduce((s, p) => s + (p.amount as number), 0)
  const totalRevenue  = fromDb(advance + finalPmt)
  const totalExpenses = expenses.reduce((s, e) => s + fromDb(e.amount as number), 0)

  return {
    id:              trip.id,
    orgId:           trip.org_id,
    truckId:         trip.truck_id,
    brokerName:      trip.broker_name,
    ratePerTon:      fromDb(trip.rate_per_ton as number),
    agreedWeight:    fromDb(trip.agreed_weight as number),
    actualWeight:    trip.actual_weight != null ? fromDb(trip.actual_weight as number) : null,
    shortagePenalty: fromDb(trip.shortage_penalty as number),
    brokeragePct:    fromDb(trip.brokerage_pct as number),
    status:          trip.status,
    startDate:       trip.start_date,
    endDate:         trip.end_date ?? null,
    paymentReceived: Boolean(trip.payment_received),
    createdBy:       trip.created_by_name ?? null,
    updatedBy:       trip.updated_by_name ?? null,
    payments: payments.map((p) => ({
      id:           p.id,
      tripId:       p.trip_id,
      amount:       fromDb(p.amount as number),
      type:         p.type,
      receivedDate: p.received_date,
    })),
    expenses: expenses.map((e) => ({
      id:          e.id,
      tripId:      e.trip_id,
      amount:      fromDb(e.amount as number),
      category:    e.category,
      expenseDate: e.expense_date,
      notes:       e.notes,
      createdBy:   e.created_by_name ?? null,
    })),
    summary: {
      totalRevenue,
      totalExpenses,
      grossProfit: totalRevenue - totalExpenses,
    },
  }
}

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/v1/trips/[id]'>
) {
  try {
    const { id } = await ctx.params
    await requireRole(request, 'ADMIN')

    const trip = db.prepare(`
      SELECT t.*, p1.name as created_by_name, p2.name as updated_by_name
      FROM trip t
      LEFT JOIN profile p1 ON p1.id = t.created_by
      LEFT JOIN profile p2 ON p2.id = t.updated_by
      WHERE t.id = ?
    `).get(id) as Record<string, unknown> | undefined

    if (!trip) return Response.json({ message: 'Trip not found' }, { status: 404 })

    const payments = db.prepare('SELECT * FROM payment WHERE trip_id = ? ORDER BY received_date').all(id) as Record<string, unknown>[]
    const expenses = db.prepare(`
      SELECT e.*, p.name as created_by_name FROM expense e
      LEFT JOIN profile p ON p.id = e.created_by
      WHERE e.trip_id = ? ORDER BY e.expense_date
    `).all(id) as Record<string, unknown>[]

    return Response.json(tripDetailFromRows(trip, payments, expenses))
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/v1/trips/[id]'>
) {
  try {
    const { id } = await ctx.params
    const user   = await requireRole(request, 'ADMIN')
    const body   = await request.json()

    const trip = db.prepare('SELECT * FROM trip WHERE id = ?').get(id)
    if (!trip) return Response.json({ message: 'Trip not found' }, { status: 404 })

    const profile = db.prepare('SELECT id FROM profile WHERE auth_user_id = ?').get(user.sub) as { id: string }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: profile.id }
    if (body.status          !== undefined) updates.status          = body.status
    if (body.actualWeight    !== undefined) updates.actual_weight    = toDb(body.actualWeight)
    if (body.shortagePenalty !== undefined) updates.shortage_penalty = toDb(body.shortagePenalty)
    if (body.brokeragePct    !== undefined) updates.brokerage_pct    = toDb(body.brokeragePct)
    if (body.endDate         !== undefined) updates.end_date         = body.endDate
    if (body.paymentReceived !== undefined) updates.payment_received = body.paymentReceived ? 1 : 0

    const setClauses = Object.keys(updates).map((k) => `${k} = ?`).join(', ')
    db.prepare(`UPDATE trip SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), id)

    // Auto-create IN_BETWEEN trip when status becomes DELIVERED
    if (body.status === 'DELIVERED') {
      const tripRow = trip as Record<string, unknown>
      const ibId  = 'ib-' + id
      const ibExists = db.prepare('SELECT id FROM trip WHERE id = ?').get(ibId)
      if (!ibExists) {
        db.prepare(`
          INSERT OR IGNORE INTO trip (id, org_id, truck_id, broker_name, rate_per_ton, agreed_weight,
            brokerage_pct, status, start_date, created_by, updated_by, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
        `).run(ibId, tripRow.org_id, tripRow.truck_id, 'IN_BETWEEN', 0, 0, 0, 'IN_BETWEEN', new Date().toISOString().slice(0, 10), profile.id, profile.id)
      }
    }

    const updated = db.prepare(`
      SELECT t.*, p1.name as created_by_name, p2.name as updated_by_name
      FROM trip t LEFT JOIN profile p1 ON p1.id = t.created_by LEFT JOIN profile p2 ON p2.id = t.updated_by
      WHERE t.id = ?
    `).get(id) as Record<string, unknown>

    const payments = db.prepare('SELECT * FROM payment WHERE trip_id = ?').all(id) as Record<string, unknown>[]
    const expenses = db.prepare(`SELECT e.*, p.name as created_by_name FROM expense e LEFT JOIN profile p ON p.id = e.created_by WHERE e.trip_id = ?`).all(id) as Record<string, unknown>[]

    return Response.json(tripDetailFromRows(updated, payments, expenses))
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/v1/trips/[id]'>
) {
  try {
    const { id } = await ctx.params
    await requireRole(request, 'ADMIN')
    db.prepare('DELETE FROM trip WHERE id = ?').run(id)
    return new Response(null, { status: 204 })
  } catch (err) {
    return authErrorResponse(err)
  }
}
