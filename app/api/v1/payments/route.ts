import { type NextRequest } from 'next/server'
import { db, newId, toDb, fromDb } from '@/lib/db'
import { requireRole, authErrorResponse } from '@/lib/apiAuth'

export async function POST(request: NextRequest) {
  try {
    const user    = await requireRole(request, 'ADMIN')
    const body    = await request.json()
    const profile = db.prepare('SELECT id FROM profile WHERE auth_user_id = ?').get(user.sub) as { id: string }

    if (!body.tripId || !body.amount || !body.type || !body.receivedDate) {
      return Response.json({ message: 'tripId, amount, type, and receivedDate are required' }, { status: 400 })
    }

    const id = newId()
    db.prepare(`
      INSERT INTO payment (id, trip_id, amount, type, received_date, created_by, created_at)
      VALUES (?,?,?,?,?,?,datetime('now'))
    `).run(id, body.tripId, toDb(body.amount), body.type, body.receivedDate, profile.id)

    const row = db.prepare('SELECT * FROM payment WHERE id = ?').get(id) as Record<string, unknown>
    return Response.json({
      id: row.id, tripId: row.trip_id, amount: fromDb(row.amount as number),
      type: row.type, receivedDate: row.received_date,
    }, { status: 201 })
  } catch (err) {
    return authErrorResponse(err)
  }
}
