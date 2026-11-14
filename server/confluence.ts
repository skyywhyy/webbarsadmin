import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Plugin } from 'vite'

type SearchResult = { content?: { id?: string; type?: string; title?: string }; title?: string; url?: string; lastModified?: string }
type SearchResponse = { results?: SearchResult[]; _links?: { next?: string } }

export function confluencePlugin(defaults: { url?: string; email?: string; token?: string }): Plugin {
  return {
    name: 'local-confluence',
    configureServer(server) {
      server.middlewares.use('/local-confluence/delete', async (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        const send = (status: number, body: object) => { res.statusCode = status; res.end(JSON.stringify(body)) }
        if (req.method !== 'POST') return send(405, { error: 'Метод не поддерживается.' })
        try {
          const origin = new URL(req.headers.origin || '')
          if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) || origin.host !== req.headers.host) throw new Error()
        } catch { return send(403, { error: 'Запрос разрешён только с локальной страницы.' }) }
        try {
          if (!defaults.url || !defaults.email?.trim() || !defaults.token?.trim()) {
            return send(400, { error: 'Проверьте настройки Confluence в .env и перезапустите сервер.' })
          }
          const site = new URL(defaults.url)
          if (site.protocol !== 'https:' || !/^[a-z0-9-]+\.atlassian\.net$/i.test(site.hostname) || site.port || site.username || site.password) {
            return send(400, { error: 'Некорректный адрес Confluence Cloud.' })
          }
          let body = ''
          for await (const chunk of req) {
            body += chunk
            if (body.length > 4096) return send(413, { error: 'Слишком большой запрос.' })
          }
          let input: { id?: unknown; type?: unknown }
          try { input = JSON.parse(body) } catch { return send(400, { error: 'Некорректный запрос.' }) }
          if (!input || typeof input.id !== 'string' || !((input.type === 'page' && /^\d+$/.test(input.id)) || (input.type === 'attachment' && /^(?:att)?\d+$/.test(input.id)))) {
            return send(400, { error: 'Некорректный тип или идентификатор документа.' })
          }
          const resource = input.type === 'page' ? 'pages' : 'attachments'
          const auth = Buffer.from(`${defaults.email.trim()}:${defaults.token.trim()}`).toString('base64')
          const response = await fetch(new URL(`/wiki/api/v2/${resource}/${input.id}`, site.origin), {
            method: 'DELETE', headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' },
            redirect: 'error', signal: AbortSignal.timeout(30000),
          })
          if (!response.ok) {
            if (response.status === 401 || response.status === 403) return send(response.status, { error: 'Confluence отклонил удаление. Проверьте права аккаунта и токен.' })
            if (response.status === 404) return send(404, { error: 'Документ не найден или у аккаунта нет к нему доступа. Обновите список.' })
            return send(502, { error: `Confluence не удалил документ (ошибка ${response.status}).` })
          }
          send(200, { deleted: true })
        } catch {
          send(502, { error: 'Не удалось связаться с Confluence. Проверьте подключение и обновите список.' })
        }
      })
      server.middlewares.use('/local-confluence/search', async (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.setHeader('Cache-Control', 'no-store')
        const send = (status: number, body: object) => { res.statusCode = status; res.end(JSON.stringify(body)) }
        if (req.method !== 'POST') return send(405, { error: 'Метод не поддерживается.' })
        // This endpoint accepts credentials only from the local Vite page.
        try {
          const origin = new URL(req.headers.origin || '')
          if (!['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) || origin.host !== req.headers.host) throw new Error()
        } catch { return send(403, { error: 'Запрос разрешён только с локальной страницы.' }) }
        try {
          if (!defaults.url || !defaults.email?.trim() || !defaults.token?.trim()) {
            return send(400, { error: 'Укажите CONFLUENCE_URL, CONFLUENCE_EMAIL и CONFLUENCE_TOKEN в .env и перезапустите сервер.' })
          }
          const site = new URL(defaults.url)
          if (site.protocol !== 'https:' || !/^[a-z0-9-]+\.atlassian\.net$/i.test(site.hostname) || site.port || site.username || site.password) {
            return send(400, { error: 'Укажите адрес Confluence Cloud вида https://company.atlassian.net/wiki.' })
          }
          const email = defaults.email.trim()
          const token = defaults.token.trim()
          const base = site.origin
          const auth = Buffer.from(`${email}:${token}`).toString('base64')
          const first = new URL('/wiki/rest/api/search', base)
          first.searchParams.set('cql', 'type in (page, attachment)')
          first.searchParams.set('limit', '100')
          let next: URL | null = first
          const seen = new Set<string>()
          const documents: { id: string; name: string; description: string; date: number; url: string; confluenceType: string }[] = []
          while (next) {
            if (next.origin !== base || !next.pathname.startsWith('/wiki/rest/api/search') || seen.has(next.href)) throw new Error('Некорректная ссылка на следующую страницу результатов.')
            seen.add(next.href)
            const response = await fetch(next, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' }, redirect: 'error', signal: AbortSignal.timeout(30000) })
            if (!response.ok) {
              if (response.status === 401 || response.status === 403) return send(response.status, { error: 'Confluence отклонил доступ. Проверьте email, токен и права доступа.' })
              return send(502, { error: `Confluence вернул ошибку ${response.status}.` })
            }
            const data = await response.json() as SearchResponse
            if (!Array.isArray(data.results)) throw new Error('Неожиданный ответ Confluence.')
            for (const item of data.results) {
              const content = item.content
              if (!content?.id || !item.url || !['page', 'attachment'].includes(content.type || '')) continue
              const path = item.url.startsWith('/wiki/') ? item.url : '/wiki' + (item.url.startsWith('/') ? item.url : '/' + item.url)
              const link = new URL(path, base)
              if (link.origin !== base) continue
              const date = Date.parse(item.lastModified || '')
              documents.push({ id: `confluence:${content.id}`, name: content.title || item.title || 'Без названия', description: content.type === 'page' ? 'Confluence · страница' : 'Confluence · вложение', date: Number.isFinite(date) ? date : Date.now(), url: link.href, confluenceType: content.type! })
            }
            const nextLink = data._links?.next
            next = nextLink ? new URL(nextLink.startsWith('/wiki/') ? nextLink : '/wiki' + (nextLink.startsWith('/') ? nextLink : '/' + nextLink), base) : null
          }
          send(200, { documents })
        } catch {
          send(502, { error: 'Не удалось загрузить данные Confluence. Проверьте адрес и доступ к сети.' })
        }
      })
    },
  }
}
