import { type NextRequest } from 'next/server'
import { db, newId, toDb, fromDb } from '@/lib/db'
import { requireRole, authErrorResponse } from '@/lib/apiAuth'

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, 'ADMIN')
    const profile = db.prepare('SELECT id, org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { id: string; org_id: string }

    const { id } = await ctx.params

    if (!id) {
      return Response.json({ message: 'Payment ID is required' }, { status: 400 })
    }

    // Ensure org_id column exists in payment table
    const tableInfo = db.prepare("PRAGMA table_info(payment)").all()
    const hasOrgId = tableInfo.some((col: {name: string}) => col.name === 'org_id')
    if (!hasOrgId) {
      db.prepare('ALTER TABLE payment ADD COLUMN org_id STRING').run()
    }

    const row = db.prepare(`
      SELECT p.*, cre.name as created_by_name FROM payment p
      LEFT JOIN profile cre ON cre.id = p.created_by
      WHERE p.id = ? AND p.org_id = ?
    `).get(id, profile.org_id) as Record<string, unknown> | undefined

    if (!row) {
      return Response.json({ message: 'Payment not found' }, { status: 404 })
    }

    return Response.json({
      id: row.id,
      tripId: row.trip_id,
      amount: fromDb(row.amount as number),
      type: row.type,
      receivedDate: row.received_date,
      createdBy: row.created_by_name ?? null,
    })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, 'ADMIN')
    const { id } = await ctx.params
    const body = await request.json()

    if (!body.tripId || !body.amount || !body.type || !body.receivedDate) {
      return Response.json({ message: 'tripId, amount, type, and receivedDate are required' }, { status: 400 })
    }

    // Ensure org_id column exists in payment table
    const tableInfo = db.prepare("PRAGMA table_info(payment)").all()
    const hasOrgId = tableInfo.some((col: {name: string}) => col.name === 'org_id')
    if (!hasOrgId) {
      db.prepare('ALTER TABLE payment ADD COLUMN org_id STRING').run()
    }

    const profile = db.prepare('SELECT id, org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { id: string; org_id: string }

    // Fetch existing payment for validation
    const existing = db.prepare(`
      SELECT * FROM payment WHERE id = ? AND org_id = ?
    `).get(id, profile.org_id) as Record<string, unknown> | undefined
    if (!existing) {
      return Response.json({ message: 'Not found' }, { status: 404 })
    }

    db.prepare(`
      UPDATE payment
      SET trip_id = ?, amount = ?, type = ?, received_date = ?, org_id = ?
      WHERE id = ? AND org_id = ?
    `).run(body.tripId, toDb(body.amount), body.type, body.receivedDate, profile.org_id, id, profile.org_id)

    const row = db.prepare(`
      SELECT p.*, cre.name as created_by_name FROM payment p
      LEFT JOIN profile cre ON cre.id = p.created_by
      WHERE p.id = ? AND p.org_id = ?
    `).get(id, profile.org_id) as Record<string, unknown> | undefined

    if (!row) {
      return Response.json({ message: 'Payment not found' }, { status: 404 })
    }

    return Response.json({
      id: row.id,
      tripId: row.trip_id,
      amount: fromDb(row.amount as number),
      type: row.type,
      receivedDate: row.received_date,
      createdBy: row.created_by_name ?? null,
    })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireRole(request, 'ADMIN')
    const profile = db.prepare('SELECT id, org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { id: string; org_id: string }

    const { id } = await ctx.params

    if (!id) {
      return Response.json({ message: 'Payment ID is required' }, { status: 400 })
    }

    // Ensure org_id column exists in payment table
    const tableInfo = db.prepare("PRAGMA table_info(payment)").all()
    const hasOrgId = tableInfo.some((col: {name: string}) => col.name === 'org_id')
    if (!hasOrgId) {
      db.prepare('ALTER TABLE payment ADD COLUMN org_id STRING').run()
    }

    const result = db.prepare(`
      DELETE FROM payment
      WHERE id = ? AND org_id = ?
    `).run(id, profile.org_id)

    if (result.changes === 0) {
      return Response.json({ message: 'Payment not found' }, { status: 404 })
    }

    return new Response(null, { status: 204 })
  } catch (err) {
    return authErrorResponse(err)
  }
}