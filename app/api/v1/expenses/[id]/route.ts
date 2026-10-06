import { type NextRequest } from 'next/server'
import { db, toDb, fromDb } from '@/lib/db'
import { requireAuth, requireRole, authErrorResponse } from '@/lib/apiAuth'

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/v1/expenses/[id]'>
) {
  try {
    const { id } = await ctx.params
    await requireAuth(request)
    const row = db.prepare(`
      SELECT e.*, p.name as created_by_name FROM expense e
      LEFT JOIN profile p ON p.id = e.created_by WHERE e.id = ?
    `).get(id) as Record<string, unknown> | undefined
    if (!row) return Response.json({ message: 'Not found' }, { status: 404 })
    return Response.json({ id: row.id, tripId: row.trip_id, amount: fromDb(row.amount as number), category: row.category, expenseDate: row.expense_date, notes: row.notes, createdBy: row.created_by_name })
  } catch (err) { return authErrorResponse(err) }
}

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/v1/expenses/[id]'>
) {
  try {
    const { id } = await ctx.params
    const user   = await requireRole(request, 'ADMIN')
    const body   = await request.json()
    const profile = db.prepare('SELECT id FROM profile WHERE auth_user_id = ?').get(user.sub) as { id: string }
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString(), updated_by: profile.id }
    if (body.amount      !== undefined) updates.amount      = toDb(body.amount)
    if (body.category    !== undefined) updates.category    = body.category
    if (body.notes       !== undefined) updates.notes       = body.notes
    if (body.tripId      !== undefined) updates.trip_id     = body.tripId
    if (body.expenseDate !== undefined) updates.expense_date = body.expenseDate
    const set = Object.keys(updates).map((k) => `${k} = ?`).join(', ')
    db.prepare(`UPDATE expense SET ${set} WHERE id = ?`).run(...Object.values(updates), id)
    const row = db.prepare('SELECT * FROM expense WHERE id = ?').get(id) as Record<string, unknown>
    return Response.json({ id: row.id, amount: fromDb(row.amount as number), category: row.category, expenseDate: row.expense_date, notes: row.notes })
  } catch (err) { return authErrorResponse(err) }
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/v1/expenses/[id]'>
) {
  try {
    const { id } = await ctx.params
    await requireRole(request, 'ADMIN')
    db.prepare('DELETE FROM expense WHERE id = ?').run(id)
    return new Response(null, { status: 204 })
  } catch (err) { return authErrorResponse(err) }
}
