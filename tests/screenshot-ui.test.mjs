import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { compile, moduleUrl, hookReact, hookHarness, source, settled, jpeg } from './screenshot-test-helpers.mjs'

const pendingModule = compile('src/lib/pending-preview.ts')
const fileModule = compile('src/lib/preview-file.ts')
const validation = compile('src/lib/project-validation.ts')
const repository = compile('src/lib/github-repository.ts')
const aiModule = compile('src/lib/ai-suggestions.ts', { './github-repository':repository })
const clientModule = compile('src/components/admin/screenshot-client.ts')
const { requestScreenshot, screenshotEligibility } = await import(clientModule)
const { PendingPreviewFiles } = await import(pendingModule)
const { ProjectScreenshot } = await import(compile('src/components/admin/ProjectScreenshot.tsx', {
  react:hookReact, '../../lib/preview-file':fileModule,
  './screenshot-client':moduleUrl(`export {screenshotEligibility} from '${clientModule}';export async function requestScreenshot(...args){return globalThis.screenshotUiFixture.capture(...args)}`),
}))
const { PreviewImageInput } = await import(compile('src/components/admin/PreviewImageInput.tsx', {
  react:hookReact,'../../lib/preview-file':fileModule,'../../lib/project-validation':validation,
}))
const { ProjectFormDialog } = await import(compile('src/components/admin/ProjectFormDialog.tsx', {
  react:hookReact,'next/navigation':moduleUrl('export function unstable_rethrow(){}'),
  '../../lib/project-validation':validation,'../../lib/ai-suggestions':aiModule,'../../lib/pending-preview':pendingModule,
  './Dialog':moduleUrl('export function Dialog(){}'),'./Icon':moduleUrl('export function Icon(){}'),
  './TechnologyInput':moduleUrl('export function TechnologyInput(){}'),'./PreviewImageInput':moduleUrl('export function PreviewImageInput(){}'),
}))
const url='https://project.vercel.app/'
const screenshot = () => new File([jpeg()], 'project-screenshot.jpg', {type:'image/jpeg'})
function screenshotHarness({capture=async()=>screenshot(),productionUrl=url,autoCapture=null,onAccept=()=>true}={}) {
  const accepted=[],pending=[]
  const ui=hookHarness(ProjectScreenshot,{disabled:false,productionUrl,autoCapture,previewRevision:0,
    onAccept(...args){accepted.push(args);return onAccept(...args)},onPendingChange(value){pending.push(value)}},{capture})
  return {...ui,accepted,pending,button(){return ui.find(node=>node.type==='button')},feedback(){return ui.find(node=>node.props?.role==='status').props.children}}
}

test('automatic capture starts after import, returns a pending JPEG File, and remains independent of import/AI',async()=>{
  const ui=screenshotHarness({autoCapture:{url,sequence:1}})
  await settled();ui.render()
  assert.equal(ui.accepted.length,1)
  assert.equal(ui.accepted[0][0].type,'image/jpeg')
  assert.equal(ui.accepted[0][0].name,'project-screenshot.jpg')
  assert.deepEqual(ui.accepted[0].slice(1),[url,0])
  assert.deepEqual(ui.pending,[true,false])
  assert.match(ui.feedback(),/selected/)
  ui.render();await settled();assert.equal(ui.accepted.length,1)
  assert.ok(!/ai-actions|github-actions|project-actions|supabase|openai/.test(source('src/components/admin/ProjectScreenshot.tsx')))
  ui.unmount()
})

test('missing or custom-domain homepage is skipped locally without capture or draft changes',async()=>{
  for(const productionUrl of ['', 'https://custom.example/', 'http://project.vercel.app/']){
    let calls=0
    const ui=screenshotHarness({productionUrl,autoCapture:{url:productionUrl,sequence:1},capture:async()=>{calls++;return screenshot()}})
    await settled();ui.render();assert.equal(calls,0);assert.equal(ui.accepted.length,0);assert.deepEqual(ui.pending,[false])
    assert.match(ui.feedback(),/file|HTTPS/);ui.unmount()
  }
  assert.ok(screenshotEligibility('https://vercel.app.attacker.example/'))
})

test('one automatic import attempt followed by explicit Retake makes two intentional requests',async()=>{
  let calls=0
  const ui=screenshotHarness({autoCapture:{url,sequence:1},capture:async()=>{calls++;throw new Error('Unable to capture this site.')}})
  await settled();ui.render()
  assert.equal(calls,1)
  ui.render();await settled();assert.equal(calls,1)
  ui.button().props.onClick();await settled();ui.render()
  assert.equal(calls,2)
  assert.equal(ui.accepted.length,0)
  assert.deepEqual(ui.pending,[true,false,true,false])
  ui.unmount()
})

