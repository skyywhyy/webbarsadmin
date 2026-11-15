const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const root = path.resolve(__dirname, '..')
const ts = require(root + '/node_modules/typescript')

function compile(relative, modules = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  vm.runInNewContext(code, { exports, Intl, Date, Map, Set, AbortController, URLSearchParams, require(name) {
    assert.ok(name in modules, 'Unexpected import: ' + name)
    return modules[name]
  } })
  return exports
}
const model = compile('src/pages/home/model/analytics.ts')
const technical = compile('src/pages/home/model/technical-analytics.ts')
const jsx = (type, props) => ({ type, props: props || {} })
const jsxRuntime = { jsx, jsxs: jsx }
const cssModule = { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) }
const settle = () => new Promise(resolve => setImmediate(resolve))
let active
const hooks = {
  useState(initial) {
    const owner = active, index = owner.index++
    if (!(index in owner.state)) owner.state[index] = typeof initial === 'function' ? initial() : initial
    return [owner.state[index], next => { owner.updates++; owner.state[index] = typeof next === 'function' ? next(owner.state[index]) : next }]
  },
  useEffect(effect, deps) {
    const owner = active, index = owner.index++
    const previous = owner.effects[index]
    if (previous && deps.every((dep, i) => Object.is(dep, previous.deps[i]))) return
    owner.pending.push(() => {
      previous?.cleanup?.()
      owner.effects[index] = { deps, cleanup: effect() }
    })
  },
}
function mount(component) {
  const owner = { state: [], effects: [], pending: [], index: 0, updates: 0 }
  return {
    render() {
      active = owner; owner.index = 0
      const tree = component()
      for (const effect of owner.pending.splice(0)) effect()
      return tree
    },
    unmount() { for (const effect of owner.effects) effect?.cleanup?.() },
    get updates() { return owner.updates },
  }
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props.children)] : []
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('')
  if (tree === null || tree === undefined || typeof tree === 'boolean') return ''
  return typeof tree === 'object' ? text(tree.props.children) : String(tree)
}
const fixture = {
  range: '24h', from_at: '2026-11-15T10:00:00Z', to_at: '2026-11-16T10:00:00Z',
  upload_count: 17, total_size_bytes: 3.75 * 1_048_576, known_size_count: 14,
  mean_processing_ms: 12340, timed_count: 9, first_recorded_at: '2026-11-01T10:00:00Z',
  by_format: { pdf: 8, doc_docx: 3, other: 6 },
  tokens: { from_at: '2026-11-14T10:00:00Z', to_at: '2026-11-15T10:00:00Z', document_import: null },
}
function scenario() {
  let period = model.createDocumentPeriod('24h', Date.parse('2026-11-16T12:00:00Z'))
  const calls = []
  const api = compile('src/pages/home/model/api.ts', {
    './analytics': model,
    '@/shared/api/client': { request(url, options) {
      return new Promise((resolve, reject) => calls.push({ url, ...options, resolve, reject }))
    } },
  })
  const page = compile('src/pages/home/ui/document-analytics.tsx', {
    react: hooks, 'react/jsx-runtime': jsxRuntime,
    '../model/api': api, '../model/analytics': model, '../model/technical-analytics': technical,
    './document-format-chart': { DocumentFormatChart: 'format-chart' },
    './home-page.module.css': cssModule,
  })
  return { calls, page: mount(() => page.DocumentAnalytics({ period })), setPeriod(next) { period = next } }
}
async function main() {
  const ready = scenario()
  let tree = ready.page.render()
  assert.ok(nodes(tree).some(node => node.props.role === 'status'))
  assert.ok(nodes(tree).some(node => node.type === 'format-chart'), 'Chart must load independently of the summary')
  assert.equal(ready.calls[0].url, '/analytics/documents?range=24h', 'Summary must request the selected period')
  ready.calls[0].resolve(fixture); await settle()
  tree = ready.page.render()
  assert.ok(text(tree).includes('Загрузок документов17'))
  assert.ok(text(tree).includes('3,8 МБ') && text(tree).includes('12,34с'), 'Use backend bytes and milliseconds')
  assert.ok(!text(tree).includes('Токены обработки'), 'Removed token block must not return')
  const chartPeriod = nodes(tree).find(node => node.type === 'format-chart').props.period
  assert.equal(chartPeriod.fromAt, Date.parse(fixture.from_at), 'Chart must use the server window instead of the client clock')
  assert.equal(chartPeriod.toAt, Date.parse(fixture.to_at))
  assert.ok(!text(tree).includes('за всё время'), 'Page must describe the selected period')
  ready.page.unmount()
  assert.ok(ready.calls[0].signal.aborted)

  const retry = scenario()
  retry.page.render()
  retry.calls[0].reject(new Error('Unavailable')); await settle()
  tree = retry.page.render()
  assert.ok(nodes(tree).some(node => node.props.role === 'alert'))
  assert.ok(nodes(tree).some(node => node.type === 'format-chart'), 'Summary failure must not hide the chart')
  nodes(tree).find(node => node.type === 'button').props.onClick()
  tree = retry.page.render()
  assert.ok(nodes(tree).some(node => node.props.role === 'status'))
  assert.ok(retry.calls[0].signal.aborted)
  assert.equal(retry.calls[1].url, '/analytics/documents?range=24h')
  retry.calls[1].resolve({ ...fixture, total_size_bytes: 0, known_size_count: 0, mean_processing_ms: null, timed_count: 0 }); await settle()
  tree = retry.page.render()
  assert.ok(text(tree).includes('Объём файлов—'), 'Unknown size must not be presented as zero')
  assert.ok(text(tree).includes('Среднее время обработки—'))
  retry.page.unmount()

  const zero = scenario()
  zero.page.render()
  zero.calls[0].resolve({ ...fixture, total_size_bytes: 0, mean_processing_ms: 0 }); await settle()
  tree = zero.page.render()
  assert.ok(text(tree).includes('Объём файлов0 Б'))
  assert.ok(text(tree).includes('Среднее время обработки0с'), 'A measured zero must stay zero')
  zero.page.unmount()
  const pending = scenario()
  pending.page.render(); pending.page.unmount()
  assert.ok(pending.calls[0].signal.aborted)
  pending.calls[0].resolve(fixture); await settle()
  assert.equal(pending.page.updates, 0, 'A response after leaving Documents must not update state')

  const switching = scenario()
  switching.page.render()
  switching.calls[0].resolve(fixture); await settle()
  assert.ok(text(switching.page.render()).includes('Загрузок документов17'))
  switching.setPeriod(model.createDocumentPeriod('1h'))
  tree = switching.page.render()
  assert.equal(switching.calls[1].url, '/analytics/documents?range=1h')
  assert.ok(switching.calls[0].signal.aborted)
  assert.ok(nodes(tree).some(node => node.props.role === 'status'))
  assert.ok(!text(tree).includes('Загрузок документов17'), 'Old-period summary must disappear immediately')
  switching.setPeriod(model.createDocumentPeriod('7d'))
  switching.page.render()
  assert.ok(switching.calls[1].signal.aborted)
  assert.equal(switching.calls[2].url, '/analytics/documents?range=7d')
  switching.calls[1].resolve({ ...fixture, range: '1h', upload_count: 777 }); await settle()
  assert.ok(!text(switching.page.render()).includes('777'), 'An older period response must not replace the selected period')
  switching.calls[2].resolve({ ...fixture, range: '7d', upload_count: 9, from_at: '2026-11-09T10:00:00Z' }); await settle()
  tree = switching.page.render()
  assert.ok(text(tree).includes('Загрузок документов9'))
  assert.equal(nodes(tree).find(node => node.type === 'format-chart').props.period.fromAt, Date.parse('2026-11-09T10:00:00Z'))
  switching.page.unmount()

  const home = compile('src/pages/home/ui/home-page.tsx', {
    react: hooks, 'react/jsx-runtime': jsxRuntime, '@/shared/ui/select': { Select: 'select' },
    './document-analytics': { DocumentAnalytics: 'documents' }, './request-analytics': { RequestAnalytics: 'requests' },
    '../model/technical-analytics': technical, '../model/analytics': model, './home-page.module.css': cssModule,
  })
  const tabs = mount(home.HomePage)
  tree = tabs.render()
  assert.ok(nodes(tree).some(node => node.type === 'select' && node.props.label === 'Период'))
  nodes(tree).find(node => node.type === 'button' && text(node) === 'Документы').props.onClick()
  tree = tabs.render()
  assert.ok(text(tree).includes('Аналитика документов'))
  const documentSelect = nodes(tree).find(node => node.type === 'select' && node.props.label === 'Период')
  assert.ok(documentSelect, 'Documents must expose the same period choices as requests')
  assert.deepEqual(Array.from(documentSelect.props.options, option => option.value), ['1h', '24h', '7d'])
  assert.equal(documentSelect.props.value, '24h')
  documentSelect.props.onChange('1h')
  tree = tabs.render()
  const documentPeriod = nodes(tree).find(node => node.type === 'documents').props.period
  assert.equal(documentPeriod.range, '1h')
  assert.equal(documentPeriod.toAt - documentPeriod.fromAt, 3_600_000)
  nodes(tree).find(node => node.type === 'button' && text(node) === 'Обращения').props.onClick()
  tree = tabs.render()
  assert.equal(nodes(tree).find(node => node.type === 'select').props.value, '24h', 'Document period must not change the request period')
  console.log('PASS: document analytics endpoint, backend summary values, missing/zero data, retry, cancellation, independent chart, and supported periods')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
