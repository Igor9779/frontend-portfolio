import 'server-only'

import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Browser } from 'playwright-core'
import { launchScreenshotBrowser } from './chromium'
import { resolvePublicHost } from './dns'
import { ScreenshotError } from './errors'
import { classifyScreenshotReason, screenshotDiagnostic, type ScreenshotStage } from './diagnostics'
import { installScreenshotNetwork } from './network'
import { createScreenshotPolicy, screenshotAssetHosts } from './policy'
import { startScreenshotProxy } from './proxy'

export const screenshotMaxBytes = 2 * 1024 * 1024
let active = false

// Validate the actual encoder result as well as the requested capture settings.
export function validateScreenshot(bytes: Uint8Array) {
  if (bytes.length > screenshotMaxBytes) throw new ScreenshotError('too-large')
  if (bytes.length < 12 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255
    || bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) throw new ScreenshotError('unavailable')
  let offset = 2
  while (offset + 8 < bytes.length) {
    if (bytes[offset++] !== 255) break
    while (bytes[offset] === 255) offset++
    const marker = bytes[offset++]!
    if (marker === 0xda || marker === 0xd9) break
    const length = bytes[offset]! * 256 + bytes[offset + 1]!
    if (length < 2 || offset + length > bytes.length) break
    if ([0xc0, 0xc1, 0xc2].includes(marker)) {
      const height = bytes[offset + 3]! * 256 + bytes[offset + 4]!
      const width = bytes[offset + 5]! * 256 + bytes[offset + 6]!
      if (width === 1440 && height === 900) return
      break
    }
    offset += length
  }
  throw new ScreenshotError('unavailable')
}

export async function captureWebsite(input: string, ownedHosts: string[], requestSignal?: AbortSignal, dependencies = {
  launch: launchScreenshotBrowser, resolve: resolvePublicHost, proxy: startScreenshotProxy,
  installNetwork: installScreenshotNetwork, deadlineMs: 45_000,
}) {
  const policy = createScreenshotPolicy(ownedHosts)
  let stage: ScreenshotStage = 'url-policy'
  let target: URL
  try { target = policy.target(input) } catch (error) {
    screenshotDiagnostic(stage, error instanceof ScreenshotError ? error.code : 'invalid', error)
    throw error
  }
  if (active) throw new ScreenshotError('busy')
  active = true
  const controller = new AbortController()
  const signal = requestSignal ? AbortSignal.any([controller.signal, requestSignal]) : controller.signal
  const timer = setTimeout(() => controller.abort(), dependencies.deadlineMs)
  const deadline = Date.now() + dependencies.deadlineMs
  let directory: string | undefined, browser: Browser | undefined
  let proxy: Awaited<ReturnType<typeof startScreenshotProxy>> | undefined
  let fatal: ScreenshotError | undefined
  const aborted = new Promise<never>((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new ScreenshotError('timeout')), { once: true })
    if (signal.aborted) reject(new ScreenshotError('timeout'))
  })
  const work = (async () => {
      // Prevalidation is additional protection; the proxy validates again and
      // pins the actual socket IP instead of letting Chromium resolve it.
      stage = 'dns'
      await dependencies.resolve(target.hostname, signal)
      const approved = new Set([target.hostname, ...screenshotAssetHosts.filter(host => !ownedHosts.includes(host))])
      stage = 'proxy-start'
      proxy = await dependencies.proxy(approved, signal)
      directory = await mkdtemp(join(tmpdir(), 'portfolio-screenshot-'))
      signal.throwIfAborted()
      stage = 'browser-launch'
      browser = await dependencies.launch(proxy.url, directory, Math.max(1, Math.min(15_000, deadline - Date.now())))
      if (signal.aborted) { await browser.close(); throw new ScreenshotError('timeout') }
      stage = 'browser-context'
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1,
        reducedMotion: 'reduce', serviceWorkers: 'block', acceptDownloads: false, permissions: [], ignoreHTTPSErrors: false })
      await context.clearCookies()
      await context.routeWebSocket('**/*', socket => socket.close())
      await context.addInitScript(() => {
        // Defense in depth for APIs with transports outside ordinary Fetch.
        // These restrictions apply before scripts in every new document.
        for (const name of ['RTCPeerConnection', 'webkitRTCPeerConnection', 'WebSocket', 'WebTransport', 'Worker', 'SharedWorker']) {
          try { Object.defineProperty(globalThis, name, { value: undefined, configurable: false, writable: false }) } catch { /* Already unavailable. */ }
        }
        try { Object.defineProperty(window, 'open', { value: () => null, configurable: false, writable: false }) } catch { /* Popup event handler also closes targets. */ }
      })
      const page = await context.newPage()
      context.on('page', popup => { if (popup !== page) void popup.close().catch(() => {}) })
      page.on('download', download => { void download.cancel().catch(() => {}) })
      const session = await context.newCDPSession(page)
      stage = 'network-setup'
      await dependencies.installNetwork(session, policy, approved, signal, error => { fatal ??= error })
      page.setDefaultTimeout(3000)
      stage = 'navigation'
      try { await page.goto(target.href, { waitUntil: 'domcontentloaded', timeout: 15_000 }) } catch (error) {
        throw fatal ?? new ScreenshotError(error instanceof Error && error.name === 'TimeoutError' ? 'timeout' : 'unavailable',
          'navigation', classifyScreenshotReason(error, 'PAGE_GOTO_FAILED'))
      }
      if (fatal) throw fatal
      stage = 'page-readiness'
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}' }).catch(() => {})
      await page.evaluate(async () => {
        window.scrollTo(0, 0)
        // These waits are bounded and never use networkidle.
        const ready = Promise.all([document.fonts.ready, ...Array.from(document.images).filter(image => {
          const rect = image.getBoundingClientRect()
          return rect.top < 900 && rect.bottom > 0
        }).map(image => image.complete ? Promise.resolve() : new Promise<void>(resolve => {
          image.addEventListener('load', () => resolve(), { once: true })
          image.addEventListener('error', () => resolve(), { once: true })
        }))])
        await Promise.race([ready, new Promise(resolve => setTimeout(resolve, 2500))])
      })
      await page.waitForTimeout(400)
      if (fatal) throw fatal
      stage = 'screenshot'
      const bytes = await page.screenshot({ type: 'jpeg', quality: 85, fullPage: false, animations: 'disabled', timeout: 5000 })
      stage = 'output'
      validateScreenshot(bytes)
      return bytes
    })()
  try {
    return await Promise.race([aborted, work])
  } catch (error) {
    const safe = fatal ?? (signal.aborted || (error instanceof Error && error.name === 'TimeoutError')
      ? new ScreenshotError('timeout') : error instanceof ScreenshotError ? error : new ScreenshotError('unavailable'))
    screenshotDiagnostic(safe.stage ?? (safe.code === 'redirect' ? 'redirect' : stage), safe.code, safe.reason ? safe : error)
    throw safe
  } finally {
    controller.abort()
    clearTimeout(timer)
    await browser?.close().catch(() => {})
    await proxy?.close().catch(() => {})
    // A launch that finishes at the deadline must close its browser too;
    // never release the concurrency slot while late work can allocate files.
    await work.catch(() => {})
    if (directory) await rm(directory, { recursive: true, force: true }).catch(() => {})
    active = false
  }
}
