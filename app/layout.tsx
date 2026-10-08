import { Suspense } from 'react'
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/context/AuthContext'
import RegisterSW from './register-sw'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Brook — Cashflow Manager',
  description: 'Separate business and personal finances for your transport business.',
  icons: [
    {
      url: '/icons/icon-192.png',
      sizes: '192x192',
      type: 'image/png'
    },
    {
      url: '/icons/icon-512.png',
      sizes: '512x512',
      type: 'image/png'
    }
  ]
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        {/*
          Wrap AuthProvider in Suspense so Next.js 16 can prerender
          the outer shell without blocking on client state initialisation.
        */}
        <Suspense>
          <AuthProvider>{children}</AuthProvider>
        </Suspense>
      </body>
    </html>
  )
}
