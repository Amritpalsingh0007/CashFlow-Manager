import { type NextRequest } from 'next/server'
import { db, newId } from '@/lib/db'
import { requireRole, authErrorResponse } from '@/lib/apiAuth'
import bcrypt from 'bcryptjs'

export async function GET(request: NextRequest) {
  try {
    const user    = await requireRole(request, 'ADMIN')
    const profile = db.prepare('SELECT org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { org_id: string }

    const rows = db.prepare(`
      SELECT p.id, p.name, p.phone, ur.role
      FROM profile p
      JOIN auth_user au ON au.id = p.auth_user_id
      JOIN user_role ur ON ur.id = au.role_id
      WHERE p.org_id = ?
      ORDER BY ur.role, p.name
    `).all(profile.org_id) as { id: string; name: string; phone: string; role: string }[]

    return Response.json(rows)
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user    = await requireRole(request, 'ADMIN')
    const profile = db.prepare('SELECT org_id FROM profile WHERE auth_user_id = ?').get(user.sub) as { org_id: string }
    const body    = await request.json()

    if (!body.name || !body.email || !body.password || !body.role) {
      return Response.json({ message: 'name, email, password, and role are required' }, { status: 400 })
    }
    if (!['BUSINESS', 'PERSONAL'].includes(body.role)) {
      return Response.json({ message: 'role must be BUSINESS or PERSONAL' }, { status: 400 })
    }

    const existing = db.prepare('SELECT id FROM auth_user WHERE email = ?').get(body.email)
    if (existing) {
      return Response.json({ message: 'Email already in use' }, { status: 409 })
    }

    const hashedPw = await bcrypt.hash(body.password, 10)
    const roleRow  = db.prepare('SELECT id FROM user_role WHERE role = ?').get(body.role) as { id: string }
    const authId   = newId()
    const profId   = newId()
    const now      = new Date().toISOString()

    db.transaction(() => {
      db.prepare(`INSERT INTO auth_user (id, email, password, role_id, created_at) VALUES (?,?,?,?,?)`).run(authId, body.email, hashedPw, roleRow.id, now)
      db.prepare(`INSERT INTO profile (id, org_id, auth_user_id, name, phone, created_at) VALUES (?,?,?,?,?,?)`).run(profId, profile.org_id, authId, body.name, body.phone ?? null, now)
    })()

    return Response.json({ id: profId, name: body.name, role: body.role, phone: body.phone ?? null }, { status: 201 })
  } catch (err) {
    return authErrorResponse(err)
  }
}
