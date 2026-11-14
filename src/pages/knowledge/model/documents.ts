export type KnowledgeDocument = {
  id: string
  name: string
  description: string
  date: number
  file: Blob
}

const fileTypes = new Map([
  ['pdf', 'application/pdf'],
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['txt', 'text/plain'],
])

const numberFormat = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 })

export function documentFromFile(file: File, id: string = crypto.randomUUID()): KnowledgeDocument {
  const extension = file.name.slice(file.name.lastIndexOf('.') + 1).toLowerCase()
  const type = file.name.includes('.') ? fileTypes.get(extension) : undefined
  if (!type || !file.size) throw new Error('Выберите непустой файл PDF, DOCX или TXT.')

  const size = file.size >= 1024 * 1024
    ? numberFormat.format(file.size / (1024 * 1024)) + ' МБ'
    : file.size >= 1024
      ? numberFormat.format(file.size / 1024) + ' КБ'
      : file.size + ' Б'

  return {
    id,
    name: file.name,
    description: extension.toUpperCase() + ' · ' + size,
    date: Date.now(),
    file: file.slice(0, file.size, type),
  }
}

