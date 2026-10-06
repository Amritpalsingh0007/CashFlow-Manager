/**
 * Server-side auth helpers for Route Handlers.
 * Extracts and verifies the JWT from the Authorization header.
 */

import { type NextRequest } from 'next/server'
import { safeVerifyAccess, type AccessTokenPayload } from './jwt'

export async function getRequestUser(req: NextRequest): Promise<AccessTokenPayload | null> {
  const auth = req.headers.get('authorization') ?? ''
  if (!auth.startsWith('Bearer ')) return null
  return safeVerifyAccess(auth.slice(7))
}

export async function requireAuth(req: NextRequest): Promise<AccessTokenPayload> {
  const user = await getRequestUser(req)
  if (!user) throw new AuthError(401, 'Unauthorized')
  return user
}

export async function requireRole(req: NextRequest, ...roles: string[]): Promise<AccessTokenPayload> {
  const user = await requireAuth(req)
  if (!roles.includes(user.role)) throw new AuthError(403, 'Forbidden')
  return user
}

export class AuthError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export function authErrorResponse(err: unknown): Response {
  if (err instanceof AuthError) {
    return Response.json({ message: err.message }, { status: err.status })
  }
  return Response.json({ message: 'Internal Server Error' }, { status: 500 })
}
