// Explicit local-only browser regression: npm run test:screenshot-navigation.
// No external DNS, websites, screenshots, AI, authentication or persistence.
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:https'
import { createSecureServer } from 'node:http2'
import { connect } from 'node:net'
import { createHash, X509Certificate } from 'node:crypto'
import { chromium as playwright } from 'playwright-core'
import chromium from '@sparticuz/chromium'
import { compile, empty, errorsModule, quietDiagnostics, policyModule, dnsModule, networkModule } from './screenshot-test-helpers.mjs'

const { createScreenshotPolicy } = await import(policyModule)
const { installScreenshotNetwork } = await import(networkModule)
const { startScreenshotProxy } = await import(compile('src/lib/screenshots/proxy.ts', {
  'server-only':empty, './errors':errorsModule, './diagnostics':quietDiagnostics, './policy':policyModule, './dns':dnsModule,
}))
const { screenshotLaunchOptions } = await import(compile('src/lib/screenshots/chromium.ts', {
  'server-only':empty, './errors':errorsModule, 'playwright-core':import.meta.resolve('playwright-core'),
  '@sparticuz/chromium':import.meta.resolve('@sparticuz/chromium'),
}))
const { resolveLocalChromium } = await import(compile('src/lib/screenshots/chromium-local.ts', { 'server-only':empty, './errors':errorsModule }))
const execute = promisify(execFile)
const hostname = 'fixture.vercel.app'
const pinnedAddress = '8.8.8.8' // Injected identity only; never connected to.

async function fixture(kind) {
  const directory = await mkdtemp(join(tmpdir(), 'screenshot-https-fixture-'))
  const sockets = new Set(), sessions = new Set(), requests = [], connections = [], phrases = [], fatals = [], sni = []
  let server, proxy, browser
  const controller = new AbortController(), timer = setTimeout(()=>controller.abort(),30_000)
  try {
    await execute('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1',
      '-keyout',join(directory,'key.pem'),'-out',join(directory,'cert.pem'),'-subj','/CN='+hostname,
      '-addext','subjectAltName=DNS:'+hostname],{timeout:5000,maxBuffer:16_384})
    const cert=await readFile(join(directory,'cert.pem')),key=await readFile(join(directory,'key.pem'))
    const handle=(request,response)=>{
      requests.push({path:request.url,version:request.httpVersion,host:request.headers[':authority']??request.headers.host})
      if(request.url==='/')response.writeHead(302,{Location:kind==='redirect-rejected'?'https://localhost/':'/home'}).end()
      else response.writeHead(200,{'Content-Type':'text/html'}).end('<!doctype html><html><body><h1>Controlled HTTPS fixture</h1></body></html>')
    }
    server=kind==='http1'?createServer({cert,key},handle):createSecureServer({cert,key,allowHTTP1:true},handle)
    server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket))})
    server.on('secureConnection',socket=>sni.push(socket.servername))
    server.on('session',session=>{sessions.add(session);session.on('close',()=>sessions.delete(session))})
    server.on('tlsClientError',()=>{})
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve))
    let resolutions=0
    const resolve=async host=>{assert.equal(host,hostname);resolutions++;return [pinnedAddress]}
    const approved=new Set([hostname])
    proxy=await startScreenshotProxy(approved,controller.signal,{
      resolve,
      connect:options=>{
        connections.push(options)
        // This test-only connector transports to a loopback fixture while
        // presenting the pinned public identity to the production safety check.
        // No production connector or DNS/IP policy is changed.
        const socket=connect({host:'127.0.0.1',port:server.address().port})
        Object.defineProperty(socket,'remoteAddress',{value:options.host})
        return socket
      },
    })
    chromium.setGraphicsMode=false
    const executable=process.platform==='darwin'?await resolveLocalChromium(playwright.executablePath()):await chromium.executablePath()
    const options=screenshotLaunchOptions(executable,proxy.url,directory)
    const pin=createHash('sha256').update(new X509Certificate(cert).publicKey.export({type:'spki',format:'der'})).digest('base64')
    // Trust ONLY this ephemeral fixture certificate in the disposable TEST
    // browser. Production options retain normal certificate/hostname checks.
    const args=kind==='tls-rejected'?options.args:[...options.args,'--ignore-certificate-errors-spki-list='+pin]
    browser=await playwright.launch({...options,args})
    const context=await browser.newContext({serviceWorkers:'block',permissions:[],acceptDownloads:false,ignoreHTTPSErrors:false})
    const page=await context.newPage(),session=await context.newCDPSession(page)
    const send=session.send.bind(session)
    session.send=async(method,options)=>{
      if(method==='Fetch.continueResponse')phrases.push(options)
      return send(method,options)
    }
    await installScreenshotNetwork(session,createScreenshotPolicy([]),approved,controller.signal,error=>fatals.push(error),resolve)
    if(kind==='tls-rejected'||kind==='redirect-rejected') {
      await assert.rejects(page.goto('https://'+hostname+'/',{waitUntil:'domcontentloaded',timeout:15_000}))
      assert.ok(fatals.some(error=>kind==='tls-rejected'?error.reason==='TLS_FAILED':error.code==='redirect'))
      if(kind==='redirect-rejected')assert.equal(requests.length,1)
    } else {
      await page.goto('https://'+hostname+'/',{waitUntil:'domcontentloaded',timeout:15_000})
      assert.equal(await page.locator('h1').textContent(),'Controlled HTTPS fixture')
      assert.deepEqual(requests.map(request=>request.path),['/','/home'])
      assert.ok(requests.every(request=>request.version===(kind==='http1'?'1.1':'2.0')))
      assert.ok(requests.every(request=>request.host===hostname))
      assert.ok(sni.every(name=>name===hostname))
      assert.ok(sni.length>0)
      assert.equal(fatals.length,0)
      assert.deepEqual(phrases.map(options=>options.responseCode),[302,200])
      assert.ok(phrases.every(options=>!Object.hasOwn(options,'responsePhrase')))
    }
    // Chrome may open another tunnel while a TLS connection is failing. Every
    // connection must still be pinned, and rejected TLS must send zero HTTP.
    if(kind==='tls-rejected') { assert.ok(connections.length>=1);assert.equal(requests.length,0) }
    else assert.equal(connections.length,1)
    for(const connection of connections)assert.deepEqual(connection,{host:pinnedAddress,port:443,family:4,autoSelectFamily:false})
    assert.ok(resolutions>=1)
  } finally {
    clearTimeout(timer);controller.abort()
    await browser?.close().catch(()=>{})
    await proxy?.close().catch(()=>{})
    for(const session of sessions)session.destroy()
    for(const socket of sockets)socket.destroy()
    if(server)await new Promise(resolve=>server.close(resolve))
    await rm(directory,{recursive:true,force:true})
  }
}

for(const kind of ['http2','http1','tls-rejected','redirect-rejected']) {
  test(`real Chrome through pinned CONNECT: ${kind}`,{timeout:35_000},()=>fixture(kind))
}
