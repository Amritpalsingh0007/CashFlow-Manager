import type { NextConfig } from 'next'
import withSerwistInit from '@serwist/next'

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
  // better-sqlite3 is a native Node.js addon — must not be bundled by webpack
  serverExternalPackages: ['better-sqlite3', 'bcryptjs'],
  // Ensure the DB file is not treated as a static asset
  output: 'standalone',
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  reactStrictMode: true,
  // Image optimization
  images: {
    remotePatterns: [],
    formats: ['image/avif', 'image/webp'],
  },
}

// Configure Serwist for PWA (only in production)
const withSerwistConfig = withSerwistInit({
  swSrc: 'app/sw.ts',
  swDest: 'public/sw.js',
  reloadOnOnline: true,
  // Note: offlinePage is handled via route, not precacheEntries
  precacheEntries: [
    { url: '/', revision: '1' },
    { url: '/manifest.json', revision: '1' },
    { url: '/icons/icon-192.png', revision: '1' },
    { url: '/icons/icon-512.png', revision: '1' }
  ],
  skipWaiting: true,
  clientsClaim: true,
  disable: process.env.NODE_ENV !== 'production',
})

export default withSerwistConfig(nextConfig)