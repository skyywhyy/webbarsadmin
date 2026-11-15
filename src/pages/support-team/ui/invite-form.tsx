import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { request } from '@/shared/api/client'
import { Select } from '@/shared/ui/select'
import styles from './invite-form.module.css'

const expiryUnits = [
  { value: 'hours', label: 'Часы' },
  { value: 'days', label: 'Дни' },
  { value: 'minutes', label: 'Минуты' },
] as const
type ExpiryUnit = (typeof expiryUnits)[number]['value']
const minutesPerUnit = { hours: 60, days: 1440, minutes: 1 }
const maxExpiryMinutes = 2_147_483_647

type InviteLink = { link: string; expires_at: string | null }

export function InviteForm() {
  const [mode, setMode] = useState<'one' | 'many'>('one')
  const [count, setCount] = useState('2')
  const [expiryUnit, setExpiryUnit] = useState<ExpiryUnit>('hours')
  const [invite, setInvite] = useState<InviteLink | null>(null)
  const [copyMessage, setCopyMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const linkInput = useRef<HTMLInputElement>(null)
  const expiryFactor = minutesPerUnit[expiryUnit]
  const maximumExpiry = Math.floor(maxExpiryMinutes / expiryFactor)

  async function generateLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const expiryValue = String(data.get('expiresIn') ?? '').trim()
    const expiryAmount = Number(expiryValue)
    const expiryMinutes = expiryAmount * expiryFactor
    setError('')
    if (expiryValue !== '' && (!Number.isSafeInteger(expiryAmount) || expiryAmount < 1 || expiryMinutes > maxExpiryMinutes)) {
      setError('Укажите срок действия целым числом от 1 до ' + maximumExpiry + '.')
      return
    }
    setLoading(true)
    try {
      const result = await request<InviteLink>('/invites', {
        method: 'POST',
        body: JSON.stringify({
          count_of_use: mode === 'one' ? 1 : Number(count),
          expires_in_minutes: expiryValue === '' ? undefined : expiryMinutes,
          first_name: mode === 'one' ? String(data.get('firstName')).trim() || null : null,
          last_name: mode === 'one' ? String(data.get('lastName')).trim() || null : null,
        }),
      })
      if (!result.link) throw new Error('Ссылка не получена')
      setInvite(result)
      setCopyMessage('')
    } catch {
      setError('Не удалось создать ссылку. Попробуйте ещё раз.')
    } finally {
      setLoading(false)
    }
  }

  async function copyLink() {
    if (!invite) return
    try {
      await navigator.clipboard.writeText(invite.link)
      setCopyMessage('Ссылка скопирована')
    } catch {
      linkInput.current?.focus()
      linkInput.current?.select()
      setCopyMessage('Не удалось скопировать ссылку. Выделите её и скопируйте вручную.')
    }
  }

  if (invite) {
    const expiresAt = invite.expires_at ? Date.parse(invite.expires_at) : NaN
    const expiryLabel = Number.isFinite(expiresAt)
      ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).format(expiresAt)
      : null
    return (
      <div className={styles.content}>
        <div className={styles.inviteLink}>
          <label className={styles.inviteLinkLabel} htmlFor="invite-link">Ссылка на приглашение</label>
          <div className={styles.inviteLinkRow}>
            <input id="invite-link" ref={linkInput} className={styles.inviteLinkInput} value={invite.link} aria-describedby="invite-expiry" readOnly onFocus={(event) => event.currentTarget.select()} />
            <button type="button" className={styles.copyButton} onClick={copyLink} aria-label="Скопировать ссылку" title="Скопировать ссылку">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="8" y="8" width="11" height="11" rx="2" />
                <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
              </svg>
            </button>
          </div>
          <p id="invite-expiry" className={styles.inviteExpiry}>
            {expiryLabel ? <>Ссылка действует до <time dateTime={invite.expires_at ?? undefined}>{expiryLabel}</time></> : 'Срок действия ссылки не указан'}
          </p>
        </div>
        <p className={styles.status} role="status">{copyMessage}</p>
      </div>
    )
  }

  return (
    <form className={styles.content} onSubmit={generateLink}>
      <p className={styles.description}>Создайте ссылку для регистрации в Telegram-боте</p>
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
            <p className={styles.hint}>Имя и фамилию можно не указывать</p>
          </>
        ) : (
          <>
            <label className={styles.field}>
              Количество сотрудников
              <input className={styles.count} name="count" type="number" min="2" step="1" required value={count} onChange={(event) => setCount(event.target.value)} />
            </label>
            <p className={styles.hint}>Ссылка будет рассчитана на указанное количество сотрудников</p>
          </>
        )}
      </div>
      <fieldset className={styles.expiryField}>
        <legend>Срок действия ссылки</legend>
        <div className={styles.expiryControls}>
          <input id="invite-lifetime" name="expiresIn" type="number" min={1} max={maximumExpiry} step={1} placeholder={String(1440 / expiryFactor)} aria-label="Срок действия ссылки" aria-describedby="invite-lifetime-hint" />
          <Select<ExpiryUnit> className={styles.expiryUnit} label="Единица времени" value={expiryUnit} onChange={setExpiryUnit} options={expiryUnits} />
        </div>
        <p id="invite-lifetime-hint" className={styles.hint}>Необязательно, по умолчанию — 24 часа</p>
      </fieldset>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <div className={styles.actions}>
        <button type="submit" className={styles.primary} disabled={loading}>{loading ? 'Создание…' : 'Создать ссылку'}</button>
      </div>
    </form>
  )
}



