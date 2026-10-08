import 'server-only'

import { screenshotFailure, ScreenshotError } from './errors'
import { screenshotDiagnostic, type ScreenshotStage } from './diagnostics'

const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }
function failure(message: string, status: number) { return Response.json({ message }, { status, headers }) }

export async function screenshotResponse(request: Request, dependencies: {
  authorize: () => Promise<unknown>
  capture: (url: string, ownedHosts: string[], signal: AbortSignal) => Promise<Uint8Array>
}) {
  const started = Date.now()
  let stage: ScreenshotStage = 'request'
  // Route layout protection is insufficient. No body/DNS/browser operation
  // occurs before this independently enforced administrator check.
  try { await dependencies.authorize() } catch { return failure('Sign in as an administrator to capture a preview.', 403) }
  const origin = new URL(request.url).origin
  if (request.headers.get('origin') !== origin || (request.headers.has('sec-fetch-site') && request.headers.get('sec-fetch-site') !== 'same-origin')) return failure('This request is unavailable.', 403)
  if (!/^application\/json(?:;|$)/i.test(request.headers.get('content-type') ?? '')) return failure('Enter a valid Production URL.', 400)
  try {
    if (Number(request.headers.get('content-length')) > 4096 || !request.body) throw new ScreenshotError('invalid')
    const reader = request.body.getReader()
    const bodyDeadline = AbortSignal.any([request.signal, AbortSignal.timeout(3000)])
    const bodyTimeout = new Promise<never>((_resolve, reject) => {
      bodyDeadline.addEventListener('abort', () => reject(new ScreenshotError('invalid')), { once: true })
      if (bodyDeadline.aborted) reject(new ScreenshotError('invalid'))
    })
    let text = '', length = 0
    const decoder = new TextDecoder('utf-8', { fatal: true })
    try {
      while (true) {
        const next = await Promise.race([reader.read(), bodyTimeout])
        if (next.done) break
        length += next.value.length
        if (length > 4096) throw new ScreenshotError('invalid')
        text += decoder.decode(next.value, { stream: true })
      }
      text += decoder.decode()
    } finally { await reader.cancel().catch(() => {}) }
    let payload: unknown
    try { payload = JSON.parse(text) } catch { throw new ScreenshotError('invalid') }
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || Object.keys(payload).length !== 1
      || !('productionUrl' in payload) || typeof payload.productionUrl !== 'string') throw new ScreenshotError('invalid')
    const ownedHosts = [new URL(origin).hostname, ...['VERCEL_URL', 'VERCEL_PROJECT_PRODUCTION_URL', 'VERCEL_BRANCH_URL'].flatMap(name => {
      const value = process.env[name]
      if (!value) return []
      try { return [new URL('https://' + value).hostname] } catch { return [] }
    })]
    const captureSignal = AbortSignal.any([request.signal, AbortSignal.timeout(Math.max(1, 55_000 - (Date.now() - started)))])
    stage = 'response'
    const bytes = await dependencies.capture(payload.productionUrl, ownedHosts, captureSignal)
    if (bytes.byteLength > 2 * 1024 * 1024) throw new ScreenshotError('too-large')
    return new Response(new Uint8Array(bytes), { headers: { ...headers, 'Content-Type': 'image/jpeg', 'Content-Length': String(bytes.byteLength) } })
  } catch (error) {
    const safe = screenshotFailure(error)
    // Capture logs its own precise stages; log request/import/response errors
    // here only when they have not already been categorized inside capture.
    if (stage === 'request' || !(error instanceof ScreenshotError) || error.stage === 'module-load' || safe.code === 'too-large') {
      screenshotDiagnostic(error instanceof ScreenshotError ? error.stage ?? stage : stage, safe.code, error)
    }
    return failure(safe.message, safe.code === 'timeout' ? 504 : safe.code === 'busy' ? 429
      : ['invalid', 'unsafe', 'unsupported', 'redirect'].includes(safe.code) ? 422 : 502)
  }
}
