import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { request } from '@/shared/api/client'
import styles from './invite-form.module.css'

export function InviteForm() {
  const [mode, setMode] = useState<'one' | 'many'>('one')
  const [count, setCount] = useState('2')
  const [link, setLink] = useState('')
  const [copyMessage, setCopyMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const linkInput = useRef<HTMLInputElement>(null)

  async function generateLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setLoading(true)
    setError('')
    try {
      const result = await request<{ link: string }>('/invites', {
        method: 'POST',
        body: JSON.stringify({
          count_of_use: mode === 'one' ? 1 : Number(count),
          first_name: mode === 'one' ? String(data.get('firstName')).trim() || null : null,
          last_name: mode === 'one' ? String(data.get('lastName')).trim() || null : null,
        }),
      })
      if (!result.link) throw new Error('Ссылка не получена')
      setLink(result.link)
      setCopyMessage('')
    } catch {
      setError('Не удалось создать ссылку. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopyMessage('Ссылка скопирована')
    } catch {
      linkInput.current?.focus()
      linkInput.current?.select()
      setCopyMessage('Не удалось скопировать ссылку. Выделите её и скопируйте вручную.')
    }
  }

  if (link) {
    return (
      <div className={styles.content}>
        <div className={styles.inviteLink}>
          <label className={styles.inviteLinkLabel} htmlFor="invite-link">Ссылка на приглашение</label>
          <div className={styles.inviteLinkRow}>
            <input id="invite-link" ref={linkInput} className={styles.inviteLinkInput} value={link} readOnly onFocus={(event) => event.currentTarget.select()} />
            <button type="button" className={styles.copyButton} onClick={copyLink} aria-label="Скопировать ссылку" title="Скопировать ссылку">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="8" y="8" width="11" height="11" rx="2" />
                <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
              </svg>
            </button>
          </div>
        </div>
        <p className={styles.status} role="status">{copyMessage}</p>
      </div>
    )
  }

  return (
    <form className={styles.content} onSubmit={generateLink}>
      <p className={styles.description}>Создайте ссылку для регистрации в Telegram-боте.</p>
      <fieldset className={styles.options}>
        <legend>Количество сотрудников</legend>
        <div className={styles.segmented} data-mode={mode}>
          <label>
            <input type="radio" name="mode" value="one" checked={mode === 'one'} onChange={() => setMode('one')} />
            <span>Один сотрудник</span>
          </label>
          <label>
            <input type="radio" name="mode" value="many" checked={mode === 'many'} onChange={() => setMode('many')} />
            <span>Несколько сотрудников</span>
          </label>
        </div>
      </fieldset>
      <div key={mode} className={styles.modeFields}>
        {mode === 'one' ? (
          <>
            <div className={styles.names}>
              <label className={styles.field}>
                Имя
                <input name="firstName" placeholder="Введите имя" maxLength={100} />
              </label>
              <label className={styles.field}>
                Фамилия
                <input name="lastName" placeholder="Введите фамилию" maxLength={100} />
              </label>
            </div>
            <p className={styles.hint}>Имя и фамилию можно не указывать.</p>
          </>
        ) : (
          <>
            <label className={styles.field}>
              Количество сотрудников
              <input className={styles.count} name="count" type="number" min="2" step="1" required value={count} onChange={(event) => setCount(event.target.value)} />
            </label>
            <p className={styles.hint}>Ссылка будет рассчитана на указанное количество сотрудников.</p>
          </>
        )}
      </div>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={loading}>{loading ? 'Создание…' : 'Создать ссылку'}</button>
      </div>
    </form>
  )
}



