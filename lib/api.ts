/**
 * Typed API client — all calls go through Next.js Route Handlers
 * (/api/v1/...) which proxy to Spring Boot. The client transparently
 * refreshes the access token when it receives a 401.
 */

import { getAuth, setAuth, clearAuth, isTokenExpired } from './auth'

const BASE = '/api/v1'

async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      credentials: 'include', // sends the HttpOnly refresh cookie
    })

    // If we get a 401, the refresh token is invalid/unavailable, so clear auth state
    if (res.status === 401) {
      clearAuth()
      return null
    }

    // For other non-2xx statuses, don't clear auth state (might be transient server error)
    if (!res.ok) {
      return null
    }

    const data = await res.json()
    const current = getAuth()
    if (current) {
      setAuth({ ...current, accessToken: data.accessToken })
    }
    return data.accessToken as string
  } catch {
    // For network errors or JSON parsing errors, don't clear auth state
    // as these are likely transient issues
    return null
  }
}

async function getValidToken(): Promise<string | null> {
  let auth = getAuth()
  if (!auth) return null
  if (isTokenExpired(auth.accessToken)) {
    return refreshAccessToken()
  }
  return auth.accessToken
}

type FetchOptions = Omit<RequestInit, 'headers'> & {
  headers?: Record<string, string>
  skipAuth?: boolean
}

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { skipAuth = false, headers = {}, ...rest } = options

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  }

  if (!skipAuth) {
    const token = await getValidToken()
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  const url = path.startsWith('http') ? path : `${BASE}${path}`

  const res = await fetch(url, {
    ...rest,
    credentials: 'include',
    headers: reqHeaders,
  })

  if (!res.ok) {
    let message = `Request failed: ${res.status}`
    try {
      const err = await res.json()
      message = err.message ?? message
    } catch { /* ignore */ }
    throw new Error(message)
  }

  // Handle empty responses (204 No Content, DELETE etc.)
  const ct = res.headers.get('Content-Type') ?? ''
  if (!ct.includes('application/json')) return undefined as T

  return res.json() as Promise<T>
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginResponse {
  accessToken: string
  role: string
  name: string
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ email, password }),
  })
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' }).catch(() => {})
  clearAuth()
}

// ─── Trips ───────────────────────────────────────────────────────────────────

export interface Trip {
  id: string
  brokerName: string
  ratePerTon: number
  agreedWeight: number
  actualWeight?: number
  shortagePenalty?: number
  brokeragePct: number
  status: string
  startDate: string
  endDate?: string
  paymentReceived: boolean
  truckId: string
  createdBy?: string
  updatedBy?: string
}

export interface TripDetail extends Trip {
  payments: Payment[]
  expenses: Expense[]
  summary: {
    totalRevenue: number
    totalExpenses: number
    grossProfit: number
  }
}

export interface Page<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export async function getTrips(params?: {
  page?: number
  size?: number
  startDate?: string
  endDate?: string
}): Promise<Page<Trip>> {
  const q = new URLSearchParams()
  if (params?.page !== undefined) q.set('page', String(params.page))
  if (params?.size !== undefined) q.set('size', String(params.size))
  if (params?.startDate) q.set('startDate', params.startDate)
  if (params?.endDate) q.set('endDate', params.endDate)
  return apiFetch<Page<Trip>>(`/trips?${q}`)
}

export async function getActiveTrips(): Promise<Trip[]> {
  return apiFetch<Trip[]>('/trips/active')
}

export async function getTrip(id: string): Promise<TripDetail> {
  return apiFetch<TripDetail>(`/trips/${id}`)
}

export async function getExpense(id: string): Promise<Expense> {
  return apiFetch<Expense>(`/expenses/${id}`)
}

export async function createTrip(body: Partial<Trip>): Promise<Trip> {
  return apiFetch<Trip>('/trips', { method: 'POST', body: JSON.stringify(body) })
}