test('Retake uses current URL, prevents concurrent requests and preserves previous preview on failure',async()=>{
  let resolve,calls=0
  const ui=screenshotHarness({capture:()=>{calls++;return new Promise(done=>{resolve=done})}})
  ui.button().props.onClick();ui.button().props.onClick();ui.render()
  assert.equal(calls,1);assert.equal(ui.button().props.disabled,true);assert.equal(ui.button().props.children,'Capturing…')
  resolve(screenshot());await settled();ui.render();assert.equal(ui.accepted.length,1)
  ui.state.capture=async()=>{throw new Error('Unable to capture this site.')}
  ui.button().props.onClick();await settled();ui.render()
  assert.equal(ui.accepted.length,1);assert.match(ui.feedback(),/Unable/)
  assert.deepEqual(ui.pending,[true,false,true,false]);ui.unmount()
})

test('changed URL, newer manual preview, rejected merge and unmount discard stale screenshot responses',async()=>{
  for(const change of ['url','url-roundtrip','preview','merge','unmount']){
    let resolve
    const ui=screenshotHarness({capture:()=>new Promise(done=>{resolve=done}),onAccept:()=>change!=='merge'})
    ui.button().props.onClick()
    if(change==='url' || change==='url-roundtrip')ui.props.productionUrl='https://other.vercel.app/'
    if(change==='preview')ui.props.previewRevision=1
    if(change==='unmount')ui.unmount()
    else ui.render()
    if(change==='url-roundtrip'){ui.props.productionUrl=url;ui.render()}
    resolve(screenshot());await settled();if(change!=='unmount')ui.render()
    assert.equal(ui.accepted.length,change==='merge'?1:0)
    if(change!=='unmount'){assert.match(ui.feedback(),/changed/);ui.unmount()}
  }
})

test('pending object URLs are allocated before replacement and released on replace/clear/unmount',()=>{
  const revoked=[],files=new PendingPreviewFiles({createObjectURL:()=> 'blob:fixture-'+files.revision,revokeObjectURL:url=>revoked.push(url)})
  const first=files.replace(screenshot()),second=files.replace(screenshot())
  assert.deepEqual(revoked,[first.src]);assert.equal(files.selection,second)
  files.urls.createObjectURL=()=>{throw new Error('Allocation failed')}
  assert.throws(()=>files.replace(screenshot()))
  assert.equal(files.selection,second);assert.deepEqual(revoked,[first.src])
  files.dispose();files.dispose();assert.deepEqual(revoked,[first.src,second.src])
})

test('native picker Cancel preserves screenshot; accepted manual file replaces it and invalid file does not',async()=>{
  const selected={file:screenshot(),src:'blob:generated'},accepted=[],valid=[]
  const ui=hookHarness(PreviewImageInput,{currentPreview:null,selection:selected,sourceUrl:'',onSourceChange(){},
    onFileChange:file=>accepted.push(file),onValidityChange:value=>valid.push(value)})
  const input=ui.find(node=>node.props?.type==='file')
  input.props.ref.current={files:[],value:''}
  await input.props.onChange();ui.render()
  assert.deepEqual(accepted,[]);assert.deepEqual(valid,[])
  assert.equal(ui.props.selection,selected)
  const manual=new File([readFileSync(new URL('fixtures/preview.png',import.meta.url))],'manual.png',{type:'image/png'})
  input.props.ref.current.files=[manual]
  await input.props.onChange();ui.render();assert.equal(accepted[0],manual)
  input.props.ref.current.files=[new File(['<svg/>'],'unsafe.svg',{type:'image/svg+xml'})]
  await input.props.onChange();ui.render();assert.equal(accepted.length,1)
  ui.unmount()
})

test('binary transfer uses only the protected local route and rejects HTML/oversized/non-JPEG responses',async()=>{
  const original=globalThis.fetch,calls=[]
  try{
    globalThis.fetch=async (...args)=>{calls.push(args);return new Response(jpeg(),{headers:{'Content-Type':'image/jpeg'}})}
    const file=await requestScreenshot(url,new AbortController().signal)
    assert.equal(file.type,'image/jpeg');assert.equal(file.name,'project-screenshot.jpg')
    assert.equal(calls[0][0],'/admin/screenshot')
    assert.equal(calls[0][1].redirect,'error');assert.equal(calls[0][1].credentials,'same-origin')
    assert.deepEqual(JSON.parse(calls[0][1].body),{productionUrl:url})
    for(const response of [new Response('<html/>',{headers:{'Content-Type':'text/html'}}),new Response(new Uint8Array(2*1024*1024+1),{headers:{'Content-Type':'image/jpeg'}}),
      Response.json({message:'Unable to capture this site.'},{status:502}),new Response('<login/>',{status:403})]){
      globalThis.fetch=async()=>response
      await assert.rejects(requestScreenshot(url,new AbortController().signal))
    }
    globalThis.fetch=async()=>{throw new Error('INTERNAL_TRANSPORT_DIAGNOSTIC')}
    await assert.rejects(requestScreenshot(url,new AbortController().signal),error=>/Unable to capture/.test(error.message)&&!error.message.includes('INTERNAL'))
  }finally{globalThis.fetch=original}
})

