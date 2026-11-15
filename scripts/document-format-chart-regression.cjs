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
const job = (format, index) => ({ id: String(index), title: 'File ' + index, format, size_bytes: 100, created_at: new Date().toISOString(), status: 'succeeded' })
const formats = ['PDF', ' pdf ', 'DOC', 'DOCX', 'TXT', 'HTML', 'MD', 'RTF']
const documents = formats.map((format, index) => model.toAnalyticsDocument(job(format, index)))
const settle = () => new Promise(resolve => setImmediate(resolve))

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props.children)] : []
}
async function scenario(data, period) {
  let currentPeriod = period, loads = 0
  const state = []
  let cursor = 0, effectStarted = false
  const jsx = (type, props) => ({ type, props: props || {} })
  const page = compile('src/pages/home/ui/document-format-chart.tsx', {
    react: {
      useState(initial) {
        const index = cursor++
        if (!(index in state)) state[index] = typeof initial === 'function' ? initial() : initial
        return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next }]
      },
      useEffect(effect) { if (!effectStarted) { effectStarted = true; effect() } },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/shared/ui/select': { Select: 'select' },
    '../model/api': { loadAnalyticsDocuments: async () => { loads++; return data } },
    '../model/analytics': model,
    './home-page.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) },
  })
  function render() { cursor = 0; return nodes(page.DocumentFormatChart({ period: currentPeriod })) }
  render(); await settle()
  return { render, setPeriod(next) { currentPeriod = next }, get loads() { return loads } }
}
async function main() {
  assert.deepEqual(JSON.parse(JSON.stringify(model.countDocumentFormats(documents))), [
    { label: 'DOC', count: 1 }, { label: 'DOCX', count: 1 }, { label: 'HTML', count: 1 },
    { label: 'MD', count: 1 }, { label: 'PDF', count: 2 }, { label: 'RTF', count: 1 }, { label: 'TXT', count: 1 },
  ], 'Every real format needs its own count, including future formats and separate DOC/DOCX')
  assert.equal(model.countDocumentFormats([]).length, 0)
  const now = Date.parse('2026-11-16T12:00:00Z')
  const dated = [0, 30 * 60_000, 3_600_000, 86_400_000, 7 * 86_400_000, 7 * 86_400_000 + 1, -1, null].map((age, index) => ({
    ...documents[0], id: String(index), createdAt: age === null ? null : now - age,
  }))
  for (const [range, expected, milliseconds] of [['1h', 3, 3_600_000], ['24h', 4, 86_400_000], ['7d', 5, 7 * 86_400_000]]) {
    const period = model.createDocumentPeriod(range, now)
    assert.equal(period.toAt - period.fromAt, milliseconds)
    assert.equal(model.filterDocuments(dated, { format: 'all', size: 'all', period }).length, expected, range + ' must include its boundaries and exclude future or unknown dates')
  }
  assert.equal(model.filterDocuments(dated, { format: 'all', size: 'all' }).length, 8)
  const recent = { ...documents[0], createdAt: now - 30 * 60_000 }
  const older = { ...documents[3], createdAt: now - 2 * 3_600_000 }
  const periodChart = await scenario([recent, older], model.createDocumentPeriod('1h', now))
  assert.deepEqual(periodChart.render().filter(node => node.props.className === 'formatName').map(node => node.props.children), ['PDF'])
  periodChart.setPeriod(model.createDocumentPeriod('24h', now))
  assert.deepEqual(periodChart.render().filter(node => node.props.className === 'formatName').map(node => node.props.children), ['DOCX', 'PDF'])
  periodChart.render().find(node => node.type === 'select' && node.props.label === 'Формат').props.onChange('DOCX')
  periodChart.setPeriod(model.createDocumentPeriod('1h', now))
  assert.ok(!periodChart.render().some(node => node.props.className === 'formatBar'), 'Period must combine with existing format filters and support an empty result')
  assert.equal(periodChart.loads, 1, 'Changing period must reuse loaded history')
  const page = await scenario(documents)
  let rendered = page.render()
  const columns = rendered.filter(node => node.props.className === 'formatName')
  assert.deepEqual(columns.map(node => node.props.children), ['DOC', 'DOCX', 'HTML', 'MD', 'PDF', 'RTF', 'TXT'])
  assert.ok(!columns.some(node => node.props.children === 'Другие'))
  const bars = rendered.filter(node => node.props.className === 'formatBar')
  assert.equal(bars.length, 7)
  assert.equal(bars.find(node => node.props.title.startsWith('PDF:')).props.style.height, '25%')
  assert.equal(bars.find(node => node.props.title.startsWith('RTF:')).props.style.height, '12.5%')
  rendered.find(node => node.type === 'select' && node.props.label === 'Формат').props.onChange('RTF')
  rendered = page.render()
  assert.deepEqual(rendered.filter(node => node.props.className === 'formatName').map(node => node.props.children), ['RTF'])
  assert.equal(rendered.find(node => node.props.className === 'formatBar').props.style.height, '100%')
  const newFormat = await scenario([model.toAnalyticsDocument(job('xml', 'new'))])
  rendered = newFormat.render()
  assert.deepEqual(Array.from(rendered.find(node => node.type === 'select' && node.props.label === 'Формат').props.options, option => option.label), ['Все форматы', 'XML'], 'Demo formats must not create chart/filter categories')
  assert.equal(rendered.find(node => node.props.className === 'formatName').props.children, 'XML')
  const empty = await scenario([])
  assert.ok(!empty.render().some(node => node.props.className === 'formatBar'))
  const requests = []
  const api = compile('src/pages/home/model/api.ts', {
    './analytics': model,
    '@/shared/api/client': { request: async url => {
      requests.push(url)
      return { total: 101, items: requests.length === 1 ? Array.from({ length: 100 }, (_, index) => job('PDF', index)) : [job('rtf', 100)] }
    } },
  })
  const loaded = await api.loadAnalyticsDocuments(new AbortController().signal)
  assert.equal(requests.length, 2)
  assert.ok(requests.every(url => new URL(url, 'https://example.test').searchParams.get('include_history') === 'true'))
  assert.ok(model.countDocumentFormats(loaded).some(item => item.label === 'RTF' && item.count === 1), 'Formats on later API pages must appear too')
  console.log('PASS: named formats, automatic new formats, normalization, counts, filtering, empty state, no demo formats, and pagination')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
