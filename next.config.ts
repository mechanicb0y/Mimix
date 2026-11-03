import type { NextConfig } from 'next'
import { securityHeaders } from './src/config/security-headers'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // The bundled ffmpeg binary must be copied into the server functions that run it (src/server/audio.ts).
  serverExternalPackages: ['ffmpeg-static'],
  outputFileTracingIncludes: { '/api/**': ['./node_modules/ffmpeg-static/ffmpeg'] },
  // Common guesses for the auth pages.
  async redirects() {
    return [
      { source: '/signup', destination: '/sign-up', permanent: true },
      { source: '/login', destination: '/sign-in', permanent: true },
      { source: '/signin', destination: '/sign-in', permanent: true },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders({ dev: process.env.NODE_ENV !== 'production', sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN }),
      },
      {
        // The service worker must never be served stale, or fixes to it would take days to reach people.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        ],
      },
    ]
  },
}

export default nextConfig
