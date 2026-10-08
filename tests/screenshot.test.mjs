import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { connect, isIP } from 'node:net'
import { Duplex } from 'node:stream'
import { test } from 'node:test'
import { compile, empty, moduleUrl, source, errorsModule, diagnosticsModule, quietDiagnostics, policyModule, dnsModule, networkModule, jpeg, settled } from './screenshot-test-helpers.mjs'

const { ScreenshotError } = await import(errorsModule)
const { createScreenshotPolicy, publicIp, normalizedIp } = await import(policyModule)
const { resolvePublicHost } = await import(dnsModule)
const { installScreenshotNetwork } = await import(networkModule)
const proxyModule = compile('src/lib/screenshots/proxy.ts', { 'server-only': empty, './errors': errorsModule, './diagnostics': quietDiagnostics, './policy': policyModule, './dns': dnsModule })
const { startScreenshotProxy } = await import(proxyModule)
const chromiumModule = compile('src/lib/screenshots/chromium.ts', {
  'server-only': empty, './errors': errorsModule,
  'playwright-core': moduleUrl('export const chromium = {executablePath(){throw new Error("No real browser in mocked tests")}}'),
  '@sparticuz/chromium': moduleUrl('export default {args:["--disable-web-security"]}'),
})
const { screenshotLaunchOptions, resolveScreenshotExecutable } = await import(chromiumModule)
const { resolveLocalChromium } = await import(compile('src/lib/screenshots/chromium-local.ts', { 'server-only': empty, './errors': errorsModule }))
const { captureWebsite, validateScreenshot } = await import(compile('src/lib/screenshots/capture.ts', {
  'server-only': empty, './chromium': chromiumModule, './errors': errorsModule,
  './policy': policyModule, './dns': dnsModule, './proxy': proxyModule, './network': networkModule, './diagnostics': quietDiagnostics,
}))
const { screenshotResponse } = await import(compile('src/lib/screenshots/http.ts', { 'server-only': empty, './errors': errorsModule, './diagnostics': quietDiagnostics }))
const policy = createScreenshotPolicy(['portfolio.vercel.app'])
const target = 'https://project.vercel.app/'

test('capture URL policy accepts only strict approved HTTPS hosting names and standard port', () => {
  for (const url of [target, 'https://project.vercel.app:443/path?a=1', 'https://site.netlify.app/', 'https://site.pages.dev/', 'https://owner.github.io/repository/']) assert.ok(policy.target(url))
  for (const url of ['http://project.vercel.app', 'https://a:b@project.vercel.app', 'https://project.vercel.app:8443',
    'https://localhost', 'https://internal', 'https://127.0.0.1', 'https://2130706433', 'https://[::1]',
    'https://vercel.app', 'https://vercel.app.attacker.example', 'https://evilvercel.app', 'https://custom.example',
    'https://portfolio.vercel.app/admin', 'https://project.vercel.app./', 'https://project.vercel.app/\nfoo',
    'https://project.vercel.app\\@evil.example', 'https://@project.vercel.app', 'https://project.vercel.app/%00', null, {}, 'x'.repeat(2049)]) assert.throws(() => policy.target(url), ScreenshotError)
  assert.throws(() => policy.resource('https://third-party.vercel.app/a.js', new Set(['project.vercel.app'])), ScreenshotError)
})

test('IP classification rejects all non-public ranges and unsafe IPv6 transition addresses', () => {
  for (const address of ['0.0.0.0', '10.2.3.4', '172.16.2.3', '192.168.1.2', '127.1.2.3', '169.254.169.254',
    '169.254.170.2', '100.64.1.1', '192.0.0.9', '192.0.2.1', '198.18.0.1', '203.0.113.1', '224.0.0.1', '240.0.0.1',
    '::', '::1', 'fc00::1', 'fd00::1', 'fe80::1', 'fe80::1%eth0', 'ff00::1', '::ffff:127.0.0.1', '::ffff:192.168.1.1',
    '64:ff9b::a00:1', '2002:0808:0808::1', '2001:0:1234::1', '2001:db8::1', '3fff::1', 'invalid']) assert.equal(publicIp(address), null, address)
  assert.equal(publicIp('8.8.8.8'), '8.8.8.8')
  assert.equal(publicIp('::ffff:8.8.8.8'), '8.8.8.8')
  assert.equal(normalizedIp('::ffff:8.8.8.8'), '8.8.8.8')
  assert.ok(publicIp('2606:4700:4700::1111'))
})

