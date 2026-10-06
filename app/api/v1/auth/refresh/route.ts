import { type NextRequest } from 'next/server'
import { db, newId } from '@/lib/db'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') ?? ''
    const tokenMatch   = cookieHeader.match(/refresh_token=([^;]+)/)
    const rawToken     = tokenMatch?.[1]

    if (!rawToken) {
      return Response.json({ message: 'No refresh token' }, { status: 401 })
    }

    // Verify signature + expiry
    let payload: Awaited<ReturnType<typeof verifyRefreshToken>>
    try {
      payload = await verifyRefreshToken(rawToken)
    } catch {
      return Response.json({ message: 'Invalid refresh token' }, { status: 401 })
    }

    // Check DB record exists
    const stored = db.prepare('SELECT * FROM refresh_token WHERE id = ? AND token = ?')
      .get(payload.jti, rawToken) as { id: string; auth_user_id: string } | undefined

    if (!stored) {
      return Response.json({ message: 'Refresh token revoked' }, { status: 401 })
    }

    // Load user info
    const row = db.prepare(`
      SELECT au.id, ur.role, p.name
      FROM auth_user au
      JOIN user_role ur ON ur.id = au.role_id
      JOIN profile p ON p.auth_user_id = au.id
      WHERE au.id = ?
    `).get(stored.auth_user_id) as { id: string; role: string; name: string } | undefined

    if (!row) {
      return Response.json({ message: 'User not found' }, { status: 401 })
    }

    // Rotate: delete old, issue new
    db.prepare('DELETE FROM refresh_token WHERE id = ?').run(stored.id)

    const newRefreshId    = newId()
    const newRefreshToken = await signRefreshToken(row.id, newRefreshId)
    const expiry          = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    db.prepare(`
      INSERT INTO refresh_token (id, auth_user_id, token, expiry, created_at)
      VALUES (?, ?, ?, ?, datetime('now'))
    `).run(newRefreshId, row.id, newRefreshToken, expiry)

    const accessToken = await signAccessToken({ sub: row.id, role: row.role, name: row.name })

    const res = Response.json({ accessToken })
    res.headers.set(
      'Set-Cookie',
      `refresh_token=${newRefreshToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`
    )
    return res
  } catch (err) {
    console.error('[refresh]', err)
    return Response.json({ message: 'Internal server error' }, { status: 500 })
  }
}
