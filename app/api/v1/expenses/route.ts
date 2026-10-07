import { type NextRequest } from 'next/server'
import { db, newId, toDb, fromDb } from '@/lib/db'
import { requireAuth, authErrorResponse } from '@/lib/apiAuth'

const BUSINESS_CATS = new Set(['FUEL','TOLL','CLEANING','OTHER_TRIP','MAINTENANCE','TYRE','BREAKDOWN','TAX','FASTAG','OTHER_TRUCK'])
const PERSONAL_CATS = new Set(['HOUSEHOLD','GROCERY','MEDICAL','OTHER_PERSONAL'])

export async function GET(request: NextRequest) {
  try {
    const user    = await requireAuth(request)
    const profile = db.prepare('SELECT id, org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { id: string; org_id: string }
    const sp      = request.nextUrl.searchParams
    const page    = Math.max(0, Number(sp.get('page') ?? 0))
    const size    = Math.min(100, Math.max(1, Number(sp.get('size') ?? 20)))
    const start   = sp.get('startDate')
    const end     = sp.get('endDate')

    let where = 'WHERE e.org_id = ?'
    const params: unknown[] = [profile.org_id]

    if (user.role === 'BUSINESS') {
      where += ` AND e.category IN (${[...BUSINESS_CATS].map(() => '?').join(',')})`
      params.push(...BUSINESS_CATS)
    } else if (user.role === 'PERSONAL') {
      where += ` AND e.category IN (${[...PERSONAL_CATS].map(() => '?').join(',')})`
      params.push(...PERSONAL_CATS)
    }

    if (start) { where += ' AND e.expense_date >= ?'; params.push(start) }
    if (end)   { where += ' AND e.expense_date <= ?'; params.push(end)   }

    const total = (db.prepare(`SELECT COUNT(*) as n FROM expense e ${where}`).get(...params) as { n: number }).n
    const rows  = db.prepare(`
      SELECT e.*, p.name as created_by_name FROM expense e
      LEFT JOIN profile p ON p.id = e.created_by
      ${where}
      ORDER BY e.expense_date DESC
      LIMIT ? OFFSET ?
    `).all(...params, size, page * size) as Record<string, unknown>[]

    return Response.json({
      content: rows.map((r) => ({
        id:          r.id,
        orgId:       r.org_id,
        tripId:      r.trip_id ?? null,
        amount:      fromDb(r.amount as number),
        category:    r.category,
        expenseDate: r.expense_date,
        notes:       r.notes,
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
    const user    = await requireAuth(request)
    const profile = db.prepare('SELECT id, org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { id: string; org_id: string }
    const body    = await request.json()

    if (!body.amount || !body.category || !body.expenseDate) {
      return Response.json({ message: 'amount, category, and expenseDate are required' }, { status: 400 })
    }

    // Validate that business expenses must have a tripId
    if (BUSINESS_CATS.has(body.category) && (!body.tripId || body.tripId.trim() === '')) {
      return Response.json({ message: 'tripId is required for business expenses' }, { status: 400 })
    }

    const id = newId()
    db.prepare(`
      INSERT INTO expense (id, org_id, trip_id, amount, category, expense_date, notes, created_by, updated_by, created_at, updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,datetime('now'),datetime('now'))
    `).run(id, profile.org_id, body.tripId ?? null, toDb(body.amount), body.category, body.expenseDate, body.notes ?? '', profile.id, profile.id)

    const row = db.prepare(`
      SELECT e.*, p.name as created_by_name FROM expense e
      LEFT JOIN profile p ON p.id = e.created_by WHERE e.id = ?
    `).get(id) as Record<string, unknown>

    return Response.json({
      id: row.id, orgId: row.org_id, tripId: row.trip_id ?? null,
      amount: fromDb(row.amount as number), category: row.category,
      expenseDate: row.expense_date, notes: row.notes, createdBy: row.created_by_name,
    }, { status: 201 })
  } catch (err) {
    return authErrorResponse(err)
  }
}
