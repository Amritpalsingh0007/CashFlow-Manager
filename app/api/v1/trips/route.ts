import { type NextRequest } from 'next/server'
import { db, newId, toDb, fromDb } from '@/lib/db'
import { requireRole, authErrorResponse } from '@/lib/apiAuth'

function tripFromRow(r: Record<string, unknown>) {
  return {
    id:              r.id,
    orgId:           r.org_id,
    truckId:         r.truck_id,
    brokerName:      r.broker_name,
    ratePerTon:      fromDb(r.rate_per_ton as number),
    agreedWeight:    fromDb(r.agreed_weight as number),
    actualWeight:    r.actual_weight != null ? fromDb(r.actual_weight as number) : null,
    shortagePenalty: fromDb(r.shortage_penalty as number),
    brokeragePct:    fromDb(r.brokerage_pct as number),
    status:          r.status,
    startDate:       r.start_date,
    endDate:         r.end_date ?? null,
    paymentReceived: Boolean(r.payment_received),
    createdBy:       r.created_by_name ?? null,
    updatedBy:       r.updated_by_name ?? null,
    createdAt:       r.created_at,
    updatedAt:       r.updated_at,
  }
}

const TRIP_SELECT = `
  SELECT t.*,
    p1.name as created_by_name,
    p2.name as updated_by_name
  FROM trip t
  LEFT JOIN profile p1 ON p1.id = t.created_by
  LEFT JOIN profile p2 ON p2.id = t.updated_by
`

export async function GET(request: NextRequest) {
  try {
    const user   = await requireRole(request, 'ADMIN')
    const sp     = request.nextUrl.searchParams
    const page   = Math.max(0, Number(sp.get('page') ?? 0))
    const size   = Math.min(100, Math.max(1, Number(sp.get('size') ?? 20)))
    const start  = sp.get('startDate')
    const end    = sp.get('endDate')

    let where = 'WHERE t.org_id = ?'
    const params: unknown[] = [user.sub.startsWith('auth-') ? 'org-1' : 'org-1']

    if (start) { where += ' AND t.start_date >= ?'; params.push(start) }
    if (end)   { where += ' AND t.start_date <= ?'; params.push(end)   }

    // Get org_id from profile
    const profile = db.prepare('SELECT org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { org_id: string }
    params[0] = profile.org_id

    const total  = (db.prepare(`SELECT COUNT(*) as n FROM trip t ${where}`).get(...params) as { n: number }).n
    const rows   = db.prepare(`${TRIP_SELECT} ${where} ORDER BY t.start_date DESC LIMIT ? OFFSET ?`).all(...params, size, page * size) as Record<string, unknown>[]

    return Response.json({
      content:       rows.map(tripFromRow),
      page,
      size,
      totalElements: total,
      totalPages:    Math.ceil(total / size),
    })
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user    = await requireRole(request, 'ADMIN')
    const body    = await request.json()
    const profile = db.prepare('SELECT id, org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { id: string; org_id: string }

    const truck = db.prepare('SELECT id FROM truck WHERE org_id = ? LIMIT 1').get(profile.org_id) as { id: string }

    const id = newId()
    db.prepare(`
      INSERT INTO trip (id, org_id, truck_id, broker_name, rate_per_ton, agreed_weight,
        brokerage_pct, status, start_date, created_by, updated_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
    `).run(
      id, profile.org_id,
      body.truckId ?? truck.id,
      body.brokerName,
      toDb(body.ratePerTon),
      toDb(body.agreedWeight),
      toDb(body.brokeragePct ?? 5.5),
      'ORDER_RECEIVED',
      body.startDate,
      profile.id,
      profile.id,
    )

    const row = db.prepare(`${TRIP_SELECT} WHERE t.id = ?`).get(id) as Record<string, unknown>
    return Response.json(tripFromRow(row), { status: 201 })
  } catch (err) {
    return authErrorResponse(err)
  }
}
