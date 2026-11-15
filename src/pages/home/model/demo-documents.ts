import type { AnalyticsDocument } from './analytics'

type DemoDocument = AnalyticsDocument & { processingSeconds: number | null }

const samples = [
  { name: 'Инструкция пользователя.pdf', format: 'PDF', mb: 2.4, seconds: 18.6, days: 0 },
  { name: 'Регламент службы поддержки.docx', format: 'DOCX', mb: 0.82, seconds: 9.2, days: 1 },
  { name: 'Частые вопросы.txt', format: 'TXT', mb: 0.14, seconds: 2.8, days: 2 },
  { name: 'Руководство администратора.pdf', format: 'PDF', mb: 6.8, seconds: 46.3, days: 3 },
  { name: 'Настройка интеграций.docx', format: 'DOCX', mb: 1.7, seconds: 14.8, days: 4 },
  { name: 'Справочник ошибок.txt', format: 'TXT', mb: 0.36, seconds: 4.1, days: 5 },
  { name: 'БАРС Офис — возможности.pdf', format: 'PDF', mb: 8.5, seconds: 58.4, days: 6 },
  { name: 'Быстрый старт.pdf', format: 'PDF', mb: 1.2, seconds: 11.7, days: 8 },
  { name: 'Правила регистрации.docx', format: 'DOCX', mb: 0.68, seconds: 7.5, days: 10 },
  { name: 'Сценарии обработки обращений.docx', format: 'DOCX', mb: 3.1, seconds: 25.2, days: 12 },
  { name: 'Контакты подразделений.txt', format: 'TXT', mb: 0.06, seconds: 1.9, days: 15 },
  { name: 'Каталог оборудования.pdf', format: 'PDF', mb: 11.2, seconds: 74.5, days: 18 },
  { name: 'Памятка сотрудника.pdf', format: 'PDF', mb: 0.92, seconds: 8.4, days: 22 },
  { name: 'Инструкция по безопасности.docx', format: 'DOCX', mb: 2.2, seconds: 19.3, days: 28 },
  { name: 'Архив решений.txt', format: 'TXT', mb: 1.4, seconds: 10.6, days: 34 },
  { name: 'Описание сервисов.pdf', format: 'PDF', mb: 4.6, seconds: 33.8, days: 38 },
  { name: 'Новый регламент.docx', format: 'DOCX', mb: 1.1, seconds: null, days: 0, status: 'running' },
  { name: 'Архивная инструкция.pdf', format: 'PDF', mb: 3.8, seconds: null, days: 4, status: 'failed' },
] as const

export function createDemoDocuments(now = Date.now()): DemoDocument[] {
  return samples.map((sample, index) => ({
    id: 'demo-document-' + (index + 1),
    name: sample.name,
    format: sample.format,
    sizeBytes: Math.round(sample.mb * 1_048_576),
    createdAt: now - sample.days * 86_400_000 - 3_600_000,
    status: 'status' in sample ? sample.status : 'succeeded',
    processingSeconds: sample.seconds,
  }))
}
