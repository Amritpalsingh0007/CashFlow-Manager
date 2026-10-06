import { type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, authErrorResponse } from '@/lib/apiAuth'

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/v1/organisation/truck/[id]'>
) {
  try {
    const { id } = await ctx.params
    await requireRole(request, 'ADMIN')
    const body = await request.json()

    const updates: Record<string, unknown> = {}
    if (body.regNumber !== undefined) updates.reg_number = body.regNumber
    if (body.model     !== undefined) updates.model      = body.model

    if (Object.keys(updates).length === 0) {
      return Response.json({ message: 'Nothing to update' }, { status: 400 })
    }

    const set = Object.keys(updates).map((k) => `${k} = ?`).join(', ')
    db.prepare(`UPDATE truck SET ${set} WHERE id = ?`).run(...Object.values(updates), id)

    const truck = db.prepare('SELECT id, reg_number as regNumber, model FROM truck WHERE id = ?').get(id)
    return Response.json(truck)
  } catch (err) {
    return authErrorResponse(err)
  }
}
