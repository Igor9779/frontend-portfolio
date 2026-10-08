import type { NextConfig } from 'next'

const staticProjects = [
  'livestopair',
  'pagesmaxair',
  'worksallsday',
  'pathstopnow',
  'wordsmaxlab',
]

const nextConfig: NextConfig = {
  // Keep package-relative runtime lookups intact in both production bundlers.
  serverExternalPackages: ['@sparticuz/chromium', 'playwright-core'],
  outputFileTracingIncludes: {
    '/admin/screenshot': [
      'node_modules/@sparticuz/chromium/bin/**',
      // Turbopack misses Playwright's computed require(packageRoot/browsers.json).
      // The registry is required during import, even with an explicit executable.
      'node_modules/playwright-core/browsers.json',
    ],
  },
  experimental: {
    // Allow one 5 MiB preview plus the bounded form fields/multipart envelope.
    serverActions: { bodySizeLimit: '6mb' },
  },
  // Preserve directory URLs so each demo's relative assets and links resolve.
  skipTrailingSlashRedirect: true,
  async headers() {
    return [{
      // Checked before pages/public files and the legacy project rewrites.
      source: '/:path*',
      headers: [
        // Framing protection only: preserve inline scripts/styles, external
        // demo resources and local/blob preview images.
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    }]
  },
  async rewrites() {
    return staticProjects.map((project) => ({
      source: `/projects/${project}/`,
      destination: `/projects/${project}/index.html`,
    }))
  },
}

export default nextConfig
