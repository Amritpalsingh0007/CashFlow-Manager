import { type NextRequest } from 'next/server'
import { db, newId } from '@/lib/db'
import { requireRole, authErrorResponse } from '@/lib/apiAuth'

export async function GET(request: NextRequest) {
  try {
    const user    = await requireRole(request, 'ADMIN')
    const profile = db.prepare('SELECT org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { org_id: string }
    const trucks = db.prepare('SELECT id, reg_number as regNumber, model FROM truck WHERE org_id = ? ORDER BY created_at DESC').all(profile.org_id)
    return Response.json(trucks)
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user    = await requireRole(request, 'ADMIN')
    const profile = db.prepare('SELECT org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { org_id: string }

    const body = await request.json()
    const { regNumber, model } = body

    if (!regNumber) {
      return Response.json({ message: 'Registration number is required' }, { status: 400 })
    }

    const id = newId()
    const now = new Date().toISOString()

    db.prepare(`
      INSERT INTO truck (id, org_id, reg_number, model, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, profile.org_id, regNumber, model ?? null, now)

    const truck = db.prepare('SELECT id, reg_number as regNumber, model FROM truck WHERE id = ?').get(id)
    return Response.json(truck, { status: 201 })
  } catch (err) {
    return authErrorResponse(err)
  }
}
