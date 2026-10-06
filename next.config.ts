import type { NextConfig } from 'next'

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
}

export default nextConfig
