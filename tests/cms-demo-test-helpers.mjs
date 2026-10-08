import { readFileSync } from 'node:fs'
import ts from 'typescript'

export const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8')
export const moduleUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
export function compile(path, replacements = {}) {
  return moduleUrl(ts.transpileModule(source(path), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    transformers: { before: [context => file => ts.visitNode(file, function visit(node) {
      if (ts.isImportDeclaration(node) && replacements[node.moduleSpecifier.text]) return ts.factory.updateImportDeclaration(
        node, node.modifiers, node.importClause, ts.factory.createStringLiteral(replacements[node.moduleSpecifier.text]), node.attributes)
      return ts.visitEachChild(node, visit, context)
    })] },
  }).outputText.replace('from "react/jsx-runtime"', `from "${import.meta.resolve('react/jsx-runtime')}"`))
}
export const hookReact = moduleUrl(`
  const fixture = () => globalThis.demoUiFixture
  function slot(initial) {
    const state = fixture(), index = state.index++
    if (!(index in state.slots)) state.slots[index] = typeof initial === 'function' ? initial() : initial
    return [state.slots[index], value => { state.slots[index] = typeof value === 'function' ? value(state.slots[index]) : value }]
  }
  export const useState = slot
  export function useRef(initial) { return slot({current:initial})[0] }
  export function useId() { return 'demo-fixture' }
  export function useEffect(effect,deps) {
    const [prior,set] = slot(null)
    if (!deps || !prior || deps.some((value,index)=>value!==prior.deps[index])) fixture().effects.push(()=>{
      prior?.cleanup?.(); const cleanup=effect(); set({deps,cleanup})
    })
  }
  export function useActionState(action,initial) { const [value,set]=slot(initial); return [value,async data=>{const result=await action(value,data);set(result);return result},false] }
`)
export function nodes(node) {
  if (!node || typeof node !== 'object') return []
  if (Array.isArray(node)) return node.flatMap(nodes)
  return [node, ...nodes(node.props?.children)]
}
export function hookHarness(component, props, extra = {}) {
  const state = { index: 0, slots: [], effects: [], ...extra }
  let element
  function render() {
    globalThis.demoUiFixture = state; state.index = 0; state.effects = []
    element = component(props)
    state.effects.forEach(effect => effect())
  }
  render()
  return { state, props, render, find(predicate) { const found = nodes(element).find(predicate); if (!found) throw new Error('Missing UI control'); return found },
    unmount() { state.slots.forEach(slot => slot?.cleanup?.()) } }
}
export const settled = () => new Promise(resolve => setImmediate(resolve))
