const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const ts = require(root + '/node_modules/typescript')
function compile(relative, modules) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  vm.runInNewContext(code, { exports, require: name => {
    if (!(name in modules)) throw new Error('Unexpected import: ' + name)
    return modules[name]
  }, Intl, Set, Map, Date, window: {}, File, FormData })
  return exports
}
async function scenario(run) {
  const state = [], refs = [], requests = [], toasts = []
  let si = 0, ri = 0
  let responder = async (url, options) => ({ job_id: 'job-' + requests.length, source_id: 'source-' + requests.length })
  const docs = compile('src/pages/knowledge/model/documents.ts', {
    '@/shared/api/client': { request: async (url, options) => {
      requests.push({ url, options, name: options.body?.get('file').name })
      return responder(url, options)
    } },
  })
  const jsx = (type, props) => ({ type, props: props || {} })
  const page = compile('src/pages/knowledge/ui/knowledge-page.tsx', {
    react: { Fragment: 'fragment', useEffect() {}, useRef(value) { const index = ri++; return refs[index] ||= { current: value } },
      useState(value) { const index = si++; if (!(index in state)) state[index] = value; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next }] } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/shared/ui/toast': { Toast: 'toast', useToast: () => ({ toast: '', showToast: (...args) => toasts.push(args) }) },
    '@/shared/ui/table': { useAnimatedRows: () => ({ bodyRef: {}, removeRow(_id, onRemove) { onRemove() } }) },
    '@/shared/ui/dialog': { useAnimatedDialog: () => ({ dialog: {}, closeDialog() {} }) },
    '@/shared/ui/menu': { animateMenu() {} },
    '@/shared/ui/select': { Select: 'format-select' },
    '../model/documents': docs,
    './knowledge-page.module.css': new Proxy({}, { get: (_, key) => key }),
  })
  function render() {
    si = 0; ri = 0
    const nodes = []
    function visit(node) {
      if (Array.isArray(node)) return node.forEach(visit)
      if (!node || typeof node !== 'object') return
      nodes.push(node); visit(node.props?.children)
    }
    visit(page.KnowledgePage())
    return nodes
  }
  const file = (name, content = 'test') => new File([content], name)
  const settle = () => new Promise(resolve => setImmediate(resolve))
  const drop = (files) => render().find(n => n.props.onDrop).props.onDrop({ dataTransfer: { types: ['Files'], files }, preventDefault() {} })
  await run({ render, requests, toasts, file, settle, drop, respond: fn => responder = fn })
}
async function main() {
  await scenario(async ({ render, requests, file, settle }) => {
    const inputs = render().filter(n => n.type === 'input' && n.props.type === 'file')
    assert.equal(inputs[0].props.multiple, true, 'Add files picker must allow multiple files')
    assert.ok(!inputs[1].props.multiple, 'Replacement must remain single-file')
    const target = { files: [file('one.pdf'), file('two.docx'), file('three.txt')], value: 'selection' }
    inputs[0].props.onChange({ currentTarget: target })
    await settle()
    assert.deepEqual(requests.map(r => r.name), ['one.pdf', 'two.docx', 'three.txt'])
    assert.equal(target.value, '')
  })
  await scenario(async ({ drop, file, requests, settle, toasts, respond, render }) => {
    respond(async (_, options) => {
      if (options.body.get('file').name === 'broken.pdf') throw new Error('Server error')
      return { job_id: 'job-' + requests.length, source_id: 'source-' + requests.length }
    })
    drop([file('one.pdf'), file('bad.exe'), file('broken.pdf'), file('empty.txt', ''), file('last.txt')])
    await settle()
    assert.deepEqual(requests.map(r => r.name), ['one.pdf', 'broken.pdf', 'last.txt'], 'Errors must not stop later uploads')
    const text = JSON.stringify(render())
    assert.ok(text.includes('one.pdf') && text.includes('last.txt'), 'Both successful documents must be visible')
    const message = toasts.at(-1)
    assert.equal(message[1], 'error')
    assert.ok(['bad.exe', 'broken.pdf', 'empty.txt'].every(name => message[0].includes(name)))
  })
  await scenario(async ({ drop, file, requests, settle, respond }) => {
    const pending = new Map()
    let active = 0, maximumActive = 0
    respond((_, options) => new Promise((resolve, reject) => {
      const name = options.body.get('file').name
      active += 1
      maximumActive = Math.max(maximumActive, active)
      pending.set(name, (fail = false) => {
        active -= 1
        pending.delete(name)
        if (fail) reject(new Error('Upload failed'))
        else resolve({ job_id: name, source_id: name })
      })
    }))
    drop([file('one.pdf'), file('two.pdf'), file('three.pdf'), file('four.pdf'), file('five.pdf')])
    drop([file('ignored.pdf')])
    assert.deepEqual(requests.map(r => r.name), ['one.pdf', 'two.pdf'], 'Two files must start immediately; concurrent drops must not interleave')
    pending.get('two.pdf')(); await settle()
    assert.equal(requests.at(-1).name, 'three.pdf', 'Freed slot must start next file while first is still pending')
    pending.get('three.pdf')(true); await settle()
    assert.equal(requests.at(-1).name, 'four.pdf', 'Failed upload must free its slot')
    pending.get('one.pdf')(); await settle()
    assert.equal(requests.at(-1).name, 'five.pdf')
    pending.get('five.pdf')(); await settle()
    drop([file('ignored-again.pdf')])
    assert.equal(requests.length, 5, 'Batch lock must stay held until every upload finishes')
    pending.get('four.pdf')(); await settle()
    assert.equal(maximumActive, 2, 'No more than two simultaneous uploads')
    drop([file('later.pdf')])
    assert.equal(requests.length, 6, 'Upload lock must be released after batch')
    pending.get('later.pdf')(); await settle()
  })
  await scenario(async ({ drop, file, settle, render, requests }) => {
    drop([file('original.pdf')]); await settle()
    render().find(n => n.type === 'button' && n.props.children === 'Заменить документ').props.onClick({ currentTarget: { closest: () => null } })
    const replacement = render().filter(n => n.type === 'input' && n.props.type === 'file')[1]
    replacement.props.onChange({ currentTarget: { files: [file('replacement.txt')], value: 'selection' } })
    await settle()
    assert.equal(requests.at(-1).options.method, 'PUT')
    assert.equal(requests.at(-1).url, '/rag/jobs/job-1')
    assert.equal(requests.at(-1).name, 'replacement.txt')
    assert.ok(!JSON.stringify(render()).includes('original.pdf'))
  })
  await scenario(async ({ drop, file, settle, render }) => {
    drop([...Array.from({ length: 6 }, (_, i) => file(`guide-${i}.pdf`)), file('policy.docx'), file('report.docx'), file('notes.txt')])
    await settle()
    const selectFormat = format => {
      const control = render().find(n => n.type === 'format-select')
      const option = control?.props.options.find(option => option.label === format)
      assert.ok(option, `Format filter must include ${format}`)
      control.props.onChange(option.value)
    }
    const rows = () => render().filter(n => n.type === 'tr' && n.props['data-row-id'])
    const footer = () => render().find(n => n.type === 'p' && n.props['aria-live'] === 'polite').props.children.join('')
    render().find(n => n.type === 'button' && n.props['aria-label'] === 'Страница 2').props.onClick()
    selectFormat('DOCX')
    assert.equal(rows().length, 2, 'Filtering must search all documents, including other pages')
    assert.ok(rows().every(row => JSON.stringify(row).includes('.docx')))
    assert.equal(footer(), 'Показано 1–2 из 2', 'Changing format must reset page and filtered count')
    assert.ok(!render().some(n => n.type === 'button' && n.props['aria-label'] === 'Страница 2'))
    selectFormat('PDF')
    assert.equal(rows().length, 5)
    assert.equal(footer(), 'Показано 1–5 из 6')
    render().find(n => n.type === 'button' && n.props['aria-label'] === 'Следующая страница').props.onClick()
    assert.equal(rows().length, 1)
    assert.equal(footer(), 'Показано 6–6 из 6')
    selectFormat('Все форматы')
    assert.equal(footer(), 'Показано 1–5 из 9', 'Reset must restore all formats on the first page')
  })
  await scenario(async ({ drop, file, settle, render }) => {
    drop([file('original.docx')]); await settle()
    render().find(n => n.type === 'format-select').props.onChange('DOCX')
    render().find(n => n.type === 'button' && n.props.children === 'Заменить документ').props.onClick({ currentTarget: { closest: () => null } })
    const replacement = render().filter(n => n.type === 'input' && n.props.type === 'file')[1]
    replacement.props.onChange({ currentTarget: { files: [file('replacement.txt')], value: 'selection' } })
    await settle()
    assert.ok(render().some(n => n.type === 'h3' && n.props.children === 'Нет документов этого формата'), 'Replacing the last matching document must show a filter empty state')
    assert.ok(render().some(n => n.type === 'format-select' && n.props.value === 'DOCX' && n.props.options.some(option => option.value === 'DOCX')), 'Selected format must remain available when it has no matches')
    render().find(n => n.type === 'button' && n.props.children === 'Показать все').props.onClick()
    assert.ok(JSON.stringify(render().filter(n => n.type === 'tr')).includes('replacement.txt'))
  })
  await scenario(async ({ drop, file, settle, render }) => {
    drop([...Array.from({ length: 6 }, (_, i) => file(`policy-${i}.docx`)), ...Array.from({ length: 5 }, (_, i) => file(`guide-${i}.pdf`))])
    await settle()
    render().find(n => n.type === 'format-select').props.onChange('DOCX')
    render().find(n => n.type === 'button' && n.props['aria-label'] === 'Страница 2').props.onClick()
    render().find(n => n.type === 'button' && n.props.children === 'Удалить документ').props.onClick({ currentTarget: { closest: () => null } })
    render().find(n => n.type === 'button' && n.props.children === 'Удалить').props.onClick()
    await settle()
    const footer = render().find(n => n.type === 'p' && n.props['aria-live'] === 'polite').props.children.join('')
    assert.equal(footer, 'Показано 1–5 из 5', 'Deleting the last row must clamp the page using the filtered count')
  })
  console.log('PASS: picker, batch drop, partial failures, two upload slots, upload lock, replacement, format filtering, filtered pagination, empty state, filtered deletion')
}
main().catch(error => { console.error(error); process.exitCode = 1 })

