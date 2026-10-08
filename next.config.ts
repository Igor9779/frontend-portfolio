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
  async rewrites() {
    return staticProjects.map((project) => ({
      source: `/projects/${project}/`,
      destination: `/projects/${project}/index.html`,
    }))
  },
}

export default nextConfig
