const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const ts = require(root + '/node_modules/typescript')
function compile(relative, modules) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
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
      requests.push({ url, options, name: options.body.get('file').name })
      return responder(url, options)
    } },
  })
  const jsx = (type, props) => ({ type, props: props || {} })
  const page = compile('src/pages/knowledge/ui/knowledge-page.tsx', {
    react: { Fragment: 'fragment', useEffect() {}, useRef(value) { const index = ri++; return refs[index] ||= { current: value } },
      useState(value) { const index = si++; if (!(index in state)) state[index] = value; return [state[index], next => { state[index] = typeof next === 'function' ? next(state[index]) : next }] } },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/shared/ui/toast': { Toast: 'toast', useToast: () => ({ toast: '', showToast: (...args) => toasts.push(args) }) },
    '@/shared/ui/table': { useAnimatedRows: () => ({ bodyRef: {}, removeRow() {} }) },
    '@/shared/ui/dialog': { useAnimatedDialog: () => ({ dialog: {}, closeDialog() {} }) },
    '@/shared/ui/menu': { animateMenu() {} },
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
  console.log('PASS: picker, batch drop, partial failures, two upload slots, upload lock, replacement')
}
main().catch(error => { console.error(error); process.exitCode = 1 })

