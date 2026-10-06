/**
 * JWT helpers using `jose` — runs in both Node.js and Edge runtimes.
 *
 * Access token:  HS256, 15-minute TTL, carries sub + role + name
 * Refresh token: HS256, 7-day TTL, carries sub only (stored in DB too)
 */

import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

const secret = () =>
  new TextEncoder().encode(
    process.env.JWT_SECRET ?? 'brook-dev-secret-change-in-production-32chars'
  )

const ACCESS_TTL  = '15m'
const REFRESH_TTL = '7d'

export interface AccessTokenPayload extends JWTPayload {
  sub: string   // auth_user.id
  role: string
  name: string
}

export interface RefreshTokenPayload extends JWTPayload {
  sub: string   // auth_user.id
  jti: string   // refresh_token.id (for rotation / revocation)
}

export async function signAccessToken(payload: Omit<AccessTokenPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(secret())
}

export async function signRefreshToken(sub: string, jti: string): Promise<string> {
  return new SignJWT({ sub, jti })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TTL)
    .sign(secret())
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, secret())
  return payload as AccessTokenPayload
}

export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, secret())
  return payload as RefreshTokenPayload
}

/** Non-throwing variant — returns null on invalid/expired */
export async function safeVerifyAccess(token: string): Promise<AccessTokenPayload | null> {
  try { return await verifyAccessToken(token) } catch { return null }
}
