import { Suspense } from 'react'
import { connection } from 'next/server'
import { TripDetailClient } from './TripDetailClient'

// This is a dynamic route — mark it as request-time only so Next.js 16
// does not attempt to prerender it (which would fail due to auth context).
export default async function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await connection()
  const { id } = await params

  return (
    <Suspense
      fallback={
        <p style={{ color: 'var(--color-mute)', fontSize: 14 }}>Loading…</p>
      }
    >
      <TripDetailClient id={id} />
    </Suspense>
  )
}
