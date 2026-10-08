// Real CMS only. No Supabase client, AI action, or persistence endpoint.
const maximumBytes = 2 * 1024 * 1024
class ScreenshotClientError extends Error {}

export function screenshotEligibility(input: string) {
  if (!input) return 'No Production URL imported. Choose a preview file.'
  try {
    const url = new URL(input)
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return 'Use a supported HTTPS Production URL or choose a preview file.'
    if (!['vercel.app', 'netlify.app', 'pages.dev', 'github.io'].some(suffix => url.hostname.endsWith('.' + suffix))) return 'Automatic previews support Vercel, Netlify, Cloudflare Pages and GitHub Pages. Choose a file for this site.'
    return null
  } catch { return 'Enter a valid HTTPS Production URL or choose a preview file.' }
}

export async function requestScreenshot(productionUrl: string, signal: AbortSignal): Promise<File> {
  try { return await fetchScreenshot(productionUrl, signal) } catch (error) {
    if (error instanceof ScreenshotClientError) throw error
    throw new ScreenshotClientError('Unable to capture this site. The current preview is unchanged.')
  }
}

async function fetchScreenshot(productionUrl: string, signal: AbortSignal): Promise<File> {
  const response = await fetch('/admin/screenshot', {
    method: 'POST', credentials: 'same-origin', redirect: 'error', cache: 'no-store',
    headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productionUrl }), signal,
  })
  if (!response.ok) {
    // Only display the route's small normalized JSON message; never render
    // redirected login HTML, browser diagnostics or arbitrary response bodies.
    let message = 'Unable to capture this site. The current preview is unchanged.'
    if (response.headers.get('content-type')?.startsWith('application/json')) {
      const text = await readBounded(response, 4096)
      try {
        const error: unknown = JSON.parse(new TextDecoder().decode(text))
        if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string' && error.message.length <= 250) message = error.message
      } catch { /* Safe default. */ }
    }
    throw new ScreenshotClientError(message)
  }
  if (response.headers.get('content-type') !== 'image/jpeg') throw new ScreenshotClientError('Unable to read the screenshot. The current preview is unchanged.')
  const bytes = await readBounded(response, maximumBytes)
  return new File([new Uint8Array(bytes)], 'project-screenshot.jpg', { type: 'image/jpeg' })
}

async function readBounded(response: Response, maximum: number) {
  if (Number(response.headers.get('content-length')) > maximum || !response.body) throw new ScreenshotClientError('The screenshot response is unavailable.')
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      size += next.value.length
      if (size > maximum) throw new ScreenshotClientError('The screenshot response is too large.')
      chunks.push(next.value)
    }
  } finally { await reader.cancel().catch(() => {}) }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return bytes
}
