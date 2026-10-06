import { NextRequest, NextResponse } from 'next/server'

// Routes that don't require authentication
const PUBLIC_PATHS = ['/login', '/api/v1/auth/login', '/api/v1/auth/refresh']

// Role → allowed path prefixes
const ROLE_PATHS: Record<string, string[]> = {
  ADMIN:    ['/admin'],
  BUSINESS: ['/business'],
  PERSONAL: ['/personal'],
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public paths and Next.js internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next()
  }

  // Allow API proxy routes — they validate the Bearer token themselves
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // For page routes: redirect to login if no role cookie is present
  const roleCookie = request.cookies.get('brook_role')?.value

  if (!roleCookie) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Root path → redirect to role home
  if (pathname === '/') {
    const home = ROLE_PATHS[roleCookie]?.[0] ?? '/login'
    return NextResponse.redirect(new URL(home, request.url))
  }

  // Check the role matches the path
  const allowed = ROLE_PATHS[roleCookie] ?? []
  const onAllowedPath = allowed.some((p) => pathname.startsWith(p))

  if (!onAllowedPath) {
    const home = allowed[0] ?? '/login'
    return NextResponse.redirect(new URL(home, request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
