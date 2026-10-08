import 'server-only'

import { join } from 'node:path'
import { platform, tmpdir } from 'node:os'
import { chromium as playwright, type Browser, type LaunchOptions } from 'playwright-core'
import chromium from '@sparticuz/chromium'
import { ScreenshotError } from './errors'

export function screenshotLaunchOptions(executablePath: string, proxyUrl: string, directory: string): LaunchOptions {
  return {
    executablePath, headless: true, timeout: 15_000,
    proxy: { server: proxyUrl, bypass: '<-loopback>' },
    // Never inherit the application's environment. These are runtime paths,
    // not values copied from process.env or an administrator's request.
    env: {
      PATH: '/usr/bin:/bin', HOME: directory, TMPDIR: directory,
      LANG: 'en_US.UTF-8', FONTCONFIG_PATH: join(tmpdir(), 'fonts'),
      LD_LIBRARY_PATH: join(tmpdir(), 'al2023', 'lib'),
    },
    // Do not use chromium.args wholesale: vendor defaults include
    // --disable-web-security and --allow-running-insecure-content.
    args: [
      '--no-zygote', '--disable-dev-shm-usage', '--disable-gpu', '--disable-webgl',
      '--disable-quic', '--proxy-bypass-list=<-loopback>',
      '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
      '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--webrtc-ip-handling-policy=disable_non_proxied_udp',
      '--disable-background-networking', '--disable-component-update',
      '--disable-domain-reliability', '--disable-sync', '--disable-extensions',
      '--disable-notifications', '--disable-breakpad', '--no-pings',
      '--no-first-run', '--no-default-browser-check', '--metrics-recording-only',
      '--disable-features=MediaRouter,OptimizationHints,Prerender2,SpeculationRulesPrefetch,WebTransport,WebRtc',
    ],
  }
}

export async function launchScreenshotBrowser(proxyUrl: string, directory: string, timeout = 15_000): Promise<Browser> {
  const deadline = Date.now() + timeout
  const executablePath = await resolveScreenshotExecutable()
  if (Date.now() >= deadline) throw new ScreenshotError('timeout')
  return playwright.launch({ ...screenshotLaunchOptions(executablePath, proxyUrl, directory), timeout: Math.max(1, deadline - Date.now()) })
}

export async function resolveScreenshotExecutable(runtime = {
  platform: platform(), production: process.env.NODE_ENV === 'production', vercel: Boolean(process.env.VERCEL),
}, dependencies = {
  bundled: async () => { chromium.setGraphicsMode = false; return chromium.executablePath() },
  local: async () => {
    // Eliminated from production builds; local installation paths never enter
    // a Vercel launch configuration. No environment path override is needed.
    if (process.env.NODE_ENV !== 'production') {
      const { resolveLocalChromium } = await import('./chromium-local')
      return resolveLocalChromium(playwright.executablePath())
    }
    throw new ScreenshotError('unavailable', 'browser-executable')
  },
}) {
  try {
    if (runtime.platform === 'linux') return await dependencies.bundled()
    if (runtime.platform === 'darwin' && !runtime.production && !runtime.vercel) return await dependencies.local()
    throw new ScreenshotError('unavailable', 'browser-executable')
  } catch { throw new ScreenshotError('unavailable', 'browser-executable') }
}
