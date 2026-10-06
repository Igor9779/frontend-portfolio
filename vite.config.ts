import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const staticProjectDirectories: Plugin = {
  name: 'static-project-directories',
  configureServer(server) {
    // Vite's dev server needs explicit index files for public HTML directories.
    server.middlewares.use((request, _response, next) => {
      const [pathname, query] = request.url?.split('?', 2) ?? []
      const path = pathname?.startsWith(server.config.base)
        ? pathname.slice(server.config.base.length)
        : ''

      if (
        /^projects\/(livestopair|pagesmaxair|worksallsday|pathstopnow|wordsmaxlab)\/$/.test(path)
      ) {
        request.url = `${pathname}index.html${query ? `?${query}` : ''}`
      }

      next()
    })
  },
}

export default defineConfig({
  plugins: [react(), tailwindcss(), staticProjectDirectories],
})
