import 'server-only'

import type { CDPSession } from 'playwright-core'
import { resolvePublicHost, type ScreenshotResolver } from './dns'
import { ScreenshotError } from './errors'
import { classifyScreenshotReason } from './diagnostics'
import { createScreenshotPolicy } from './policy'

const allowedTypes = new Set(['Document', 'Script', 'Stylesheet', 'Image', 'Font'])
const redirectStatuses = new Set([301, 302, 303, 307, 308])
// Adds restrictions; never relaxes a site's own CSP. Preventing child frames
// and workers also prevents separately attached targets escaping page CDP.
const isolationCsp = "frame-src 'none'; child-src 'none'; worker-src 'none'; object-src 'none'; connect-src 'none'; form-action 'none'"

export async function installScreenshotNetwork(session: CDPSession, policy: ReturnType<typeof createScreenshotPolicy>, approved: Set<string>, signal: AbortSignal, onFatal: (error: ScreenshotError) => void, resolve?: ScreenshotResolver) {
  const { frameTree } = await session.send('Page.getFrameTree')
  const mainFrame = frameTree.frame.id
  const depths = new Map<string, number>()
  const documents = new Set<string>()
  let count = 0
  session.on('Network.requestWillBeSent', event => {
    if (event.type === 'Document' && event.frameId === mainFrame) documents.add(event.requestId)
  })
  session.on('Network.loadingFailed', event => {
    if (documents.delete(event.requestId) && event.errorText !== 'net::ERR_BLOCKED_BY_CLIENT') {
      onFatal(new ScreenshotError('unavailable', 'navigation', classifyScreenshotReason(new Error(event.errorText), 'MAIN_DOCUMENT_REQUEST_FAILED')))
    }
  })
  session.on('Network.loadingFinished', event => { documents.delete(event.requestId) })
  session.on('Fetch.requestPaused', event => {
    void (async () => {
      const mainDocument = event.resourceType === 'Document' && event.frameId === mainFrame
      let step: 'request' | 'response' | 'redirect' = 'request'
      try {
        signal.throwIfAborted()
        if (++count > 1000 || !allowedTypes.has(event.resourceType) || event.request.method !== 'GET'
          || (event.resourceType === 'Document' && !mainDocument)) throw new ScreenshotError('unsafe')
        const url = policy.resource(event.request.url, approved)
        // Script-initiated navigation is also a new screenshot target; an
        // approved asset CDN must never become the main document implicitly.
        if (mainDocument) policy.target(url.href)
        const depth = event.redirectedRequestId ? (depths.get(event.redirectedRequestId) ?? 0) + 1 : depths.get(event.requestId) ?? 0
        if (depth > 5) throw new ScreenshotError('redirect')
        depths.set(event.requestId, depth)
        if (event.responseStatusCode === undefined && !event.responseErrorReason) {
          // No route.fetch: all browser requests continue through the proxy.
          await session.send('Fetch.continueRequest', { requestId: event.requestId })
          return
        }
        step = 'response'
        if (event.responseErrorReason) {
          // The network request has ALREADY failed (e.g. certificate error).
          // Let Chromium deliver its original failure to loadingFailed/goto;
          // failRequest here would replace it with ERR_BLOCKED_BY_CLIENT and
          // hide the TLS/proxy cause. This never retries or bypasses the proxy.
          await session.send('Fetch.continueRequest', { requestId: event.requestId })
          return
        }
        const headers = event.responseHeaders ?? []
        if (redirectStatuses.has(event.responseStatusCode!)) {
          step = 'redirect'
          const location = headers.find(header => header.name.toLowerCase() === 'location')?.value
          if (!location || depth >= 5) throw new ScreenshotError('redirect')
          let destination: URL
          try { destination = new URL(location, url) } catch { throw new ScreenshotError('redirect') }
          try {
            if (mainDocument) policy.target(destination.href)
            else policy.resource(destination.href, approved)
            await resolvePublicHost(destination.hostname, signal, resolve)
          } catch { throw new ScreenshotError('redirect') }
          // This host is approved only after inspecting the redirect while the
          // response is paused, before Chromium can follow it or CONNECT.
          approved.add(destination.hostname)
        } else if (mainDocument) {
          if (event.responseStatusCode! >= 400) throw new ScreenshotError('unavailable', 'navigation', 'MAIN_DOCUMENT_HTTP_ERROR', event.responseStatusCode)
          if (!headers.some(header => header.name.toLowerCase() === 'content-type' && /^text\/html\b/i.test(header.value))
            || headers.some(header => header.name.toLowerCase() === 'content-disposition' && /attachment/i.test(header.value))) throw new ScreenshotError('unavailable', 'navigation', 'MAIN_DOCUMENT_INVALID_CONTENT')
        }
        await session.send('Fetch.continueResponse', {
          requestId: event.requestId,
          responseCode: event.responseStatusCode!,
          // HTTP/2 has no reason phrase: CDP reports an empty status text.
          // Passing it explicitly is invalid. Omit this optional parameter so
          // Chromium selects its standard phrase; status/headers/body remain.
          responseHeaders: mainDocument && !redirectStatuses.has(event.responseStatusCode!)
            ? [...headers, { name: 'Content-Security-Policy', value: isolationCsp }] : headers,
        })
      } catch (error) {
        if (mainDocument) {
          const fallback = step === 'redirect' ? 'REDIRECT_REJECTED' : step === 'response' ? 'RESPONSE_INTERCEPTION_FAILED' : 'REQUEST_INTERCEPTION_FAILED'
          const reason = classifyScreenshotReason(error, fallback)
          onFatal(error instanceof ScreenshotError
            ? new ScreenshotError(error.code, error.stage ?? (step === 'redirect' ? 'redirect' : 'navigation'), reason, error.httpStatus)
            : new ScreenshotError('unavailable', 'navigation', reason))
        }
        try { await session.send('Fetch.failRequest', { requestId: event.requestId, errorReason: 'BlockedByClient' }) } catch { /* Target closed during cleanup. */ }
      }
    })()
  })
  session.on('Fetch.authRequired', event => {
    void session.send('Fetch.continueWithAuth', { requestId: event.requestId, authChallengeResponse: { response: 'CancelAuth' } }).catch(() => {})
  })
  await session.send('Network.enable')
  await session.send('Network.setBlockedURLs', { urls: ['http://*', 'ws://*', 'wss://*', 'file://*', 'ftp://*'] })
  // One CDP interception layer at both stages; Playwright routing alone does
  // not intercept every redirect. Never combine competing Fetch handlers.
  await session.send('Fetch.enable', { handleAuthRequests: true, patterns: [
    { urlPattern: '*', requestStage: 'Request' }, { urlPattern: '*', requestStage: 'Response' },
  ] })
}
