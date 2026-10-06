'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { setAuth, getAuth, clearAuth, type AuthState, type UserRole } from '@/lib/auth'
import { login as apiLogin, logout as apiLogout } from '@/lib/api'

// Navigation via window.location avoids useRouter() at component mount time,
// which would block Next.js 16 prerendering.
function redirect(path: string) {
  if (typeof window !== 'undefined') {
    window.location.href = path
  }
}

interface AuthContextValue {
  user: AuthState | null
  role: UserRole | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]         = useState<AuthState | null>(null)
  const [isLoading, setLoading] = useState(true)

  // Rehydrate from sessionStorage on mount (client-only)
  useEffect(() => {
    const stored = getAuth()
    if (stored) setUser(stored)
    setLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiLogin(email, password)
    const state: AuthState = {
      accessToken: data.accessToken,
      role: data.role as UserRole,
      name: data.name,
    }
    setAuth(state)
    setUser(state)
    // Non-HttpOnly hint cookie for the proxy to read
    document.cookie = `brook_role=${data.role}; path=/; SameSite=Lax`

    if (data.role === 'ADMIN')         redirect('/admin/dashboard')
    else if (data.role === 'BUSINESS') redirect('/business')
    else                               redirect('/personal')
  }, [])

  const logout = useCallback(async () => {
    await apiLogout()
    clearAuth()
    setUser(null)
    document.cookie = 'brook_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    redirect('/login')
  }, [])

  return (
    <AuthContext.Provider value={{ user, role: user?.role ?? null, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
