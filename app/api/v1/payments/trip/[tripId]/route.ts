import { type NextRequest } from 'next/server'
import { db, fromDb } from '@/lib/db'
import { requireRole, authErrorResponse } from '@/lib/apiAuth'

export async function GET(
  request: NextRequest,
  ctx: RouteContext<'/api/v1/payments/trip/[tripId]'>
) {
  try {
    const { tripId } = await ctx.params
    await requireRole(request, 'ADMIN')
    const rows = db.prepare('SELECT * FROM payment WHERE trip_id = ? ORDER BY received_date').all(tripId) as Record<string, unknown>[]
    return Response.json(rows.map((r) => ({
      id: r.id, tripId: r.trip_id, amount: fromDb(r.amount as number),
      type: r.type, receivedDate: r.received_date,
    })))
  } catch (err) {
    return authErrorResponse(err)
  }
}
