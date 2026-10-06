import { type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, authErrorResponse } from '@/lib/apiAuth'

export async function GET(request: NextRequest) {
  try {
    const user    = await requireRole(request, 'ADMIN')
    const profile = db.prepare('SELECT org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { org_id: string }
    const truck   = db.prepare('SELECT id, reg_number as regNumber, model FROM truck WHERE org_id = ? LIMIT 1').get(profile.org_id)
    if (!truck) return Response.json({ message: 'No truck found' }, { status: 404 })
    return Response.json(truck)
  } catch (err) {
    return authErrorResponse(err)
  }
}
