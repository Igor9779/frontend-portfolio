// Explicit read-only/local-state release QA. Start localhost:3000 first.
// No administrator credentials, production POSTs, providers or real captures.
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright-core'
import { catalogUrl } from './locale-fixture.mjs'
const {translate}=await import(catalogUrl)
const origin=process.env.PORTFOLIO_QA_ORIGIN ?? 'http://localhost:3000'
assert.equal(new URL(origin).hostname,'localhost')
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,
  env:{PATH:process.env.PATH??'',TMPDIR:'/private/tmp'}})
after(()=>browser.close())
let baseline
const seed=['AI Radar','Deutsch Word App','Domens Tools']
for(const width of [320,375,768,1024,1440])for(const language of ['en','uk','ru'])test(`${language} public/demo/login at ${width}px`,async()=>{
 const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',serviceWorkers:'block'})
 const blocked=[],errors=[],requests=[]
 await context.route('**/*',route=>{
  const request=route.request(),url=new URL(request.url())
  requests.push({host:url.hostname,path:url.pathname,method:request.method()})
  if(!['GET','HEAD'].includes(request.method())||url.pathname==='/admin/screenshot'||['api.openai.com','api.github.com'].includes(url.hostname)){
   blocked.push({host:url.hostname,path:url.pathname,method:request.method()});return route.abort()
  }
  return route.continue()
 })
 const page=await context.newPage()
 page.on('pageerror',error=>errors.push(error.message))
 page.on('console',message=>{if(message.type()==='error')errors.push(message.text())})
 const t=key=>translate(language,key)
 const button=(key)=>page.getByRole('button',{name:t(key),exact:true})
 const fit=async()=>{
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'page overflow')
  assert.equal(await page.locator('dialog[open]').evaluateAll(dialogs=>dialogs.every(d=>d.scrollWidth<=d.clientWidth)),true,'dialog overflow')
  assert.equal(await page.locator('dialog[open] form > div:last-child > div:first-child').evaluateAll(areas=>areas.every(area=>{
   const bounds=area.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(area)
   return [...range.getClientRects()].every(line=>line.right<=bounds.right+1)
  })),true,'dialog feedback must not overlap action buttons')
 }
 const selected=async()=>{
  await page.getByRole('button',{name:{en:'English (EN)',uk:'Українська (UK)',ru:'Русский (RU)'}[language],exact:true}).waitFor()
  await page.waitForFunction(lang=>document.documentElement.lang===lang,language)
  assert.equal(await page.getByRole('button',{name:{en:'English (EN)',uk:'Українська (UK)',ru:'Русский (RU)'}[language],exact:true}).getAttribute('aria-pressed'),'true')
 }
 const snapshot=()=>page.locator('main article').evaluateAll(cards=>cards.map(card=>({
  title:card.querySelector('h3')?.textContent,copy:[...card.querySelectorAll('p')].map(p=>p.textContent),
  tags:[...card.querySelectorAll('span')].map(s=>s.textContent),hrefs:[...card.querySelectorAll('a')].map(a=>a.getAttribute('href')),image:card.querySelector('img')?.getAttribute('src')
 })))
 try {
  await page.goto(origin)
  await page.locator('main article').first().waitFor()
  baseline??=await snapshot()
  assert.ok(baseline.length>0)
  await page.getByRole('button',{name:{en:'English (EN)',uk:'Українська (UK)',ru:'Русский (RU)'}[language],exact:true}).focus()
  await page.keyboard.press('Enter')
  await selected();await fit()
  assert.equal(await page.getByRole('heading',{name:t('Try the Portfolio CMS'),exact:true}).count(),1)
  assert.deepEqual(await snapshot(),baseline,'project content/order must not be translated')
  const positions=await page.locator('header, #cms-demo-heading, #projects-heading').evaluateAll(elements=>elements.map(el=>el.getBoundingClientRect().top))
  assert.ok(positions[0]<positions[1]&&positions[1]<positions[2])
  await page.reload();await selected();assert.deepEqual(await snapshot(),baseline)
  await page.keyboard.press('Tab')
  const focused=await page.evaluate(()=>({tag:document.activeElement.tagName,href:document.activeElement.getAttribute('href'),outline:getComputedStyle(document.activeElement).outlineStyle,position:getComputedStyle(document.activeElement).position}))
  assert.equal(focused.href,'#main-content');assert.notEqual(focused.outline,'none')
  assert.equal(focused.position,'fixed','skip link must not shift layout on focus/blur')
  await page.getByRole('link',{name:t('Open CMS Demo'),exact:true}).click()
  await button('Add project').waitFor();await selected();await fit()
  await page.goBack();await selected();assert.deepEqual(await snapshot(),baseline)
  await page.goto(origin+'/cms-demo');await button('Add project').waitFor();await selected();await fit()
  assert.deepEqual(await context.cookies(),[])
  assert.deepEqual(await page.locator('li[data-project-id] h2').allTextContents(),seed)
  await page.getByRole('searchbox',{name:t('Search projects')}).fill('nothing-matches')
  await page.getByText(t('No projects match your search.'),{exact:true}).waitFor()
  await page.getByRole('searchbox',{name:t('Search projects')}).fill('')
  await button('Add project').click()
  let dialog=page.getByRole('dialog')
  await page.locator('input[name=title]').waitFor()
  assert.equal(await page.locator('input[name=title]').evaluate(el=>el===document.activeElement),true)
  await page.locator('input[name=title]').fill('Draft preserved')
  await page.locator('textarea[name=description]').fill('Temporary local text')
  await page.locator('input[type=file]').dispatchEvent('cancel',{bubbles:true})
  assert.equal(await page.locator('input[name=title]').inputValue(),'Draft preserved')
  await button('Choose file').waitFor()
  await page.locator('input[type=file]').setInputFiles({name:'bad.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')})
  await page.getByText(t('Choose a JPEG, PNG or WebP image.'),{exact:true}).waitFor()
  await page.locator('input[type=file]').setInputFiles({name:'preview.png',mimeType:'image/png',buffer:readFileSync(new URL('./fixtures/preview.png',import.meta.url))})
  await page.getByText('preview.png',{exact:true}).waitFor()
  assert.equal(await page.locator('input[name=title]').inputValue(),'Draft preserved')
  await fit()
  await page.getByLabel(t('GitHub repository'),{exact:true}).fill('https://github.com/example/unsupported')
  await button('Import from GitHub').click()
  await page.getByText(t('Demo Mode uses sample repository data. Try the MUSE example.'),{exact:true}).waitFor()
  assert.equal(await page.locator('input[name=title]').inputValue(),'Draft preserved')
  await button('Use MUSE example').click();await button('Import from GitHub').click()
  await button('Importing…').waitFor()
  await page.getByText(t('Sample repository imported. Review and edit before saving.'),{exact:true}).waitFor()
  await page.getByText(t('Sample preview selected. This is a local demo image, not a website capture.'),{exact:true}).waitFor()
  const preview=await page.getByAltText(t('Selected preview image')).getAttribute('src')
  await button('Demo AI Auto-fill').click();await button('Generating…').waitFor()
  await page.getByText(t('Sample suggestions applied. Review and edit before saving.'),{exact:true}).waitFor()
  assert.equal(await page.locator('input[name=title]').inputValue(),'MUSE — AI Creator Showcase')
  assert.equal(await page.getByAltText(t('Selected preview image')).getAttribute('src'),preview)
  await fit()
  await dialog.locator('div.overflow-y-auto').evaluate(el=>{el.scrollTop=0})
  await page.screenshot({path:`/private/tmp/stage15-${language}-${width}-dialog.png`})
  await button('Save project').focus();await page.keyboard.press('Tab')
  assert.equal(await dialog.evaluate(el=>el.contains(document.activeElement)),true)
  await button('Save project').click();await dialog.waitFor({state:'hidden'})
  await page.waitForFunction(()=>document.querySelector('li[data-project-id] h2')?.textContent==='MUSE — AI Creator Showcase')
  const first=page.locator('li[data-project-id]').first()
  await first.getByRole('button',{name:t('Move {0} down').replace('{0}','MUSE — AI Creator Showcase'),exact:true}).click()
  assert.equal(await button('Add project').isDisabled(),true)
  await button('Reset order').click()
  await first.getByRole('button',{name:t('Move {0} down').replace('{0}','MUSE — AI Creator Showcase'),exact:true}).click()
  await button('Save order').click()
  await page.reload();await button('Add project').waitFor();await selected()
  assert.equal((await page.locator('li[data-project-id] h2').allTextContents())[1],'MUSE — AI Creator Showcase')
  await button('Reset demo').click();await dialog.getByRole('button',{name:t('Reset demo'),exact:true}).click();await dialog.waitFor({state:'hidden'})
  await page.waitForFunction(expected=>JSON.stringify([...document.querySelectorAll('li[data-project-id] h2')].map(el=>el.textContent))===JSON.stringify(expected),seed)
  await button('Add project').click();await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'})
  await fit()
  await page.goto(origin+'/admin/login');await selected();await fit()
  await page.getByRole('heading',{name:t('Administrator sign in'),exact:true}).waitFor()
  assert.equal(await page.getByLabel(t('Password'),{exact:true}).getAttribute('type'),'password')
  await page.goto(origin+'/admin');assert.match(page.url(),/\/admin\/login/);await selected()
  await page.goto(origin);await selected();assert.deepEqual(await snapshot(),baseline);await fit()
  await page.screenshot({path:`/private/tmp/stage15-${language}-${width}-home.png`,fullPage:false})
  assert.deepEqual(blocked,[]);assert.deepEqual(errors,[])
  assert.ok(requests.every(r=>r.method==='GET'||r.method==='HEAD'))
  console.log(JSON.stringify({language,width,publicProjects:baseline.length,projectContentUnchanged:true,consoleErrors:errors.length,forbiddenRequests:blocked.length}))
 }catch(error){
  console.log(JSON.stringify({language,width,page:new URL(page.url()).pathname,errors,headings:await page.locator('h1,h2').allTextContents(),buttons:await page.locator('button').allTextContents()}))
  throw error
 }finally{await context.close()}
})
