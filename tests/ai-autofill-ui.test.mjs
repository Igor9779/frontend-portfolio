import { localeFixture, textFixture } from './locale-fixture.mjs'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import ts from 'typescript'

const moduleUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
function compile(path, replacements = {}) {
  replacements = { '../../lib/use-locale': localeFixture, '../lib/use-locale': localeFixture, '../../../components/LanguageSwitcher': textFixture, '../LanguageSwitcher': textFixture, ...replacements }
  return moduleUrl(ts.transpileModule(readFileSync(new URL('../'+path,import.meta.url),'utf8'), {
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX},
    transformers:{before:[context=>file=>ts.visitNode(file,function visit(node){
      if(ts.isImportDeclaration(node)&&replacements[node.moduleSpecifier.text]) return ts.factory.updateImportDeclaration(node,node.modifiers,node.importClause,ts.factory.createStringLiteral(replacements[node.moduleSpecifier.text]),node.attributes)
      return ts.visitEachChild(node,visit,context)
    })]},
  }).outputText.replace('from "react/jsx-runtime"',`from "${import.meta.resolve('react/jsx-runtime')}"`))
}
const react = moduleUrl(`
 function slot(initial) {
   const fixture=globalThis.aiUiFixture,index=fixture.index++
   if(!(index in fixture.slots))fixture.slots[index]=typeof initial==='function'?initial():initial
   return [fixture.slots[index],value=>{fixture.slots[index]=typeof value==='function'?value(fixture.slots[index]):value}]
 }
 export const useState=slot
 export function useRef(initial){return slot({current:initial})[0]}
 export function useId(){return 'ai-ui-fixture'}
 export function useEffect(effect){const [done,set]=slot(false);if(!done){globalThis.aiUiFixture.cleanup.push(effect());set(true)}}
 export function useTransition(){const [pending,set]=slot(false);return [pending,fn=>{set(true);const task=fn().finally(()=>set(false));globalThis.aiUiFixture.tasks.push(task)}]}
`)
const repository = compile('src/lib/github-repository.ts')
const {AiAutofill} = await import(compile('src/components/admin/AiAutofill.tsx',{
  react,'next/navigation':moduleUrl('export function unstable_rethrow() {}'),'../../lib/github-repository':repository,
  '../../app/admin/ai-actions':moduleUrl('export async function autofillProject(url){return globalThis.aiUiFixture.invoke(url)}'),
}))
const {ProjectPrefill}=await import(compile('src/components/admin/ProjectPrefill.tsx',{
  react,'./GithubImport':moduleUrl('export function GithubImport() {}'),'./AiAutofill':moduleUrl('export function AiAutofill() {}'),
}))
const fields={title:'Suggested',category:'Frontend',shortDescription:'Suggested short',description:'Suggested description',technologies:['TypeScript']}
function nodes(node){if(!node||typeof node!=='object')return [];if(Array.isArray(node))return node.flatMap(nodes);return [node,...nodes(node.props?.children)]}
function harness({url='https://github.com/Example/Repository',disabled=false,response={success:true,suggestions:fields,warnings:[]},apply=true}={}){
  const state={index:0,slots:[],cleanup:[],tasks:[],calls:[],applied:[],pending:[],response}
  globalThis.aiUiFixture=state
  state.invoke=async url=>{state.calls.push(url);return typeof state.response==='function'?state.response():state.response}
  let element
  const props={repositoryUrl:url,disabled,onStart:()=>true,onPendingChange:value=>state.pending.push(value),onApply:(...args)=>{state.applied.push(args);return apply}}
  function render(){state.index=0;element=AiAutofill(props)}
  function button(){return nodes(element).find(node=>node.type==='button')}
  render()
  return {state,props,render,button,text:()=>nodes(element).filter(node=>node.type==='p').map(node=>node.props.children).join(' '),
    unmount:()=>state.cleanup.forEach(cleanup=>cleanup?.()),done:()=>Promise.all(state.tasks)}
}

test('AI UI requires a known valid repository and disabled clicks do nothing',async()=>{
  for(const options of [{url:''},{url:'https://internal.test/repo'},{disabled:true}]){
    const ui=harness(options);assert.equal(ui.button().props.disabled,true);ui.button().props.onClick();await ui.done()
    assert.deepEqual(ui.state.calls,[]);assert.deepEqual(ui.state.applied,[])
  }
})

test('AI UI shows pending/success and prevents duplicate requests; sends only a repository URL',async()=>{
  let resolve
  const ui=harness({response:()=>new Promise(done=>{resolve=done})})
  ui.button().props.onClick();ui.button().props.onClick();ui.render()
  assert.equal(ui.button().props.disabled,true)
  assert.equal(ui.button().props.children,'Generating…')
  assert.equal(ui.state.calls.length,1)
  resolve({success:true,suggestions:fields,warnings:[]});await ui.done();ui.render()
  assert.deepEqual(ui.state.applied,[[fields,'example/repository']])
  assert.deepEqual(ui.state.pending,[true,false])
  assert.match(ui.text(),/Review and edit/)
})

test('AI failure and thrown errors never invoke the form merge callback',async()=>{
  for(const response of [{success:false,message:'AI usage limit reached. Please try again later.'},()=>{throw new Error('PRIVATE_DETAIL')}]){
    const ui=harness({response});ui.button().props.onClick();await ui.done();ui.render()
    assert.deepEqual(ui.state.applied,[])
    assert.ok(nodes(ui.button()).length)
    assert.equal(ui.text().includes('PRIVATE_DETAIL'),false)
    assert.deepEqual(ui.state.pending,[true,false])
  }
})

test('AI stale-response rejection and unmount leave form state untouched',async()=>{
  const stale=harness({apply:false});stale.button().props.onClick();await stale.done();stale.render()
  assert.match(stale.text(),/repository changed/)
  let resolve
  const gone=harness({response:()=>new Promise(done=>{resolve=done})});gone.button().props.onClick();gone.unmount()
  resolve({success:true,suggestions:fields,warnings:[]});await gone.done()
  assert.deepEqual(gone.state.applied,[])
})

test('real prefill coordinator synchronously prevents GitHub/AI overlap before React rerenders',()=>{
  globalThis.aiUiFixture={index:0,slots:[]}
  const pending=[]
  const element=ProjectPrefill({disabled:false,repositoryUrl:'https://github.com/Example/Repository',onApply(){},onApplySuggestions(){return true},onPendingChange:value=>pending.push(value)})
  const [github,ai]=element.props.children
  assert.equal(github.props.onStart(),true)
  github.props.onPendingChange(true)
  assert.equal(ai.props.onStart(),false)
  github.props.onPendingChange(false)
  assert.equal(ai.props.onStart(),true)
  ai.props.onPendingChange(true);ai.props.onPendingChange(false)
  assert.deepEqual(pending,[true,false,true,false])
})
