import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { request } from '@/shared/api/client'
import styles from './invite-form.module.css'

type Props = {
  onClose: () => void
}

export function InviteForm({ onClose }: Props) {
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
      setCopyMessage('Не удалось скопировать ссылку. Скопируйте её из поля.')
    }
  }

  if (link) {
    return (
      <div className={styles.content}>
        <label className={styles.field}>
          Ссылка на приглашение
          <input ref={linkInput} value={link} readOnly onFocus={(event) => event.currentTarget.select()} />
        </label>
        <p className={styles.status} role="status">{copyMessage}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={() => { setLink(''); setCopyMessage('') }}>Назад</button>
          <button type="button" className={styles.primary} onClick={copyLink}>Копировать</button>
        </div>
      </div>
    )
  }

  return (
    <form className={styles.content} onSubmit={generateLink}>
      <p className={styles.description}>Создайте ссылку для регистрации в Telegram-боте.</p>
      <fieldset className={styles.options}>
        <legend>Количество сотрудников</legend>
        <div className={styles.segmented}>
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
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.secondary} onClick={onClose}>Отмена</button>
        <button type="submit" className={styles.primary} disabled={loading}>{loading ? 'Создание…' : 'Создать ссылку'}</button>
      </div>
    </form>
  )
}



