import { type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { db, newId } from '@/lib/db'
import { signAccessToken, signRefreshToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return Response.json({ message: 'Email and password are required' }, { status: 400 })
    }

    // Find auth user + role + profile name
    const row = db.prepare(`
      SELECT au.id, au.email, au.password, ur.role, p.name, p.id as profile_id
      FROM auth_user au
      JOIN user_role ur ON ur.id = au.role_id
      JOIN profile p ON p.auth_user_id = au.id
      WHERE au.email = ?
    `).get(email) as { id: string; email: string; password: string; role: string; name: string; profile_id: string } | undefined

    if (!row) {
      return Response.json({ message: 'Invalid email or password' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, row.password)
    if (!valid) {
      return Response.json({ message: 'Invalid email or password' }, { status: 401 })
    }

    // Issue tokens
    const accessToken = await signAccessToken({ sub: row.id, role: row.role, name: row.name })

    const refreshId    = newId()
    const refreshToken = await signRefreshToken(row.id, refreshId)
    const expiry       = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    // Store refresh token
    db.prepare(`
      INSERT INTO refresh_token (id, auth_user_id, token, expiry, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(refreshId, row.id, refreshToken, expiry)

    const res = Response.json({ accessToken, role: row.role, name: row.name })
    res.headers.set(
      'Set-Cookie',
      `refresh_token=${refreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    )
    return res
  } catch (err) {
    console.error('[login]', err)
    return Response.json({ message: 'Internal server error' }, { status: 500 })
  }
}
