import type { NextConfig } from 'next'

const staticProjects = [
  'livestopair',
  'pagesmaxair',
  'worksallsday',
  'pathstopnow',
  'wordsmaxlab',
]

const nextConfig: NextConfig = {
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
