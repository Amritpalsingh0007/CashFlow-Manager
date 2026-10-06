/**
 * Auth utilities — JWT access token stored in memory (module-level),
 * role + name cached alongside it. Refresh token lives in HttpOnly
 * cookie managed by the backend.
 */

export type UserRole = 'ADMIN' | 'BUSINESS' | 'PERSONAL'

export interface AuthState {
  accessToken: string
  role: UserRole
  name: string
}

// Module-level in-memory store (survives re-renders, clears on tab close)
let _auth: AuthState | null = null

export function setAuth(state: AuthState) {
  _auth = state
  // Also persist to sessionStorage so page refreshes within the tab work
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('brook_auth', JSON.stringify(state))
  }
}

export function getAuth(): AuthState | null {
  if (_auth) return _auth
  if (typeof window !== 'undefined') {
    const raw = sessionStorage.getItem('brook_auth')
    if (raw) {
      try {
        _auth = JSON.parse(raw) as AuthState
        return _auth
      } catch {
        return null
      }
    }
  }
  return null
}

export function clearAuth() {
  _auth = null
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem('brook_auth')
  }
}

export function getAccessToken(): string | null {
  return getAuth()?.accessToken ?? null
}

export function getRole(): UserRole | null {
  return getAuth()?.role ?? null
}

export function isAdmin(): boolean {
  return getRole() === 'ADMIN'
}

/** Decode the expiry from a JWT without verifying the signature */
export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}
