import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Employee } from '../model/employees'
import styles from './support-team-page.module.css'

export type EmployeeDialogState =
  | { kind: 'invite' | 'add' }
  | { kind: 'edit' | 'delete'; employee: Employee }

type Props = {
  state: EmployeeDialogState
  employees: Employee[]
  saveError: string
  onClose: () => void
  onSave: (employees: Employee[], message: string) => void
}

const titles = {
  invite: 'Пригласить сотрудника',
  add: 'Добавить пользователя',
  edit: 'Данные сотрудника',
  delete: 'Удалить сотрудника?',
}

export function EmployeeDialog({ state, employees, saveError, onClose, onSave }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState('')
  const employee = 'employee' in state ? state.employee : undefined
  const isEditing = state.kind === 'edit'

  useEffect(() => {
    dialog.current?.showModal()
  }, [])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const firstName = String(data.get('firstName')).trim()
    const lastName = String(data.get('lastName')).trim()
    const username = String(data.get('username')).trim().replace(/^@/, '')

    if (!firstName || !lastName || !/^[A-Za-z0-9_]{5,32}$/.test(username)) {
      setError('Укажите имя, фамилию и Telegram username из 5–32 латинских букв, цифр или знаков подчёркивания.')
      return
    }

    if (employees.some((entry) => entry.id !== employee?.id && entry.username.toLowerCase() === username.toLowerCase())) {
      setError('Сотрудник с таким Telegram username уже есть в списке.')
      return
    }

    const next = employee
      ? employees.map((entry) => entry.id === employee.id ? { ...entry, firstName, lastName, username } : entry)
      : [{ id: crypto.randomUUID(), firstName, lastName, username }, ...employees]
    onSave(next, isEditing ? 'Данные сотрудника сохранены' : 'Сотрудник добавлен')
  }

  return (
    <dialog ref={dialog} onClose={onClose} className={styles.dialog} aria-labelledby="employee-dialog-title">
      <header className={styles.dialogHeader}>
        <h2 id="employee-dialog-title">{titles[state.kind]}</h2>
        <button
          className={styles.iconButton}
          type="button"
          onClick={() => dialog.current?.close()}
          aria-label="Закрыть"
        >
          ×
        </button>
      </header>
      {saveError && <p className={styles.error} role="alert">{saveError}</p>}
      {state.kind === 'invite' ? (
        <p>Приглашения по ссылке доступны после подключения Telegram-бота. Пока сотрудника можно добавить по имени пользователя.</p>
      ) : state.kind === 'delete' && employee ? (
        <>
          <p>{employee.firstName} {employee.lastName} · @{employee.username}</p>
          <div className={styles.dialogActions}>
            <button className={styles.secondaryButton} onClick={() => dialog.current?.close()}>Отмена</button>
            <button
              className={styles.deleteButton}
              onClick={() => onSave(employees.filter((entry) => entry.id !== employee.id), 'Сотрудник удалён')}
            >
              Удалить сотрудника
            </button>
          </div>
        </>
      ) : (
        <form className={styles.employeeForm} onSubmit={submit}>
          <div className={styles.nameFields}>
            <label>
              Имя
              <input name="firstName" placeholder="Введите имя" defaultValue={employee?.firstName} maxLength={100} required />
            </label>
            <label>
              Фамилия
              <input name="lastName" placeholder="Введите фамилию" defaultValue={employee?.lastName} maxLength={100} required />
            </label>
          </div>
          <label>
            Username пользователя Telegram
            <input name="username" placeholder="@username" defaultValue={employee && '@' + employee.username} maxLength={33} required />
          </label>
          {error && <p className={styles.error} role="alert">{error}</p>}
          <div className={styles.dialogActions}>
            <button className={styles.primaryButton} type="submit">{isEditing ? 'Сохранить' : 'Добавить'}</button>
          </div>
        </form>
      )}
    </dialog>
  )
}
