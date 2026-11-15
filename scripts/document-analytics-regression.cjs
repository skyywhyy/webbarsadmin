const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const root = path.resolve(__dirname, '..')
const ts = require(root + '/node_modules/typescript')

function compile(relative, modules = {}) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  vm.runInNewContext(code, {
    exports, require(name) {
      assert.ok(name in modules, 'Unexpected import: ' + name)
      return modules[name]
    }, Intl, Date, URLSearchParams, AbortController,
  })
  return exports
}

const jsx = (type, props, key) => ({ type, props: props || {}, key })
const jsxRuntime = { jsx, jsxs: jsx, Fragment: 'fragment' }
const styles = new Proxy({}, { get: (_, key) => key })
const cssModule = { __esModule: true, default: styles }
const settle = () => new Promise(resolve => setImmediate(resolve))
let active
const hooks = {
  useState(initial) {
    const owner = active, index = owner.index++
    if (!(index in owner.state)) owner.state[index] = typeof initial === 'function' ? initial() : initial
    return [owner.state[index], next => { owner.state[index] = typeof next === 'function' ? next(owner.state[index]) : next }]
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
  const owner = { state: [], effects: [], pending: [], index: 0 }
  return {
    render(props = {}) {
      active = owner; owner.index = 0
      const tree = component(props)
      for (const effect of owner.pending.splice(0)) effect()
      return tree
    },
    unmount() { for (const effect of owner.effects) effect?.cleanup?.() },
  }
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  if (!tree || typeof tree !== 'object') return []
  return [tree, ...nodes(tree.props.children)]
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join('')
  if (tree === null || tree === undefined || typeof tree === 'boolean') return ''
  return typeof tree === 'object' ? text(tree.props.children) : String(tree)
}

const fixture = {
  upload_count: 8, total_size_bytes: 2 * 1_048_576, known_size_count: 7,
  mean_processing_ms: 6250, timed_count: 6, first_recorded_at: '2026-11-01T10:00:00Z',
  by_format: { pdf: 3, doc_docx: 2, other: 3 },
  tokens: {
    from_at: '2026-11-14T10:00:00Z', to_at: '2026-11-15T10:00:00Z',
    document_import: { input: 1000, output: 250, by_model: [] },
  },
}

const model = compile('src/pages/home/model/document-analytics.ts')
const technical = compile('src/pages/home/model/technical-analytics.ts')

function pageScenario() {
  const calls = []
  const api = compile('src/pages/home/model/api.ts', {
    '@/shared/api/client': { request(url, options) {
      return new Promise((resolve, reject) => calls.push({ url, ...options, resolve, reject }))
    } },
  })
  const page = compile('src/pages/home/ui/document-analytics.tsx', {
    react: hooks, 'react/jsx-runtime': jsxRuntime,
    '@/shared/ui/select': { Select: 'select' }, '../model/api': api,
    '../model/document-analytics': model, '../model/technical-analytics': technical,
    './home-page.module.css': cssModule,
  })
  const parent = mount(page.DocumentAnalytics)
  let metrics, previousKey
  return {
    calls,
    render() {
      const tree = parent.render()
      const metricNode = nodes(tree).find(node => typeof node.type === 'function')
      if (!metrics || metricNode.key !== previousKey) {
        metrics?.unmount()
        metrics = mount(metricNode.type)
        previousKey = metricNode.key
      }
      return [...nodes(tree), ...nodes(metrics.render(metricNode.props))]
    },
    change(label, value) { this.render().find(node => node.type === 'select' && node.props.label === label).props.onChange(value) },
    unmount() { parent.unmount(); metrics?.unmount() },
  }
}

async function main() {
  const requests = []
  const api = compile('src/pages/home/model/api.ts', { '@/shared/api/client': { request: (url, options) => requests.push({ url, ...options }) } })
  const signal = new AbortController().signal
  api.loadDocumentAnalytics({ format: 'all', size: 'all' }, signal)
  assert.equal(requests.at(-1).url, '/analytics/documents', 'All filters must omit optional query parameters')
  for (const format of model.documentFormats) {
    for (const size of model.documentSizes) {
      api.loadDocumentAnalytics({ format: format.value, size: size.value }, signal)
      const call = requests.at(-1), url = new URL(call.url, 'https://example.test')
      assert.equal(url.pathname, '/analytics/documents')
      assert.equal(url.searchParams.get('format'), format.value === 'all' ? null : format.value)
      assert.equal(url.searchParams.get('size'), size.value === 'all' ? null : size.value)
      assert.equal(call.signal, signal)
      assert.ok(!url.searchParams.has('range') && !url.searchParams.has('period'), 'Documents API has no date filter')
    }
  }
  api.loadTechnicalAnalytics('7d', signal)
  assert.equal(requests.at(-1).url, '/analytics/requests?range=7d', 'Requests must use the current backend endpoint')

  const ready = pageScenario()
  assert.ok(ready.render().some(node => node.props.role === 'status'), 'Initial render must announce loading')
  assert.equal(ready.calls[0].url, '/analytics/documents')
  ready.calls[0].resolve(fixture); await settle()
  let rendered = ready.render()
  const metrics = rendered.find(node => node.type === 'dl' && node.props.className.includes('documentOverview'))
  assert.ok(text(metrics).includes('Загрузок документов8'), 'The upload count must come from the response')
  assert.ok(text(metrics).includes('2 МБ') && text(metrics).includes('6,25'), 'Bytes and milliseconds must use appropriate units')
  assert.ok(text(metrics).includes('Размер известен для 7 из 8 загрузок'))
  assert.ok(text(metrics).includes('Время известно для 6 из 8 загрузок'))
  assert.ok(text(metrics).includes('2026'), 'Show when recording began')
  const chart = rendered.find(node => node.props.role === 'img' && node.props.className === 'formatChart')
  assert.ok(chart.props['aria-label'].includes('PDF: 37,5 %, загрузок: 3'))
  assert.ok(chart.props['aria-label'].includes('DOC / DOCX: 25 %, загрузок: 2'))
  assert.ok(!rendered.some(node => node.props['aria-labelledby'] === 'document-tokens-heading'), 'The removed document token card must stay hidden')
  const requestCount = ready.calls.length
  ready.change('Формат', 'all'); ready.render()
  assert.equal(ready.calls.length, requestCount, 'Reselecting an unchanged filter must not leave the view loading')

  ready.change('Формат', 'pdf')
  rendered = ready.render()
  assert.ok(ready.calls[0].signal.aborted, 'Changing filters must clean up the previous request')
  assert.ok(rendered.some(node => node.props.role === 'status'))
  assert.ok(!rendered.some(node => node.type === 'dl'), 'Old metrics must not appear under new filter labels')
  const stale = ready.calls.at(-1)
  ready.change('Размер', 'over_5_mb'); ready.render()
  assert.ok(stale.signal.aborted, 'A rapid filter change must cancel the pending request')
  assert.equal(ready.calls.at(-1).url, '/analytics/documents?format=pdf&size=over_5_mb')
  stale.resolve(fixture); await settle()
  assert.ok(ready.render().some(node => node.props.role === 'status'), 'A late response must not overwrite the active filter')
  ready.calls.at(-1).reject(new Error('Unavailable')); await settle()
  rendered = ready.render()
  assert.ok(rendered.some(node => node.props.role === 'alert'))
  rendered.find(node => node.type === 'button' && text(node) === 'Повторить').props.onClick()
  assert.ok(ready.render().some(node => node.props.role === 'status'), 'Retry must return to loading')
  assert.equal(ready.calls.at(-1).url, '/analytics/documents?format=pdf&size=over_5_mb', 'Retry must preserve both filters')
  ready.calls.at(-1).resolve({ ...fixture, upload_count: 0, total_size_bytes: 0, known_size_count: 0, mean_processing_ms: null, timed_count: 0, first_recorded_at: null, by_format: { pdf: 0, doc_docx: 0, other: 0 }, tokens: { ...fixture.tokens, document_import: null } }); await settle()
  rendered = ready.render()
  assert.ok(rendered.some(node => text(node) === 'Нет загрузок с выбранными фильтрами'))
  assert.ok(rendered.some(node => text(node) === 'Нет данных о времени обработки'))
  assert.ok(!rendered.some(node => node.props.className === 'formatChart'), 'An empty sample must not draw a misleading zero chart')
  assert.ok(!rendered.some(node => /NaN|Infinity/.test(text(node))))
  ready.unmount()

  const missing = pageScenario()
  missing.render()
  missing.calls[0].resolve({ ...fixture, known_size_count: 0, total_size_bytes: 0, mean_processing_ms: 0, tokens: { ...fixture.tokens, document_import: { input: 0, output: 0, by_model: [] } } }); await settle()
  rendered = missing.render()
  const overview = rendered.find(node => node.type === 'dl' && node.props.className.includes('documentOverview'))
  assert.ok(text(overview).includes('Объём файлов—'), 'Unknown file sizes must not be shown as zero bytes')
  assert.ok(text(overview).includes('Среднее время обработки0с'), 'A measured zero duration must stay zero')
  missing.unmount()

  const pending = pageScenario()
  pending.render(); pending.unmount()
  assert.ok(pending.calls[0].signal.aborted, 'Leaving Documents must abort the in-flight request')
  pending.calls[0].reject(new Error('Aborted')); await settle()

  const home = compile('src/pages/home/ui/home-page.tsx', {
    react: hooks, 'react/jsx-runtime': jsxRuntime, '@/shared/ui/select': { Select: 'select' },
    './document-analytics': { DocumentAnalytics: 'documents' }, './request-analytics': { RequestAnalytics: 'requests' },
    '../model/technical-analytics': technical, './home-page.module.css': cssModule,
  })
  const tabs = mount(home.HomePage)
  let tree = tabs.render()
  assert.ok(nodes(tree).some(node => node.type === 'select' && node.props.label === 'Период'))
  nodes(tree).find(node => node.type === 'button' && text(node) === 'Документы').props.onClick()
  tree = tabs.render()
  assert.equal(text(nodes(tree).find(node => node.type === 'h1')), 'Аналитика документов')
  assert.ok(!nodes(tree).some(node => node.type === 'select'), 'Documents must not offer unsupported date filters')
  assert.ok(text(tree).includes('За всё время'))
  assert.equal(model.formatFirstRecordedAt(null), null)
  assert.equal(model.formatFirstRecordedAt('invalid'), null)
  console.log('Document analytics regression passed: API filters, server metrics, null/zero values, stale responses, cancellation, retry, and tabs.')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