test('DNS rejects any unsafe/mixed answer and fails closed on resolution failures', async () => {
  const signal = new AbortController().signal
  for (const answers of [[], ['8.8.8.8', '10.0.0.1'], ['8.8.8.8', 'fd00::1'], ['::ffff:127.0.0.1'], ['garbage']]) await assert.rejects(resolvePublicHost('project.vercel.app', signal, async () => answers), ScreenshotError)
  await assert.rejects(resolvePublicHost('project.vercel.app', signal, async () => { throw new Error('INTERNAL_DNS_DETAIL') }), error => !error.message.includes('INTERNAL'))
  assert.deepEqual(await resolvePublicHost('project.vercel.app', signal, async () => ['8.8.8.8', '::ffff:8.8.8.8']), ['8.8.8.8'])
})

test('DNS resolver independently queries both A and AAAA and accepts only missing-family errors', async () => {
  const module = compile('src/lib/screenshots/dns.ts', { 'server-only': empty, './errors': errorsModule, './policy': policyModule,
    'node:dns/promises': moduleUrl(`export class Resolver {
      resolve4(host){globalThis.dnsFixture.calls.push(['A',host]);return Promise.resolve(['8.8.8.8'])}
      resolve6(host){globalThis.dnsFixture.calls.push(['AAAA',host]);return globalThis.dnsFixture.fail ? Promise.reject({code:globalThis.dnsFixture.fail}) : Promise.resolve(['2606:4700:4700::1111'])}
      cancel(){}
    }`) })
  const { resolveAddresses } = await import(module)
  globalThis.dnsFixture = { calls: [] }
  assert.equal((await resolveAddresses('project.vercel.app', new AbortController().signal)).length, 2)
  assert.deepEqual(globalThis.dnsFixture.calls.map(call => call[0]), ['A','AAAA'])
  globalThis.dnsFixture.fail = 'ENODATA'
  assert.deepEqual(await resolveAddresses('project.vercel.app', new AbortController().signal), ['8.8.8.8'])
  globalThis.dnsFixture.fail = 'ETIMEOUT'
  await assert.rejects(resolveAddresses('project.vercel.app', new AbortController().signal), ScreenshotError)
  delete globalThis.dnsFixture
})

class TestSocket extends Duplex {
  constructor(address) { super(); this.remoteAddress = address; queueMicrotask(() => this.emit('connect')) }
  _read() {}
  _write(_chunk, _encoding, done) { done() }
  setTimeout() { return this }
}
async function connectProbe(proxy, authority) {
  const url = new URL(proxy.url)
  return new Promise((resolve, reject) => {
    const client = connect({ host: '127.0.0.1', port: Number(url.port) })
    client.setTimeout(1500, () => { client.destroy(); reject(new Error('Local proxy probe timed out')) })
    client.on('error', reject)
    client.on('connect', () => client.write(`CONNECT ${authority} HTTP/1.1\r\nHost: ${authority}\r\n\r\n`))
    client.once('data', data => { resolve(data.toString()); client.destroy() })
    client.once('end', () => resolve('closed'))
  })
}

