const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const root = path.resolve(__dirname, '..')
const ts = require(root + '/node_modules/typescript')
const expiresAt = '2026-11-16T20:00:00Z'

function scenario(expiry = expiresAt) {
  const state = [], calls = [], copied = []
  let index = 0
  const jsx = (type, props) => ({ type, props: props || {} })
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'src/pages/support-team/ui/invite-form.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const modules = {
    react: {
      useState(initial) { const key = index++; if (!(key in state)) state[key] = initial; return [state[key], next => { state[key] = typeof next === 'function' ? next(state[key]) : next }] },
      useRef() { return { current: null } },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    '@/shared/ui/select': { Select: 'select' },
    '@/shared/api/client': { request: async (url, options) => { calls.push({ url, ...options, payload: JSON.parse(options.body) }); return { link: 'https://t.me/example?start=invite_test', expires_at: expiry } } },
    './invite-form.module.css': { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) },
  }
  vm.runInNewContext(code, {
    exports, Intl, Date, FormData: class { constructor(form) { this.values = form } get(key) { return this.values[key] ?? null } },
    navigator: { clipboard: { writeText: async value => { copied.push(value) } } },
    require(name) { assert.ok(name in modules, 'Unexpected import: ' + name); return modules[name] },
  })
  function nodes(tree) {
    if (Array.isArray(tree)) return tree.flatMap(nodes)
    return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props.children)] : []
  }
  function render() { index = 0; return nodes(exports.InviteForm()) }
  return {
    render, calls, copied,
    async submit(value = '') {
      await render().find(node => node.type === 'form').props.onSubmit({ preventDefault() {}, currentTarget: { firstName: ' Иван ', lastName: ' Петров ', expiresIn: value } })
    },
    unit(value) { render().find(node => node.type === 'select').props.onChange(value) },
  }
}
async function main() {
  const optional = scenario()
  const field = optional.render().find(node => node.type === 'input' && node.props.name === 'expiresIn')
  assert.ok(field, 'Creation form must expose a lifetime field')
  assert.ok(!field.props.required, 'Lifetime must be optional')
  assert.equal(field.props.min, 1)
  await optional.submit()
  assert.equal(optional.calls[0].url, '/invites')
  assert.equal(optional.calls[0].method, 'POST')
  assert.ok(!Object.hasOwn(optional.calls[0].payload, 'expires_in_minutes'), 'Blank lifetime must preserve the backend default')
  assert.equal(optional.calls[0].payload.first_name, 'Иван')
  assert.equal(optional.render().find(node => node.type === 'time').props.dateTime, expiresAt, 'Deadline must use the response, not the entered duration')
  assert.equal(optional.render().find(node => node.props.id === 'invite-link').props['aria-describedby'], 'invite-expiry')
  await optional.render().find(node => node.type === 'button').props.onClick()
  assert.deepEqual(optional.copied, ['https://t.me/example?start=invite_test'])

  for (const [unit, value, minutes] of [['hours', '2', 120], ['minutes', '15', 15], ['days', '3', 4320]]) {
    const form = scenario()
    form.unit(unit)
    await form.submit(value)
    assert.equal(form.calls[0].payload.expires_in_minutes, minutes, unit + ' must be converted to integer minutes')
  }
  const many = scenario()
  many.render().find(node => node.type === 'input' && node.props.value === 'many').props.onChange()
  many.render().find(node => node.type === 'input' && node.props.name === 'count').props.onChange({ target: { value: '5' } })
  many.unit('minutes'); await many.submit('30')
  assert.equal(many.calls[0].payload.count_of_use, 5)
  assert.equal(many.calls[0].payload.first_name, null)
  assert.equal(many.calls[0].payload.last_name, null)
  assert.equal(many.calls[0].payload.expires_in_minutes, 30)
  for (const value of ['0', '-1', '1.5', 'invalid', '35791395']) {
    const form = scenario()
    await form.submit(value)
    assert.equal(form.calls.length, 0, 'Invalid lifetime must not be sent: ' + value)
    assert.ok(form.render().some(node => node.props.role === 'alert'))
  }
  const maximum = scenario()
  maximum.unit('minutes'); await maximum.submit('2147483647')
  assert.equal(maximum.calls[0].payload.expires_in_minutes, 2147483647)
  const unknown = scenario(null)
  await unknown.submit()
  assert.ok(!unknown.render().some(node => node.type === 'time'), 'Unknown expiry must not invent a deadline')
  assert.equal(unknown.render().find(node => node.props.id === 'invite-expiry').props.children, 'Срок действия ссылки не указан')
  console.log('PASS: optional lifetime, backend default, units, API bounds, one/many invites, response deadline, and copy link')
}
main().catch(error => { console.error(error); process.exitCode = 1 })
