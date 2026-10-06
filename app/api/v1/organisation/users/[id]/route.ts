import { type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { requireRole, authErrorResponse } from '@/lib/apiAuth'
import bcrypt from 'bcryptjs'

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<'/api/v1/organisation/users/[id]'>
) {
  try {
    const { id } = await ctx.params
    await requireRole(request, 'ADMIN')
    const body = await request.json()

    // id here is a profile id — update profile name/phone and optionally auth_user password
    const profileUpdates: Record<string, unknown> = {}
    if (body.name  !== undefined) profileUpdates.name  = body.name
    if (body.phone !== undefined) profileUpdates.phone = body.phone

    if (Object.keys(profileUpdates).length > 0) {
      const set = Object.keys(profileUpdates).map((k) => `${k} = ?`).join(', ')
      db.prepare(`UPDATE profile SET ${set} WHERE id = ?`).run(...Object.values(profileUpdates), id)
    }

    if (body.password) {
      const hashed = await bcrypt.hash(body.password, 10)
      const authRow = db.prepare('SELECT auth_user_id FROM profile WHERE id = ?').get(id) as { auth_user_id: string } | undefined
      if (authRow) {
        db.prepare('UPDATE auth_user SET password = ? WHERE id = ?').run(hashed, authRow.auth_user_id)
      }
    }

    const updated = db.prepare(`
      SELECT p.id, p.name, p.phone, ur.role
      FROM profile p
      JOIN auth_user au ON au.id = p.auth_user_id
      JOIN user_role ur ON ur.id = au.role_id
      WHERE p.id = ?
    `).get(id)

    return Response.json(updated)
  } catch (err) {
    return authErrorResponse(err)
  }
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<'/api/v1/organisation/users/[id]'>
) {
  try {
    const { id } = await ctx.params
    await requireRole(request, 'ADMIN')

    // Get auth_user_id before deleting profile
    const row = db.prepare('SELECT auth_user_id FROM profile WHERE id = ?').get(id) as { auth_user_id: string } | undefined
    if (!row) return Response.json({ message: 'User not found' }, { status: 404 })

    db.transaction(() => {
      db.prepare('DELETE FROM refresh_token WHERE auth_user_id = ?').run(row.auth_user_id)
      db.prepare('DELETE FROM profile WHERE id = ?').run(id)
      db.prepare('DELETE FROM auth_user WHERE id = ?').run(row.auth_user_id)
    })()

    return new Response(null, { status: 204 })
  } catch (err) {
    return authErrorResponse(err)
  }
}