test('CONNECT pins the actual socket to a vetted IP; rebinding is denied without a second lookup', async () => {
  let dns = 0
  const connected = [], upstreams = []
  const proxy = await startScreenshotProxy(new Set(['project.vercel.app']), new AbortController().signal, {
    resolve: async () => ++dns === 1 ? ['8.8.8.8'] : ['10.0.0.1'],
    connect: options => { connected.push(options); const socket = new TestSocket(options.host); upstreams.push(socket); return socket },
  })
  try {
    assert.match(await connectProbe(proxy, 'project.vercel.app:443'), /200 Connection Established/)
    assert.match(await connectProbe(proxy, 'project.vercel.app:443'), /403 Forbidden/)
    assert.equal(dns, 2)
    assert.equal(connected.length, 1)
    assert.equal(isIP(connected[0].host), 4)
    assert.deepEqual(connected[0], { host: '8.8.8.8', port: 443, family: 4, autoSelectFamily: false })
  } finally { await proxy.close() }
  assert.ok(upstreams.every(socket => socket.destroyed))
})

test('CONNECT denies unapproved hosts, ports, literals and connector failures without fallback', async () => {
  let attempts = 0, resolutions = 0
  const proxy = await startScreenshotProxy(new Set(['project.vercel.app']), new AbortController().signal, {
    resolve: async () => { resolutions++; return ['8.8.8.8'] }, connect: () => { attempts++; throw new Error('PRIVATE_CONNECT_DETAIL') },
  })
  try {
    for (const authority of ['project.vercel.app:80', 'project.vercel.app:8443', 'localhost:443', '127.0.0.1:443', 'other.vercel.app:443', '[::1]:443']) assert.match(await connectProbe(proxy, authority), /403/)
    assert.equal(resolutions, 0)
    const denied = await connectProbe(proxy, 'project.vercel.app:443')
    assert.match(denied, /403/); assert.equal(denied.includes('PRIVATE'), false)
    assert.equal(attempts, 1)
  } finally { await proxy.close() }
})

async function networkHarness(resolve = async () => ['8.8.8.8']) {
  const session = new EventEmitter(), commands = [], fatal = [], approved = new Set(['project.vercel.app', 'fonts.gstatic.com'])
  session.send = async (method, options) => { commands.push([method, options]); return method === 'Page.getFrameTree' ? { frameTree: { frame: { id: 'main' } } } : {} }
  await installScreenshotNetwork(session, policy, approved, new AbortController().signal, error => fatal.push(error), resolve)
  async function emit(overrides = {}) {
    session.emit('Fetch.requestPaused', { requestId:'r0',request:{url:target,method:'GET'},frameId:'main',resourceType:'Document',...overrides })
    await settled()
  }
  return { session, commands, fatal, approved, emit }
}
const htmlResponse = { responseStatusCode:200,responseStatusText:'OK',responseHeaders:[{name:'Content-Type',value:'text/html'}] }

test('browser interception pauses requests AND redirect responses; isolates frames/workers and blocks unnecessary requests', async () => {
  const network = await networkHarness()
  assert.deepEqual(network.commands.find(([method])=>method==='Fetch.enable')[1].patterns.map(pattern=>pattern.requestStage), ['Request','Response'])
  await network.emit()
  assert.equal(network.commands.at(-1)[0], 'Fetch.continueRequest')
  await network.emit(htmlResponse)
  const headers = network.commands.at(-1)[1].responseHeaders
  assert.ok(headers.some(header => header.name === 'Content-Security-Policy' && /frame-src 'none'.*worker-src 'none'.*connect-src 'none'/.test(header.value)))
  for (const resourceType of ['Media','WebSocket','XHR','Fetch','Other']) {
    await network.emit({ resourceType })
    assert.equal(network.commands.at(-1)[0], 'Fetch.failRequest')
  }
  await network.emit({ frameId:'child-frame' }); assert.equal(network.commands.at(-1)[0], 'Fetch.failRequest')
  await network.emit({ resourceType:'Script',request:{url:'https://unknown.example/script.js',method:'GET'} }); assert.equal(network.commands.at(-1)[0], 'Fetch.failRequest')
  await network.emit({request:{url:'https://fonts.gstatic.com/asset',method:'GET'}})
  assert.equal(network.commands.at(-1)[0], 'Fetch.failRequest')
  assert.equal(network.fatal.at(-1).code, 'unsupported')
})

