import { request } from '@/shared/api/client'

export type Employee = {
  id: string
  first_name: string | null
  last_name: string | null
  username: string | null
  telegram_id: number
}

export type EmployeePage = {
  items: Employee[]
  total: number
  page: number
  page_size: number
}

export function loadEmployees(page: number, pageSize: number, signal?: AbortSignal) {
  const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) })
  return request<EmployeePage>('/employees?' + params, { signal })
}

export function createEmployee(telegramId: number, firstName: string, lastName: string) {
  return request<Employee>('/employees', {
    method: 'POST',
    body: JSON.stringify({ telegram_id: telegramId, first_name: firstName || null, last_name: lastName || null }),
  })
}

export function deleteEmployee(id: string) {
  return request<void>('/employees/' + encodeURIComponent(id), { method: 'DELETE' })
}