function FixturePrefill(){}
function FixturePreviewTools(){}
function formHarness(){
  const changes=[],saves=[]
  const ui=hookHarness(ProjectFormDialog,{mode:'add',onClose(){},onSaved(){},prefill:FixturePrefill,previewTools:FixturePreviewTools,
    onDraftChange:draft=>changes.push(draft),async onSave(data){saves.push(data);return {success:false,message:'Fixture only'}}})
  return {...ui,changes,saves,prefill(){return ui.find(node=>node.type===FixturePrefill).props},tools(){return ui.find(node=>node.type===FixturePreviewTools).props},
    preview(){return ui.find(node=>node.type?.name==='PreviewImageInput').props},field(name){return ui.find(node=>node.props?.name===name)}}
}
const imported={title:'Imported',shortDescription:'Short',description:'Imported description',githubUrl:'https://github.com/example/repo',githubRepository:'example/repo',productionUrl:url,technologies:['TypeScript']}

test('actual shared form applies import immediately, schedules capture and persists only text',()=>{
  const form=formHarness()
  form.prefill().onApply(imported);form.render()
  assert.equal(form.field('title').props.value,'Imported')
  assert.equal(form.tools().autoCapture.url,url)
  assert.equal(form.changes.at(-1).values.productionUrl,url)
  form.tools().onPendingChange(true);form.render()
  const prevented=[]
  form.find(node=>node.type==='form').props.onSubmit({preventDefault(){prevented.push(true)}})
  assert.equal(prevented.length,1)
  form.tools().onPendingChange(false);form.render()
  assert.equal(form.field('description').props.value,imported.description)
  assert.equal(form.saves.length,0)
  form.unmount()
})

test('generated and manual files share Save FormData; AI preserves file and does not schedule capture',async()=>{
  const form=formHarness()
  form.prefill().onApply(imported);form.render()
  const generated=screenshot(),tools=form.tools()
  assert.equal(tools.onAccept(generated,url,tools.previewRevision),true);form.render()
  const selected=form.preview().selection,auto=form.tools().autoCapture
  const suggestions={title:'Suggested',category:'Frontend',shortDescription:'Suggested short',description:'Suggested description',technologies:['React']}
  assert.equal(form.prefill().onApplySuggestions(suggestions,'example/repo'),true);form.render()
  assert.equal(form.preview().selection,selected)
  assert.equal(form.tools().autoCapture,auto)
  assert.equal(form.field('productionUrl').props.value,url)
  assert.equal(form.field('githubUrl').props.value,imported.githubUrl)
  const serialized=JSON.stringify(form.changes.at(-1))
  assert.equal(serialized.includes('blob:'),false);assert.equal(serialized.includes('project-screenshot.jpg'),false)
  await form.find(node=>node.type==='form').props.action(new FormData())
  assert.equal(form.saves[0].get('previewFile'),generated)
  const manual=new File([readFileSync(new URL('fixtures/preview.webp',import.meta.url))],'manual.webp',{type:'image/webp'})
  form.preview().onFileChange(manual);form.render()
  await form.find(node=>node.type==='form').props.action(new FormData())
  assert.equal(form.saves[1].get('previewFile'),manual)
  assert.equal(tools.onAccept(generated,url,tools.previewRevision),false)
  form.unmount()
})

test('Cancel closes and releases a pending screenshot without calling Save or persisting binary draft data',()=>{
  const form=formHarness()
  let closed=0
  form.props.onClose=()=>closed++
  form.render();form.prefill().onApply(imported);form.render()
  const tools=form.tools()
  assert.equal(tools.onAccept(screenshot(),url,tools.previewRevision),true);form.render()
  form.find(node=>node.type==='button' && node.props.children==='Cancel').props.onClick()
  form.unmount()
  assert.equal(closed,1);assert.equal(form.saves.length,0)
  assert.ok(!JSON.stringify(form.changes).includes('blob:'))
})
