import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <main>
      <h1>Страница не найдена</h1>
      <p>Проверьте адрес или вернитесь на главную страницу.</p>
      <Link to="/">На главную</Link>
    </main>
  )
}
