import assert from 'node:assert/strict'
import { test } from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { compile, source, hookReact, hookHarness, nodes, moduleUrl } from './cms-demo-test-helpers.mjs'
import { catalogUrl } from './locale-fixture.mjs'
const { messages, translate, projectCount, languageKey, parseLanguage } = await import(catalogUrl)
const { createLanguagePreference } = await import(compile('src/lib/language-preference.ts', { './i18n': catalogUrl }))

function storage(initial) {
  const entries = new Map(initial ? [[languageKey, initial]] : [])
  return { entries, getItem: key => entries.get(key) ?? null, setItem: (key,value) => entries.set(key,value) }
}
test('EN/UK/RU catalog has nonempty translations with matching interpolation fields', () => {
  assert.deepEqual(['en','uk','ru'].map(parseLanguage), ['en','uk','ru'])
  for (const [key, translations] of Object.entries(messages)) {
    assert.equal(translations.length,2)
    const placeholders = key.match(/\{\d+\}/g) ?? []
    for (const text of translations) {
      assert.ok(text.trim().length)
      assert.deepEqual((text.match(/\{\d+\}/g) ?? []).sort(), [...placeholders].sort(),key)
    }
    assert.equal(translate('en',key),key)
  }
})
test('language preference restores after subscription, while SSR/first hydration remain English', async () => {
  const tab=storage('uk'), preference=createLanguagePreference(()=>tab)
  assert.equal(preference.getSnapshot(),'en')
  assert.equal(preference.getServerSnapshot(),'en')
  let notifications=0
  const unsubscribe=preference.subscribe(()=>notifications++)
  await Promise.resolve()
  assert.equal(preference.getSnapshot(),'uk')
  assert.equal(preference.getServerSnapshot(),'en')
  assert.equal(notifications,1)
  preference.setLanguage('ru')
  assert.equal(tab.entries.get(languageKey),'ru')
  assert.equal(notifications,2)
  const refreshed=createLanguagePreference(()=>tab)
  refreshed.subscribe(()=>{})
  assert.equal(refreshed.getSnapshot(),'ru')
  unsubscribe()
})
test('corrupted language values and blocked storage fall back safely without touching other keys', () => {
  for (const value of [null,'','de','UK','{"language":"ru"}','<script>']) {
    const tab=storage(value), preference=createLanguagePreference(()=>tab)
    tab.entries.set('portfolio:cms-demo:v1','demo')
    preference.subscribe(()=>{})
    assert.equal(preference.getSnapshot(),'en')
    preference.setLanguage('uk')
    assert.equal(tab.entries.get('portfolio:cms-demo:v1'),'demo')
  }
  const blocked=createLanguagePreference(()=>{throw new Error('blocked')})
  blocked.subscribe(()=>{})
  assert.equal(blocked.getSnapshot(),'en')
  blocked.setLanguage('ru')
  assert.equal(blocked.getSnapshot(),'ru')
})
test('Ukrainian and Russian project counts use natural singular/few/many forms', () => {
  assert.equal(projectCount('uk',1),'1 проєкт')
  assert.equal(projectCount('uk',2),'2 проєкти')
  assert.equal(projectCount('uk',11),'11 проєктів')
  assert.equal(projectCount('ru',21),'21 проект')
  assert.equal(projectCount('ru',4),'4 проекта')
  assert.equal(projectCount('ru',15),'15 проектов')
  assert.equal(projectCount('uk',1,3),'1 із 3 проєктів')
  assert.equal(projectCount('ru',2,4),'2 из 4 проектов')
})
test('critical public, demo, form and safe error copy is available in every language', () => {
  for (const key of ['Try the Portfolio CMS','Projects','Open CMS Demo','Demo Mode · No sign-in required','Add project','Edit project','Delete project','Save order','Reset order','Reset demo','Clear search to reorder projects.','Demo AI Auto-fill','Retake sample preview','Choose file','Title','Category','Description','Technologies','Visible on portfolio','This field is required.','Choose a JPEG, PNG or WebP image.','Preview image must be 5 MB or smaller.','Demo Mode uses sample repository data. Try the MUSE example.']) {
    assert.ok(messages[key],key)
    assert.notEqual(translate('uk',key),key)
    assert.notEqual(translate('ru',key),key)
  }
})
test('dynamic localized validation/status text preserves interpolated project content', () => {
  assert.equal(translate('uk','Use 120 characters or fewer.'),'Використайте не більше 120 символів.')
  assert.match(translate('ru','MUSE moved to position 2. Demo order is not saved yet.'),/^MUSE:/)
  assert.equal(translate('uk','Unknown content'),'Unknown content')
  assert.equal(translate('uk','constructor'),'constructor')
})
test('language controls expose active state and update document language without navigation', async () => {
  const { LanguageSwitcher }=await import(compile('src/components/LanguageSwitcher.tsx', {react:hookReact,'../lib/i18n':catalogUrl}))
  const previous=globalThis.document
  globalThis.document={documentElement:{lang:'en'}}
  try {
    const ui=hookHarness(LanguageSwitcher,{})
    const ru=ui.find(node=>node.type==='button'&&node.props.lang==='ru')
    assert.equal(ru.props['aria-pressed'],false)
    assert.equal(ru.props['aria-label'],'Русский (RU)')
    ru.props.onClick(); ui.render()
    assert.equal(ui.find(node=>node.type==='button'&&node.props.lang==='ru').props['aria-pressed'],true)
    assert.equal(document.documentElement.lang,'ru')
  } finally {globalThis.document=previous; delete globalThis.testUiLanguage}
})
test('localized cards preserve raw project content and provide a missing-preview fallback', async () => {
  const { ProjectCard }=await import(compile('src/components/ProjectCard.tsx',{react:hookReact}))
  const project={id:'example',title:'Projects',type:'Projects',description:'Projects',tags:['Projects'],image:'/missing.jpg',imageAlt:'Projects project preview',links:[{label:'View project →',href:'/projects/livestopair/'}]}
  const original=structuredClone(project)
  try {
    globalThis.testUiLanguage='uk'
    const ui=hookHarness(ProjectCard,{project})
    const image=ui.find(node=>node.type==='img')
    assert.equal(image.props.alt,'Зображення проєкту Projects')
    assert.equal(ui.find(node=>node.type==='h3').props.children,'Projects')
    assert.equal(ui.find(node=>node.type==='a').props.children,'Переглянути проєкт →')
    image.props.onError();ui.render()
    assert.ok(nodes(ui.find(node=>node.type==='article')).some(node=>node.props?.children==='Зображення недоступне'))
    assert.deepEqual(project,original)
  } finally {delete globalThis.testUiLanguage}
})
test('language catalog/store add no server mutation, provider, auth or network dependency', () => {
  for (const file of ['src/lib/i18n.ts','src/lib/language-preference.ts','src/lib/use-locale.ts','src/components/LanguageSwitcher.tsx']) {
    assert.doesNotMatch(source(file),/supabase|requireAdmin|OPENAI_API_KEY|fetch\(|\/admin\/screenshot|use server|cookie/i)
  }
})
test('three README files are complete, cross-linked and have identical technical commands', () => {
  const docs=['README.md','README.uk.md','README.ru.md'].map(source)
  const fences=text=>[...text.matchAll(/```(?:bash|dotenv)\n([\s\S]*?)```/g)].map(match=>match[1])
  for(const doc of docs) {
    for(const file of ['README.md','README.uk.md','README.ru.md'])assert.ok(doc.split('\n')[0].includes(`](${file})`))
    assert.equal((doc.match(/^## /gm)??[]).length,8)
    for(const technical of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','OPENAI_API_KEY','create_project_first()','reorder_projects()','sessionStorage','localStorage','/cms-demo','/admin/login','RLS','playwright-core'])assert.ok(doc.includes(technical))
    assert.doesNotMatch(doc,/sk-proj-|sb_secret_|eyJhbGci/)
    assert.deepEqual(fences(doc),fences(docs[0]))
  }
})
test('public metadata avoids invented canonicals and admin stays excluded from indexing', async () => {
  assert.match(source('src/app/layout.tsx'),/openGraph:/)
  assert.match(source('src/app/layout.tsx'),/twitter:/)
  assert.doesNotMatch(source('src/app/layout.tsx'),/hreflang|canonical:/)
  assert.match(source('src/app/robots.ts'),/disallow: '\/admin'/)
  assert.match(source('src/app/admin/(protected)/page.tsx'),/index: false/)
  assert.match(source('src/app/admin/login/page.tsx'),/index: false/)
  const {LocalizedText}=await import(compile('src/components/LanguageSwitcher.tsx',{react:hookReact,'../lib/i18n':catalogUrl}))
  try {globalThis.testUiLanguage='ru';assert.equal(renderToStaticMarkup(LocalizedText({children:'Projects'})),'Проекты')}finally{delete globalThis.testUiLanguage}
})

test('empty catalog and missing-page UI are localized without backend calls', async () => {
  const { Projects } = await import(compile('src/components/Projects.tsx', {
    './ProjectCard': moduleUrl('export function ProjectCard() { throw new Error("Empty catalog must not render cards") }'),
  }))
  const { default: NotFound } = await import(compile('src/app/not-found.tsx', {
    '../components/LanguageSwitcher': moduleUrl('export function LanguageSwitcher() { return null }'),
  }))
  try {
    for (const language of ['en', 'uk', 'ru']) {
      globalThis.testUiLanguage = language
      assert.ok(renderToStaticMarkup(Projects({ projects: [] })).includes(translate(language, 'No projects to display yet.')))
      const missing = renderToStaticMarkup(NotFound())
      assert.ok(missing.includes(translate(language, 'Page not found')))
      assert.ok(missing.includes('href="/"'))
    }
  } finally { delete globalThis.testUiLanguage }
})
