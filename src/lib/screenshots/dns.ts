import 'server-only'

import { Resolver } from 'node:dns/promises'
import { ScreenshotError } from './errors'
import { hostnameIsValid, publicIp } from './policy'

export type ScreenshotResolver = (hostname: string, signal: AbortSignal) => Promise<string[]>

export const resolveAddresses: ScreenshotResolver = async (hostname, signal) => {
  const resolver = new Resolver({ timeout: 3000, tries: 1 })
  const cancel = () => resolver.cancel()
  signal.throwIfAborted()
  signal.addEventListener('abort', cancel, { once: true })
  try {
    const answers = await Promise.all([resolver.resolve4(hostname), resolver.resolve6(hostname)].map(async request => {
      try { return await request } catch (error) {
        // A public host can legitimately have only one address family.
        if (['ENODATA', 'ENOTFOUND'].includes((error as NodeJS.ErrnoException).code ?? '')) return []
        throw new ScreenshotError('dns')
      }
    }))
    signal.throwIfAborted()
    return answers.flat()
  } finally { signal.removeEventListener('abort', cancel) }
}

export async function resolvePublicHost(hostname: string, signal: AbortSignal, resolve: ScreenshotResolver = resolveAddresses) {
  if (!hostnameIsValid(hostname)) throw new ScreenshotError('unsafe')
  let answers: string[]
  try { answers = await resolve(hostname, signal) } catch { throw new ScreenshotError(signal.aborted ? 'timeout' : 'dns') }
  signal.throwIfAborted()
  if (!answers.length) throw new ScreenshotError('dns')
  const addresses = answers.map(publicIp)
  if (addresses.some(address => address === null)) throw new ScreenshotError('unsafe')
  return [...new Set(addresses as string[])]
}