test('same-host and explicitly policy-approved redirects are validated before following', async () => {
  const network = await networkHarness()
  for (const location of ['/home','https://next.netlify.app/']) {
    await network.emit({responseStatusCode:302,responseHeaders:[{name:'Location',value:location}]})
    assert.equal(network.commands.at(-1)[0], 'Fetch.continueResponse')
  }
  assert.ok(network.approved.has('next.netlify.app'))
  assert.equal(network.fatal.length, 0)
})

test('HTTP/2 redirects and HTML responses omit the empty CDP reason phrase', async () => {
  const network = await networkHarness()
  await network.emit({ responseStatusCode:302, responseStatusText:'', responseHeaders:[{name:'Location',value:'/home'}] })
  await network.emit({ ...htmlResponse, requestId:'r1', redirectedRequestId:'r0', responseStatusText:'' })
  const continued = network.commands.filter(([method])=>method==='Fetch.continueResponse').map(([,options])=>options)
  assert.equal(continued.length,2)
  for (const options of continued) assert.equal(Object.hasOwn(options,'responsePhrase'),false)
  assert.deepEqual(continued.map(options=>options.responseCode),[302,200])
  assert.equal(network.fatal.length,0)
  assert.ok(continued[1].responseHeaders.some(header=>header.name==='Content-Security-Policy'))
})

test('navigation diagnostics preserve CDP, HTTP, content and TLS failure classifications', async () => {
  const protocol = await networkHarness()
  const send=protocol.session.send
  protocol.session.send=async(method,options)=>{
    if(method==='Fetch.continueResponse')throw new Error('Protocol error (Fetch.continueResponse): Invalid http status code or phrase PRIVATE_SECRET')
    return send(method,options)
  }
  await protocol.emit(htmlResponse)
  assert.equal(protocol.fatal[0].reason,'RESPONSE_STATUS_INVALID')
  assert.equal(protocol.commands.at(-1)[0],'Fetch.failRequest')
  const http=await networkHarness()
  await http.emit({...htmlResponse,responseStatusCode:503})
  assert.equal(http.fatal[0].reason,'MAIN_DOCUMENT_HTTP_ERROR')
  assert.equal(http.fatal[0].httpStatus,503)
  const content=await networkHarness()
  await content.emit({...htmlResponse,responseHeaders:[{name:'Content-Type',value:'application/octet-stream'}]})
  assert.equal(content.fatal[0].reason,'MAIN_DOCUMENT_INVALID_CONTENT')
  const tls=await networkHarness()
  tls.session.emit('Network.requestWillBeSent',{requestId:'n1',type:'Document',frameId:'main'})
  await tls.emit({responseErrorReason:'Failed'})
  assert.equal(tls.commands.at(-1)[0],'Fetch.continueRequest')
  assert.equal(tls.fatal.length,0)
  tls.session.emit('Network.loadingFailed',{requestId:'n1',errorText:'net::ERR_CERT_AUTHORITY_INVALID PRIVATE_SECRET'})
  assert.equal(tls.fatal[0].reason,'TLS_FAILED')
  tls.session.emit('Network.requestWillBeSent',{requestId:'n2',type:'Document',frameId:'main'})
  tls.session.emit('Network.loadingFailed',{requestId:'n2',errorText:'net::ERR_BLOCKED_BY_CLIENT'})
  assert.equal(tls.fatal.length,1)
  assert.ok(!JSON.stringify([...protocol.fatal,...tls.fatal]).includes('PRIVATE_SECRET'))
})

