import { type NextRequest } from 'next/server'
import { db, fromDb } from '@/lib/db'
import { requireRole, authErrorResponse } from '@/lib/apiAuth'

export async function GET(request: NextRequest) {
  try {
    const user    = await requireRole(request, 'ADMIN', 'BUSINESS')
    const profile = db.prepare('SELECT org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { org_id: string }

    const rows = db.prepare(`
      SELECT t.*, p1.name as created_by_name, p2.name as updated_by_name
      FROM trip t
      LEFT JOIN profile p1 ON p1.id = t.created_by
      LEFT JOIN profile p2 ON p2.id = t.updated_by
      WHERE t.org_id = ? AND t.status != 'COMPLETED'
      ORDER BY t.start_date DESC
    `).all(profile.org_id) as Record<string, unknown>[]

    return Response.json(rows.map((r) => ({
      id:              r.id,
      brokerName:      r.broker_name ?? 'IN_BETWEEN',
      startDate:       r.start_date,
      status:          r.status,
      tripType:        r.trip_type,
    })))
  } catch (err) {
    return authErrorResponse(err)
  }
}
