import { type NextRequest } from 'next/server'
import { db, toDb, fromDb } from '@/lib/db'
import { requireRole, authErrorResponse } from '@/lib/apiAuth'

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/v1/payments/[id]'>
) {
  try {
    const { id } = await ctx.params
    await requireRole(request, 'ADMIN')
    const body = await request.json()
    const updates: Record<string, unknown> = {}
    if (body.amount       !== undefined) updates.amount        = toDb(body.amount)
    if (body.type         !== undefined) updates.type          = body.type
    if (body.receivedDate !== undefined) updates.received_date = body.receivedDate
    const set = Object.keys(updates).map((k) => `${k} = ?`).join(', ')
    db.prepare(`UPDATE payment SET ${set} WHERE id = ?`).run(...Object.values(updates), id)
    const row = db.prepare('SELECT * FROM payment WHERE id = ?').get(id) as Record<string, unknown>
    return Response.json({ id: row.id, tripId: row.trip_id, amount: fromDb(row.amount as number), type: row.type, receivedDate: row.received_date })
  } catch (err) { return authErrorResponse(err) }
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/v1/payments/[id]'>
) {
  try {
    const { id } = await ctx.params
    await requireRole(request, 'ADMIN')
    db.prepare('DELETE FROM payment WHERE id = ?').run(id)
    return new Response(null, { status: 204 })
  } catch (err) { return authErrorResponse(err) }
}
