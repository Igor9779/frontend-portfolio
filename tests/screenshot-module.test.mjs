import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { assertScreenshotTrace, requiredScreenshotFiles } from '../scripts/screenshot-trace.mjs'
import { compile, empty, errorsModule, diagnosticsModule, quietDiagnostics, jpeg, source } from './screenshot-test-helpers.mjs'

const { ScreenshotError, screenshotFailure } = await import(errorsModule)
const { screenshotDiagnostic, classifyScreenshotModule } = await import(diagnosticsModule)
const { loadScreenshotCapture } = await import(compile('src/lib/screenshots/module-load.ts', {
  'server-only': empty, './errors': errorsModule, './diagnostics': diagnosticsModule,
}))
const { screenshotResponse } = await import(compile('src/lib/screenshots/http.ts', {
  'server-only': empty, './errors': errorsModule, './diagnostics': quietDiagnostics,
}))

function fixture(failure) {
  const events=[]
  const capture={captureWebsite:()=>{throw new Error('Capture must never run in this fixture')}}
  const deps=Object.fromEntries(['playwright','chromium','capture'].map(name=>[name,async()=>{
    events.push(name);if(failure?.name===name)throw failure.error;return name==='capture'?capture:{}
  }]))
  return {events,deps,capture}
}

test('production module loading probes package imports without launching or calling capture',async()=>{
  const data=fixture()
  assert.equal(await loadScreenshotCapture(data.deps,'24.21.0'),data.capture)
  assert.deepEqual(data.events,['playwright','chromium','capture'])
  assert.ok(!/launch\(|executablePath\(|resolvePublicHost|\.storage|\.rpc\(|openai/.test(source('src/lib/screenshots/module-load.ts')))
})

test('missing Playwright browser registry is safely identified before capture import',async()=>{
  const error=new Error('Cannot find module /runtime/node_modules/playwright-core/browsers.json PRIVATE_TOKEN');error.code='MODULE_NOT_FOUND'
  const data=fixture({name:'playwright',error})
  await assert.rejects(loadScreenshotCapture(data.deps,'24.21.0'),error=>{
    assert.ok(error instanceof ScreenshotError)
    assert.equal(error.stage,'module-load')
    assert.deepEqual(error.moduleFailure,{module:'playwright-core',category:'PACKAGE_ASSET_MISSING'})
    assert.deepEqual(Object.keys(screenshotFailure(error)),['code','message'])
    assert.ok(!JSON.stringify(error).includes('PRIVATE'))
    return true
  })
  assert.deepEqual(data.events,['playwright'])
})

test('module diagnostics distinguish dependency, native, module-format and chunk failures',async()=>{
  for(const [name,code,message,module,category] of [
    ['chromium','MODULE_NOT_FOUND',"Cannot find module 'tar-fs' PRIVATE_TOKEN",'tar-fs','MODULE_NOT_FOUND'],
    ['chromium','ERR_DLOPEN_FAILED','invalid ELF PRIVATE_TOKEN','@sparticuz/chromium','NATIVE_LOAD_FAILED'],
    ['playwright','ERR_REQUIRE_ESM','PRIVATE_TOKEN','playwright-core','MODULE_FORMAT_ERROR'],
    ['capture','MODULE_NOT_FOUND',"Cannot find module '/runtime/.next/server/chunks/605.js' PRIVATE_TOKEN",'capture','CHUNK_LOAD_FAILED'],
    ['capture',undefined,'PRIVATE_TOKEN','capture','IMPORT_EVALUATION_FAILED'],
  ]) {
    const raw=new Error(message);raw.code=code
    const data=fixture({name,error:raw})
    await assert.rejects(loadScreenshotCapture(data.deps,'24.21.0'),error=>{
      assert.deepEqual(error.moduleFailure,{module,category});assert.ok(!JSON.stringify(error).includes('PRIVATE'));return true
    })
  }
  assert.deepEqual(classifyScreenshotModule(new Error('Cannot find package @sparticuz/chromium PRIVATE_TOKEN'),'capture'),
    {module:'@sparticuz/chromium',category:'MODULE_NOT_FOUND'})
})

test('unsupported Node runtime fails before package evaluation; approved runtimes pass',async()=>{
  for(const version of ['20.20.0','22.14.0','23.0.0','invalid']) {
    const data=fixture()
    await assert.rejects(loadScreenshotCapture(data.deps,version),error=>error.moduleFailure.category==='INCOMPATIBLE_RUNTIME')
    assert.deepEqual(data.events,[])
  }
  for(const version of ['22.17.0','24.0.0'])assert.equal(await loadScreenshotCapture(fixture().deps,version).then(value=>typeof value.captureWebsite),'function')
})

test('anonymous and non-admin requests cannot evaluate screenshot packages',async()=>{
  for(const role of ['anonymous','non-admin']) {
    const data=fixture()
    const response=await screenshotResponse(new Request('https://portfolio.vercel.app/admin/screenshot',{method:'POST'}),{
      async authorize(){throw new Error(role)},async capture(){await loadScreenshotCapture(data.deps);return jpeg()},
    })
    assert.equal(response.status,403);assert.deepEqual(data.events,[])
  }
  assert.match(source('src/app/admin/screenshot/route.ts'),/authorize: requireAdmin, capture: async/)
  assert.match(source('src/app/admin/screenshot/route.ts'),/await loadScreenshotCapture\(\)/)
})

test('server module log exposes only fixed module/category enums, never raw error material',()=>{
  const original=console.warn,warnings=[]
  try {
    console.warn=(...args)=>warnings.push(args)
    screenshotDiagnostic('module-load','unavailable',new ScreenshotError('unavailable','module-load',undefined,undefined,
      {module:'playwright-core',category:'PACKAGE_ASSET_MISSING'}))
    const malicious=new Error('PRIVATE_COOKIE');malicious.moduleFailure={module:'PRIVATE_KEY',category:'PRIVATE_TOKEN',extra:'PRIVATE_VALUE'}
    screenshotDiagnostic('module-load','unavailable',malicious)
    malicious.moduleFailure={module:'capture',category:'IMPORT_EVALUATION_FAILED',extra:'PRIVATE_VALUE'}
    screenshotDiagnostic('module-load','unavailable',malicious)
  } finally {console.warn=original}
  assert.equal(warnings[0][1].module,'playwright-core');assert.equal(warnings[0][1].category,'PACKAGE_ASSET_MISSING')
  assert.equal(Object.hasOwn(warnings[1][1],'module'),false)
  assert.ok(!JSON.stringify(warnings).includes('PRIVATE'))
})

test('trace regression rejects a missing Playwright registry or any required runtime/package asset',()=>{
  const root=resolve('/fixture/project'),files=new Set(requiredScreenshotFiles.map(file=>resolve(root,file)))
  assert.doesNotThrow(()=>assertScreenshotTrace(root,files))
  for(const file of requiredScreenshotFiles) {
    const missing=new Set(files);missing.delete(resolve(root,file))
    assert.throws(()=>assertScreenshotTrace(root,missing),new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')))
  }
  assert.match(source('next.config.ts'),/serverExternalPackages: \['@sparticuz\/chromium', 'playwright-core'\]/)
  assert.match(source('next.config.ts'),/node_modules\/playwright-core\/browsers\.json/)
})
