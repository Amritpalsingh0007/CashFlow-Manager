import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // Check DB connectivity
    const result = db.prepare('SELECT 1 as healthy').get() as { healthy: number }
    if (result && result.healthy === 1) {
      return NextResponse.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        database: 'connected',
      })
    }
    return NextResponse.json(
      { status: 'DOWN', database: 'unhealthy' },
      { status: 503 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'DOWN',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
