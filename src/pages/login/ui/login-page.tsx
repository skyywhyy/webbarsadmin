import { useState } from 'react'
import type { FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { ApiError, getToken, request, setToken } from '@/shared/api/client'
import './login-page.css'

type LoginResponse = { access_token: string; token_type: string }

export function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (getToken()) return <Navigate to="/" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    setError('')
    setLoading(true)
    try {
      const result = await request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: String(data.get('email')).trim(), password: String(data.get('password')) }),
      }, false)
      if (!result.access_token) throw new Error('Токен не получен')
      setToken(result.access_token)
      navigate('/', { replace: true })
    } catch (error) {
      setError(error instanceof ApiError && (error.status === 401 || error.status === 400)
        ? 'Неверная почта или пароль.'
        : 'Не удалось войти. Проверьте соединение и попробуйте снова.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-brand" aria-label="БАРС Груп">БАРС <span>ГРУП</span></div>
      <section className="login-content">
        <h1>Вход в систему</h1>
        <p className="login-description">Панель управления службы поддержки</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Электронная почта</label>
          <input id="email" name="email" type="email" autoComplete="username" required />
          <label htmlFor="password">Пароль</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          {error && <p className="login-message" role="alert">{error}</p>}
          <button type="submit" disabled={loading}>{loading ? 'Вход…' : 'Войти'}</button>
        </form>
      </section>
    </main>
  )
}