export async function patchTrip(id: string, body: Partial<Trip>): Promise<Trip> {
  return apiFetch<Trip>(`/trips/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export async function deleteTrip(id: string): Promise<void> {
  return apiFetch(`/trips/${id}`, { method: 'DELETE' })
}

// ─── Expenses ────────────────────────────────────────────────────────────────

export interface Expense {
  id: string
  orgId?: string
  tripId?: string
  amount: number
  category: string
  expenseDate: string
  notes?: string
  createdBy?: string
}

export async function getExpenses(params?: {
  page?: number
  size?: number
  startDate?: string
  endDate?: string
}): Promise<Page<Expense>> {
  const q = new URLSearchParams()
  if (params?.page !== undefined) q.set('page', String(params.page))
  if (params?.size !== undefined) q.set('size', String(params.size))
  if (params?.startDate) q.set('startDate', params.startDate)
  if (params?.endDate) q.set('endDate', params.endDate)
  return apiFetch<Page<Expense>>(`/expenses?${q}`)
}

export async function createExpense(body: Partial<Expense>): Promise<Expense> {
  return apiFetch<Expense>('/expenses', { method: 'POST', body: JSON.stringify(body) })
}

export async function patchExpense(id: string, body: Partial<Expense>): Promise<Expense> {
  return apiFetch<Expense>(`/expenses/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
}

export async function deleteExpense(id: string): Promise<void> {
  return apiFetch(`/expenses/${id}`, { method: 'DELETE' })
}

// ─── Payments ────────────────────────────────────────────────────────────────

export interface Payment {
  id: string
  tripId: string
  amount: number
  type: 'ADVANCE' | 'FINAL'
  receivedDate: string
  createdBy?: string
}

export async function getTripPayments(tripId: string): Promise<Payment[]> {
  return apiFetch<Payment[]>(`/payments/trip/${tripId}`)
}

export async function getPayment(id: string): Promise<Payment> {
  return apiFetch<Payment>(`/payments/${id}`)
}

export async function getPayments(params?: {
  page?: number
  size?: number
  startDate?: string
  endDate?: string
}): Promise<Page<Payment>> {
  const q = new URLSearchParams()
  if (params?.page !== undefined) q.set('page', String(params.page))
  if (params?.size !== undefined) q.set('size', String(params.size))
  if (params?.startDate) q.set('startDate', params.startDate)
  if (params?.endDate) q.set('endDate', params.endDate)
  return apiFetch<Page<Payment>>(`/payments?${q}`)
}

export async function createPayment(body: Partial<Payment>): Promise<Payment> {
  return apiFetch<Payment>('/payments', { method: 'POST', body: JSON.stringify(body) })
}

export async function patchPayment(id: string, body: Partial<Payment>): Promise<Payment> {
  return apiFetch<Payment>(`/payments/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
}

// ─── Organisation ─────────────────────────────────────────────────────────────

export interface OrgUser {
  id: string
  name: string
  role: string
  phone?: string
}

export async function getOrgUsers(): Promise<OrgUser[]> {
  return apiFetch<OrgUser[]>('/organisation/users')
}

export async function createOrgUser(body: {
  name: string
  phone?: string
  email: string
  password: string
  role: 'BUSINESS' | 'PERSONAL'
}): Promise<OrgUser> {
  return apiFetch<OrgUser>('/organisation/users', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

// ─── Truck ────────────────────────────────────────────────────────────────

export interface Truck {
  id: string
  regNumber: string
  model?: string
}

export async function getTruck(): Promise<Truck[]> {
  try {
    return apiFetch<Truck[]>('/organisation/truck')
  } catch (err) {
    return []
  }
}

export async function createTruck(body: { regNumber: string; model?: string }): Promise<Truck> {
  return apiFetch<Truck>('/organisation/truck', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export async function updateTruck(id: string, body: Partial<{ regNumber: string; model: string }>): Promise<Truck> {
  return apiFetch<Truck>(`/organisation/truck/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}