test('proxy diagnostics distinguish DNS and pinned upstream failures without exposing transport errors',async()=>{
  const diagnostics=[];globalThis.screenshotDiagnosticFixture=diagnostics
  try {
    for(const failure of ['dns','upstream']) {
      const proxy=await startScreenshotProxy(new Set(['project.vercel.app']),new AbortController().signal,{
        resolve:async()=>{if(failure==='dns')throw new Error('PRIVATE_DNS_SECRET');return ['8.8.8.8']},
        connect:()=>{throw new Error('PRIVATE_UPSTREAM_SECRET')},
      })
      try {assert.match(await connectProbe(proxy,'project.vercel.app:443'),/403/)} finally {await proxy.close()}
    }
    assert.deepEqual(diagnostics.map(entry=>entry[2].reason),['CONNECT_DNS_FAILED','CONNECT_UPSTREAM_FAILED'])
    assert.ok(!JSON.stringify(diagnostics).includes('PRIVATE'))
  } finally {delete globalThis.screenshotDiagnosticFixture}
})

test('redirects to private, unsupported or owned destinations fail closed; chain is bounded', async () => {
  for (const location of ['https://127.0.0.1/', 'https://[::1]/', 'https://169.254.169.254/', 'https://custom.example/', 'https://portfolio.vercel.app/', 'http://project.vercel.app/']) {
    const network = await networkHarness()
    await network.emit({responseStatusCode:302,responseHeaders:[{name:'Location',value:location}]})
    assert.equal(network.commands.at(-1)[0], 'Fetch.failRequest'); assert.equal(network.fatal[0].code, 'redirect')
  }
  const rebound = await networkHarness(async () => ['8.8.8.8','10.0.0.1'])
  await rebound.emit({responseStatusCode:302,responseHeaders:[{name:'Location',value:'/next'}]})
  assert.equal(rebound.commands.at(-1)[0], 'Fetch.failRequest')
  const chain = await networkHarness()
  for (let i=0;i<6;i++) await chain.emit({ requestId:'r'+i, redirectedRequestId:i ? 'r'+(i-1) : undefined,
    responseStatusCode:302,responseHeaders:[{name:'Location',value:'/next'+i}] })
  assert.equal(chain.commands.at(-1)[0], 'Fetch.failRequest')
  assert.equal(chain.fatal.at(-1).code, 'redirect')
})

