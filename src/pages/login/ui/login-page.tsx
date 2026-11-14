import type { FormEvent } from 'react'
import { useNavigate } from 'react-router'
import barsLogo from '@/assets/bars-logo.svg'
import './login-page.css'

export function LoginPage() {
  const navigate = useNavigate()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    navigate('/')
  }

  return (
    <main className="login-page">
      <img className="login-brand" src={barsLogo} alt="БАРС Груп" />
      <section className="login-content">
        <h1>Вход в систему</h1>
        <p className="login-description">Панель управления службы поддержки</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="login">Логин</label>
          <input id="login" name="login" autoComplete="username" required />
          <label htmlFor="password">Пароль</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          <button type="submit">Войти</button>
        </form>
      </section>
    </main>
  )
}

