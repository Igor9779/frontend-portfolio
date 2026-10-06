import type { NextConfig } from 'next'

const staticProjects = [
  'livestopair',
  'pagesmaxair',
  'worksallsday',
  'pathstopnow',
  'wordsmaxlab',
]

const nextConfig: NextConfig = {
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
