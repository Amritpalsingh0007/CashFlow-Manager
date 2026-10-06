/**
 * Generic upstream proxy helper.
 * Forwards the request to Spring Boot, falling back to mock data when
 * the backend is unavailable (for local dev without a running JVM).
 */
import { type NextRequest } from 'next/server'

export const BACKEND = process.env.BACKEND_URL ?? 'http://localhost:8080'

export async function proxyOrMock<T>(
  request: NextRequest,
  backendPath: string,
  mockFn: (request: NextRequest) => Promise<Response> | Response
): Promise<Response> {
  try {
    const url = `${BACKEND}${backendPath}${request.nextUrl.search}`
    const headers: Record<string, string> = {}

    const auth = request.headers.get('authorization')
    if (auth) headers['Authorization'] = auth
    const ct = request.headers.get('content-type')
    if (ct) headers['Content-Type'] = ct

    const hasBody = ['POST', 'PUT', 'PATCH'].includes(request.method)

    const upstream = await fetch(url, {
      method: request.method,
      headers,
      body: hasBody ? await request.text() : undefined,
    })

    const text = await upstream.text()
    let data: unknown
    try { data = JSON.parse(text) } catch { data = text }

    return Response.json(data, { status: upstream.status })
  } catch {
    return mockFn(request)
  }
}
