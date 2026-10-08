import { type NextRequest } from 'next/server'
import { db, newId, toDb, fromDb } from '@/lib/db'
import { requireRole, authErrorResponse } from '@/lib/apiAuth'

export async function GET(request: NextRequest) {
  try {
    const user    = await requireRole(request, 'ADMIN')
    const profile = db.prepare('SELECT id, org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { id: string; org_id: string }

    // Ensure org_id column exists in payment table
    const tableInfo = db.prepare("PRAGMA table_info(payment)").all()
    const hasOrgId = tableInfo.some((col) => (col as { name: string }).name === 'org_id')
    if (!hasOrgId) {
      db.prepare('ALTER TABLE payment ADD COLUMN org_id STRING').run()
    }

    const sp      = request.nextUrl.searchParams
    const page    = Math.max(0, Number(sp.get('page') ?? 0))
    const size    = Math.min(100, Math.max(1, Number(sp.get('size') ?? 20)))
    const start   = sp.get('startDate')
    const end     = sp.get('endDate')

    let where = 'WHERE p.org_id = ?'
    const params: unknown[] = [profile.org_id]

    if (start) { where += ' AND p.received_date >= ?'; params.push(start) }
    if (end)   { where += ' AND p.received_date <= ?'; params.push(end)   }

    const total = (db.prepare(`SELECT COUNT(*) as n FROM payment ${where}`).get(...params) as { n: number }).n
    const rows  = db.prepare(`
      SELECT p.*, cre.name as created_by_name FROM payment p
      LEFT JOIN profile cre ON cre.id = p.created_by
      ${where}
      ORDER BY p.received_date DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as Record<string, unknown>[]

    return Response.json({
      content: rows.map((r) => ({
        id:          r.id,
        tripId:      r.trip_id,
        amount:      fromDb(r.amount as number),
        type:        r.type,
        receivedDate: r.received_date,
        createdBy:   r.created_by_name ?? null,
      })),
      page, size, totalElements: total,
      totalPages: Math.ceil(total / size),
    })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user    = await requireRole(request, 'ADMIN')
    const profile = db.prepare('SELECT id, org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { id: string; org_id: string }
    const body    = await request.json()

    // Ensure org_id column exists in payment table
    const tableInfo = db.prepare("PRAGMA table_info(payment)").all()
    const hasOrgId = tableInfo.some((col) => (col as { name: string }).name === 'org_id')
    if (!hasOrgId) {
      db.prepare('ALTER TABLE payment ADD COLUMN org_id STRING').run()
    }

    if (!body.tripId || !body.amount || !body.type || !body.receivedDate) {
      return Response.json({ message: 'tripId, amount, type, and receivedDate are required' }, { status: 400 })
    }

    const id = newId()
    db.prepare(`
      INSERT INTO payment (id, trip_id, amount, type, received_date, org_id, created_by, created_at)
      VALUES (?,?,?,?,?,?,?,datetime('now'))
    `).run(id, body.tripId, toDb(body.amount), body.type, body.receivedDate, profile.org_id, profile.id)

    const row = db.prepare(`
      SELECT p.*, cre.name as created_by_name FROM payment p
      LEFT JOIN profile cre ON cre.id = p.created_by WHERE p.id = ?
    `).get(id) as Record<string, unknown>

    return Response.json({
      id: row.id, tripId: row.trip_id, amount: fromDb(row.amount as number),
      type: row.type, receivedDate: row.received_date,
      createdBy: row.created_by_name,
    }, { status: 201 })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user    = await requireRole(request, 'ADMIN')
    const profile = db.prepare('SELECT id, org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { id: string; org_id: string }
    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')

    // Also try to get ID from path if not in query params
    const pathId = request.nextUrl.pathname.split('/').pop()
    const paymentId = id || pathId

    if (!paymentId) {
      return Response.json({ message: 'Payment ID is required' }, { status: 400 })
    }

    const body = await request.json()

    // Ensure org_id column exists in payment table
    const tableInfo = db.prepare("PRAGMA table_info(payment)").all()
    const hasOrgId = tableInfo.some((col) => (col as { name: string }).name === 'org_id')
    if (!hasOrgId) {
      db.prepare('ALTER TABLE payment ADD COLUMN org_id STRING').run()
    }

    if (!body.tripId || !body.amount || !body.type || !body.receivedDate) {
      return Response.json({ message: 'tripId, amount, type, and receivedDate are required' }, { status: 400 })
    }

    db.prepare(`
      UPDATE payment
      SET trip_id = ?, amount = ?, type = ?, received_date = ?, org_id = ?
      WHERE id = ?
    `).run(body.tripId, toDb(body.amount), body.type, body.receivedDate, profile.org_id, paymentId)

    const row = db.prepare(`
      SELECT p.*, cre.name as created_by_name FROM payment p
      LEFT JOIN profile cre ON cre.id = p.created_by WHERE p.id = ?
    `).get(paymentId) as Record<string, unknown>

    return Response.json({
      id: row.id, tripId: row.trip_id, amount: fromDb(row.amount as number),
      type: row.type, receivedDate: row.received_date,
      createdBy: row.created_by_name,
    })
  } catch (err) {
    return authErrorResponse(err)
  }
}