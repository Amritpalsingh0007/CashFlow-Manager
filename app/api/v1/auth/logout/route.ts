import { type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { verifyRefreshToken } from '@/lib/jwt'

export async function POST(request: NextRequest) {
  try {
    const cookieHeader = request.headers.get('cookie') ?? ''
    const tokenMatch   = cookieHeader.match(/refresh_token=([^;]+)/)
    const rawToken     = tokenMatch?.[1]

    if (rawToken) {
      try {
        const payload = await verifyRefreshToken(rawToken)
        db.prepare('DELETE FROM refresh_token WHERE id = ?').run(payload.jti)
      } catch { /* token may already be invalid — that's fine */ }
    }

    const res = Response.json({ message: 'Logged out successfully' })
    res.headers.set(
      'Set-Cookie',
      'refresh_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0'
    )
    return res
  } catch (err) {
    console.error('[logout]', err)
    return Response.json({ message: 'Internal server error' }, { status: 500 })
  }
}
