import styles from './knowledge-page.module.css'

const demoDocuments = [
  { name: 'Инструкция пользователя.pdf', format: 'PDF · 2,4 МБ', date: '12.11.2026', status: 'Ошибка загрузки' },
  { name: 'Частые вопросы.docx', format: 'DOCX · 840 КБ', date: '10.11.2026', status: 'Готов' },
  { name: 'Регламент поддержки.pdf', format: 'PDF · 1,1 МБ', date: '09.11.2026', status: 'Обрабатывается' },
]

export function KnowledgePage() {
  return (
    <main className={styles.page}>
      <h1>База знаний</h1>
      <h2 id="knowledge-documents">Документы в базе знаний</h2>
      <p>Демонстрационный список документов</p>
      <table aria-labelledby="knowledge-documents">
        <thead>
          <tr>
            <th scope="col">Документ</th>
            <th scope="col">Дата загрузки</th>
            <th scope="col">Статус</th>
          </tr>
        </thead>
        <tbody>
          {demoDocuments.map(({ name, format, date, status }) => (
            <tr key={name}>
              <th scope="row">{name}<small>{format}</small></th>
              <td>{date}</td>
              <td>{status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
}
