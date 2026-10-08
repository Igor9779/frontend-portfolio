import 'server-only'

import { createServer } from 'node:http'
import { connect, isIP, type Socket } from 'node:net'
import type { Duplex } from 'node:stream'
import { ScreenshotError } from './errors'
import { screenshotDiagnostic, type ScreenshotReason } from './diagnostics'
import { normalizedIp, publicIp } from './policy'
import { resolveAddresses, resolvePublicHost, type ScreenshotResolver } from './dns'

export type ScreenshotConnector = (options: { host: string; port: number; family: number; autoSelectFamily: false }) => Socket

// The CONNECT tunnel preserves browser TLS/SNI/certificate checks. Only the
// proxy resolves hostnames; net.connect receives an already vetted IP literal.
export async function startScreenshotProxy(approvedHosts: ReadonlySet<string>, signal: AbortSignal, dependencies: {
  resolve?: ScreenshotResolver; connect?: ScreenshotConnector
} = {}) {
  const sockets = new Set<Duplex>()
  let stopped = false, requests = 0, transferred = 0
  let reported = false
  const reportFailure = (reason: ScreenshotReason) => {
    if (!reported && !stopped && !signal.aborted) {
      reported = true
      screenshotDiagnostic('proxy-connection', 'unavailable', new ScreenshotError('unavailable', 'proxy-connection', reason))
    }
  }
  const closeSockets = () => { for (const socket of sockets) socket.destroy() }
  const server = createServer({ maxHeaderSize: 4096, requestTimeout: 5000, headersTimeout: 5000 }, (_request, response) => {
    response.writeHead(403, { Connection: 'close' }).end()
  })
  server.on('connection', socket => {
    if (stopped || sockets.size >= 64) { socket.destroy(); return }
    sockets.add(socket)
    socket.on('close', () => sockets.delete(socket))
    socket.on('error', () => socket.destroy())
    socket.setTimeout(15_000, () => socket.destroy())
  })
  server.on('upgrade', (_request, socket) => socket.destroy())
  server.on('clientError', (_error, socket) => socket.destroy())
  server.on('connect', (request, client, head) => {
    const deny = () => { if (!client.destroyed) client.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n') }
    const match = /^([a-z0-9.-]+):443$/.exec(request.url ?? '')
    const host = match?.[1]
    if (stopped || signal.aborted || !host || !approvedHosts.has(host) || ++requests > 128 || head.length > 16_384) {
      // Expected background/third-party denials are quiet; report a rejected
      // approved tunnel without confusing it with unrelated browser traffic.
      if (host && approvedHosts.has(host)) reportFailure('CONNECT_REJECTED')
      deny(); return
    }
    void (async () => {
      let upstream: Socket | undefined
      let resolving = true, established = false
      try {
        const addresses = await resolvePublicHost(host, signal, dependencies.resolve ?? resolveAddresses)
        resolving = false
        if (stopped || client.destroyed || signal.aborted) return
        const address = addresses[0]!
        upstream = (dependencies.connect ?? connect)({ host: address, port: 443, family: isIP(address), autoSelectFamily: false })
        sockets.add(upstream)
        upstream.on('close', () => sockets.delete(upstream!))
        const shutdown = () => { upstream?.destroy(); client.destroy() }
        upstream.on('error', () => { reportFailure(established ? 'PROXY_CONNECTION_CLOSED' : 'CONNECT_UPSTREAM_FAILED'); shutdown() })
        client.on('error', shutdown)
        client.on('close', () => upstream?.destroy())
        upstream.on('close', () => client.destroy())
        upstream.setTimeout(10_000, () => { reportFailure('CONNECT_TIMEOUT'); shutdown() })
        upstream.once('connect', () => {
          // Defend against a connector/configuration mistake, not just DNS.
          if (stopped || signal.aborted || !upstream?.remoteAddress || !publicIp(upstream.remoteAddress)
            || normalizedIp(upstream.remoteAddress) !== address) { reportFailure('CONNECT_REMOTE_ADDRESS_REJECTED'); shutdown(); return }
          established = true
          client.write('HTTP/1.1 200 Connection Established\r\n\r\n')
          if (head.length) upstream.write(head)
          const count = (chunk: Buffer) => {
            transferred += chunk.length
            if (transferred > 60 * 1024 * 1024) { stopped = true; closeSockets() }
          }
          upstream.on('data', count)
          client.on('data', count)
          client.pipe(upstream).pipe(client)
        })
      } catch { reportFailure(resolving ? 'CONNECT_DNS_FAILED' : 'CONNECT_UPSTREAM_FAILED'); upstream?.destroy(); deny() }
    })()
  })
  const abort = () => { stopped = true; closeSockets(); server.close() }
  signal.throwIfAborted()
  signal.addEventListener('abort', abort, { once: true })
  try {
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', () => { server.removeListener('error', reject); resolve() })
    })
    signal.throwIfAborted()
  } catch {
    abort(); signal.removeEventListener('abort', abort)
    throw new ScreenshotError('unavailable')
  }
  const address = server.address()
  if (!address || typeof address === 'string') { abort(); throw new ScreenshotError('unavailable') }
  // Suppress raw server diagnostics; capture failures remain normalized.
  server.on('error', abort)
  return {
    url: `http://127.0.0.1:${address.port}`,
    async close() {
      signal.removeEventListener('abort', abort)
      stopped = true
      closeSockets()
      await new Promise<void>(resolve => server.close(() => resolve()))
    },
  }
}