test('browser arguments force the proxy without loopback/DIRECT bypass and strip application secrets', () => {
  const options = screenshotLaunchOptions('/controlled/chromium', 'http://127.0.0.1:12345', '/tmp/capture-fixture')
  assert.deepEqual(options.proxy, {server:'http://127.0.0.1:12345',bypass:'<-loopback>'})
  for (const flag of ['--disable-quic','--proxy-bypass-list=<-loopback>','--disable-background-networking','--disable-extensions','--force-webrtc-ip-handling-policy=disable_non_proxied_udp']) assert.ok(options.args.includes(flag))
  assert.ok(!options.args.some(flag=>/disable-web-security|ignore-certificate|allow-running-insecure-content|direct:\/\//.test(flag)))
  assert.deepEqual(Object.keys(options.env).sort(), ['FONTCONFIG_PATH','HOME','LANG','LD_LIBRARY_PATH','PATH','TMPDIR'])
  assert.ok(!/env:\s*process\.env|\.\.\.process\.env/.test(source('src/lib/screenshots/chromium.ts')))
})

test('executable selection uses installed macOS development Chrome and bundled Linux/Vercel Chromium', async () => {
  const calls=[]
  const deps={async bundled(){calls.push('bundled');return '/tmp/chromium'},async local(){calls.push('local');return '/Applications/fixture'}}
  assert.equal(await resolveScreenshotExecutable({platform:'darwin',production:false,vercel:false},deps),'/Applications/fixture')
  for(const runtime of [{platform:'linux',production:true,vercel:true},{platform:'linux',production:false,vercel:false}])assert.equal(await resolveScreenshotExecutable(runtime,deps),'/tmp/chromium')
  assert.deepEqual(calls,['local','bundled','bundled'])
  for(const runtime of [{platform:'darwin',production:true,vercel:false},{platform:'darwin',production:false,vercel:true},{platform:'win32',production:false,vercel:false}])await assert.rejects(resolveScreenshotExecutable(runtime,deps),error=>error.stage==='browser-executable')
  assert.deepEqual(calls,['local','bundled','bundled'])
  const bundled=screenshotLaunchOptions('/tmp/chromium','http://127.0.0.1:1','/tmp/session')
  const local=screenshotLaunchOptions('/Applications/fixture','http://127.0.0.1:1','/tmp/session')
  const {executablePath: _bundled,...settings}=bundled
  const {executablePath: _local,...localSettings}=local
  assert.deepEqual(localSettings,settings)
})

test('macOS discovery accepts compatible app metadata, skips stale caches and fails closed when absent',async()=>{
  const calls=[]
  const deps={home:'/Users/fixture',async inspect(path){calls.push(path);return path.includes('/Users/fixture/Applications/Chromium.app/')?155:path==='/cache/expected'?152:null}}
  const selected=await resolveLocalChromium('/cache/expected',deps)
  assert.equal(selected,'/Users/fixture/Applications/Chromium.app/Contents/MacOS/Chromium')
  assert.equal(calls[0],'/cache/expected')
  assert.ok(calls.includes('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'))
  await assert.rejects(resolveLocalChromium('/cache/absent',{home:'/Users/fixture',async inspect(){return null}}),error=>error.code==='unavailable'&&error.stage==='browser-executable')
  await assert.rejects(resolveLocalChromium('/cache/old',{home:'/Users/fixture',async inspect(){return 152}}),error=>error.stage==='browser-executable')
})

test('server diagnostics classify failures without serializing raw errors, URLs or credentials', async()=>{
  const {screenshotDiagnostic}=await import(diagnosticsModule)
  const warnings=[],original=console.warn
  try{
    console.warn=(...args)=>warnings.push(args)
    for(const [stage,code,message] of [['browser-launch','unavailable','INTERNAL_SECRET'],['navigation','unavailable','net::ERR_CERT_AUTHORITY_INVALID PRIVATE_TOKEN'],['proxy-connection','unavailable','net::ERR_PROXY_CONNECTION_FAILED PRIVATE_COOKIE'],['navigation','timeout','SECRET_TIMEOUT']])screenshotDiagnostic(stage,code,new Error(message))
  }finally{console.warn=original}
  assert.deepEqual(warnings.map(line=>line[0]),['SCREENSHOT_BROWSER_LAUNCH_FAILED','SCREENSHOT_NAVIGATION_FAILED','SCREENSHOT_PROXY_FAILED','SCREENSHOT_TIMEOUT'])
  assert.equal(warnings[1][1].reason,'TLS_FAILED');assert.equal(warnings[2][1].reason,'PROXY_CONNECTION_CLOSED')
  assert.ok(!/SECRET|PRIVATE|COOKIE|TOKEN|ERR_CERT/.test(JSON.stringify(warnings)))
})

test('safe diagnostic details remain server-only and malformed details cannot leak', async()=>{
  const {screenshotDiagnostic}=await import(diagnosticsModule)
  const warnings=[],original=console.warn
  try{
    console.warn=(...args)=>warnings.push(args)
    screenshotDiagnostic('navigation','unavailable',new ScreenshotError('unavailable','navigation','MAIN_DOCUMENT_HTTP_ERROR',503))
    const malicious=new Error('PRIVATE_SECRET');malicious.reason='PRIVATE_TOKEN';malicious.httpStatus='PRIVATE_HEADER'
    screenshotDiagnostic('navigation','unavailable',malicious)
  }finally{console.warn=original}
  assert.equal(warnings[0][1].httpStatus,503)
  assert.deepEqual(warnings[1][1],{stage:'navigation',code:'unavailable',reason:'UNAVAILABLE'})
  const {screenshotFailure}=await import(errorsModule)
  assert.deepEqual(Object.keys(screenshotFailure(new ScreenshotError('unavailable','navigation','RESPONSE_STATUS_INVALID'))),['code','message'])
  assert.ok(!JSON.stringify(warnings).includes('PRIVATE'))
})

function captureFixture({launchError=false,screenshot=jpeg(),crash=false,hang=false,navigationError=null,deadlineMs=1000}={}) {
  const events=[], settings=[]
  let finishNavigation
  const page = { on(){},setDefaultTimeout(){},async goto(_url,options){events.push('goto');settings.push(options); if(navigationError)throw navigationError;if(hang) await new Promise((_resolve,reject)=>{finishNavigation=reject})},
    async addStyleTag(){},async evaluate(){},async waitForTimeout(){},async screenshot(options){settings.push(options); if(crash) throw new Error('PRIVATE_BROWSER_DETAIL');return screenshot} }
  const context = { async clearCookies(){events.push('clearCookies')},async routeWebSocket(_pattern,callback){const socket={close(){events.push('blockedSocket')}};callback(socket)},async addInitScript(){events.push('restrictedApis')},async newPage(){return page},on(){},async newCDPSession(){return {}} }
  const browser = { async newContext(options){settings.push(options);return context},async close(){events.push('browserClosed');finishNavigation?.(new Error('Closed'))} }
  const deps = { deadlineMs,async resolve(){events.push('dns');return ['8.8.8.8']},async proxy(){events.push('proxy');return {url:'http://127.0.0.1:1',async close(){events.push('proxyClosed')}}},
    async launch(){events.push('launch');if(launchError)throw new Error('PRIVATE_LAUNCH_DETAIL');return browser},async installNetwork(){events.push('network')} }
  return {deps,events,settings}
}

test('capture uses fixed JPEG viewport settings, isolated context, no networkidle and guaranteed cleanup', async () => {
  const fixture = captureFixture()
  const bytes = await captureWebsite(target, [], undefined, fixture.deps)
  assert.deepEqual(bytes, jpeg())
  assert.deepEqual(fixture.events, ['dns','proxy','launch','clearCookies','blockedSocket','restrictedApis','network','goto','browserClosed','proxyClosed'])
  assert.deepEqual(fixture.settings[0], {viewport:{width:1440,height:900},deviceScaleFactor:1,reducedMotion:'reduce',serviceWorkers:'block',acceptDownloads:false,permissions:[],ignoreHTTPSErrors:false})
  assert.deepEqual(fixture.settings[1], {waitUntil:'domcontentloaded',timeout:15000})
  assert.deepEqual(fixture.settings[2], {type:'jpeg',quality:85,fullPage:false,animations:'disabled',timeout:5000})
})

test('launch failure, crash, deadline and oversized/invalid encoder results fail safely and close resources', async () => {
  const diagnostics=[];globalThis.screenshotDiagnosticFixture=diagnostics
  try {
  for (const options of [{launchError:true},{crash:true},{screenshot:new Uint8Array(2*1024*1024+1)},{screenshot:jpeg(800,600)},{hang:true,deadlineMs:15}]) {
    const fixture=captureFixture(options)
    await assert.rejects(captureWebsite(target,[],undefined,fixture.deps),error=>error instanceof ScreenshotError && !error.message.includes('PRIVATE'))
    assert.ok(fixture.events.includes('proxyClosed'))
    if(!options.launchError)assert.ok(fixture.events.includes('browserClosed'))
  }
  validateScreenshot(jpeg())
  for(const bytes of [new Uint8Array(),new Uint8Array([1,2,3]),jpeg(1440,800)]) assert.throws(()=>validateScreenshot(bytes),ScreenshotError)
  assert.deepEqual(diagnostics.map(entry=>entry[0]),['browser-launch','screenshot','output','output','navigation'])
  assert.equal(diagnostics.at(-1)[1],'timeout')
  } finally {delete globalThis.screenshotDiagnosticFixture}
})

test('concurrent captures are rejected while the first browser owns its isolated resources',async()=>{
  const fixture=captureFixture({hang:true,deadlineMs:25})
  const first=assert.rejects(captureWebsite(target,[],undefined,fixture.deps),ScreenshotError)
  await settled()
  await assert.rejects(captureWebsite(target,[],undefined,captureFixture().deps),error=>error.code==='busy')
  await first
  assert.ok(fixture.events.includes('browserClosed'))
})

test('page.goto failures retain safe TLS, timeout, target-close and proxy classifications',async()=>{
  for(const [message,reason] of [['net::ERR_CERT_AUTHORITY_INVALID','TLS_FAILED'],['net::ERR_TUNNEL_CONNECTION_FAILED','PROXY_CONNECTION_CLOSED'],['Target page, context or browser has been closed','TARGET_CLOSED'],['Other PRIVATE_DETAIL','PAGE_GOTO_FAILED']]) {
    const fixture=captureFixture({navigationError:new Error(message)})
    await assert.rejects(captureWebsite(target,[],undefined,fixture.deps),error=>error.reason===reason && error.stage==='navigation' && !error.message.includes('PRIVATE'))
    assert.ok(fixture.events.includes('proxyClosed'))
    assert.ok(fixture.events.includes('browserClosed'))
  }
  const timeout=new Error('PRIVATE_TIMEOUT');timeout.name='TimeoutError'
  await assert.rejects(captureWebsite(target,[],undefined,captureFixture({navigationError:timeout}).deps),error=>error.code==='timeout'&&error.reason==='NAVIGATION_TIMEOUT')
})

test('anonymous/non-admin route calls cannot reach body parsing, DNS or browser work', async () => {
  for(const role of ['anonymous','non-admin']) {
    const events=[]
    const response=await screenshotResponse(new Request('https://portfolio.vercel.app/admin/screenshot',{method:'POST',body:'not-json'}),{
      async authorize(){events.push(role);throw new Error('PRIVATE_AUTH_DETAIL')},async capture(){events.push('capture');return jpeg()},
    })
    assert.equal(response.status,403);assert.deepEqual(events,[role]);assert.equal((await response.text()).includes('PRIVATE'),false)
  }
})

test('route accepts only same-origin bounded JSON and returns raw no-store JPEG', async () => {
  const calls=[]
  const deps={async authorize(){calls.push('authorize')},async capture(url,owned){calls.push([url,owned]);return jpeg()}}
  function request(body,overrides={}) {return new Request('https://portfolio.vercel.app/admin/screenshot',{method:'POST',headers:{Origin:'https://portfolio.vercel.app','Content-Type':'application/json',...overrides},body})}
  const good=await screenshotResponse(request(JSON.stringify({productionUrl:target})),deps)
  assert.equal(good.status,200);assert.equal(good.headers.get('content-type'),'image/jpeg');assert.equal(good.headers.get('cache-control'),'no-store');assert.deepEqual(new Uint8Array(await good.arrayBuffer()),jpeg())
  assert.equal(calls[0],'authorize');assert.ok(calls[1][1].includes('portfolio.vercel.app'))
  for(const [body,headers] of [['{}',{}],['{',{}],[JSON.stringify({productionUrl:target,secret:'unexpected'}),{}],['x'.repeat(4097),{}],['{}',{Origin:'https://attacker.example'}],['{}',{'Content-Type':'text/plain'}]]) {
    calls.length=0
    const result=await screenshotResponse(request(body,headers),deps)
    assert.ok(result.status>=400);assert.deepEqual(calls,['authorize'])
  }
})

test('capture import graph has no AI or project/Storage mutation dependencies', () => {
  for(const path of ['src/lib/screenshots/capture.ts','src/lib/screenshots/chromium.ts','src/lib/screenshots/network.ts','src/lib/screenshots/proxy.ts','src/lib/screenshots/dns.ts','src/lib/screenshots/http.ts','src/app/admin/screenshot/route.ts']) {
    const text=source(path)
    assert.ok(!/openai|ai-actions|ai-autofill|project-actions|project-previews|\.storage\b|\.rpc\(|\.from\(['"]/.test(text),path)
  }
  assert.match(source('src/app/admin/screenshot/route.ts'), /authorize: requireAdmin/)
  assert.match(source('src/app/admin/screenshot/route.ts'), /runtime = 'nodejs'/)
})
