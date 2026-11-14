export type Employee = {
  id: string
  firstName: string
  lastName: string
  username: string
  telegramId?: string
}

export const demoEmployees: Employee[] = [
  { id: '1', firstName: 'Анна', lastName: 'Смирнова', username: 'anna_smirnova', telegramId: '102483761' },
  { id: '2', firstName: 'Дмитрий', lastName: 'Волков', username: 'dmitry_volkov', telegramId: '208517394' },
  { id: '3', firstName: 'Екатерина', lastName: 'Морозова', username: 'ekaterina_m', telegramId: '315628470' },
  { id: '4', firstName: 'Ольга', lastName: 'Соколова', username: 'olga_sokolova', telegramId: '427391805' },
  { id: '5', firstName: 'Михаил', lastName: 'Петров', username: 'demo_mikhail', telegramId: '500000005' },
  { id: '6', firstName: 'Ирина', lastName: 'Орлова', username: 'demo_irina', telegramId: '500000006' },
  { id: '7', firstName: 'Павел', lastName: 'Козлов', username: 'demo_pavel', telegramId: '500000007' },
  { id: '8', firstName: 'Наталья', lastName: 'Лебедева', username: 'demo_natalya', telegramId: '500000008' },
  { id: '9', firstName: 'Алексей', lastName: 'Новиков', username: 'demo_alexey', telegramId: '500000009' },
  { id: '10', firstName: 'Мария', lastName: 'Кузнецова', username: 'demo_maria', telegramId: '500000010' },
  { id: '11', firstName: 'Сергей', lastName: 'Попов', username: 'demo_sergey', telegramId: '500000011' },
  { id: '12', firstName: 'Юлия', lastName: 'Фёдорова', username: 'demo_yulia', telegramId: '500000012' },
]

const storageKey = 'webbarsadmin:support-team:v1'

export function loadEmployees(): Employee[] {
  try {
    const saved = localStorage.getItem(storageKey)
    if (saved === null) return demoEmployees

    const parsed: unknown = JSON.parse(saved)
    return Array.isArray(parsed) ? parsed : demoEmployees
  } catch {
    return demoEmployees
  }
}

export function saveEmployees(employees: Employee[]) {
  localStorage.setItem(storageKey, JSON.stringify(employees))
}
