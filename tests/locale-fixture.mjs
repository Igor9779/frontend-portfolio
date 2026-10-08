import { readFileSync } from 'node:fs'
import ts from 'typescript'
const moduleUrl = code => 'data:text/javascript;base64,' + Buffer.from(code).toString('base64')
export const catalogUrl = moduleUrl(ts.transpileModule(readFileSync(new URL('../src/lib/i18n.ts', import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText)
// Existing component tests stay in their original English locale. Dedicated
// localization tests exercise the real preference store and all three catalogs.
export const localeFixture = moduleUrl(`import {translate,projectCount} from '${catalogUrl}';
export function useLocale() { const language=globalThis.testUiLanguage??'en'; return {language,
setLanguage:value=>{globalThis.testUiLanguage=value},t:(message,values)=>translate(language,message,values),countProjects:(count,total)=>projectCount(language,count,total)} }`)
export const textFixture = moduleUrl(`export function LocalizedText({children}) {return children} export function LanguageSwitcher() {return null}`)
