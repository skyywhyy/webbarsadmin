const tokenKey = 'webbarsadmin:access-token'

export function getToken() {
  return sessionStorage.getItem(tokenKey)
}

export function setToken(token: string) {
  sessionStorage.setItem(tokenKey, token)
}

export function clearToken() {
  sessionStorage.removeItem(tokenKey)
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function request<T>(path: string, options: RequestInit = {}, authenticated = true): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json')
  const token = getToken()
  if (authenticated && token) headers.set('Authorization', 'Bearer ' + token)

  const response = await fetch('/api' + path, { ...options, headers })
  if (!response.ok) {
    if (response.status === 401 && authenticated) {
      clearToken()
      window.location.assign('/login')
    }
    throw new ApiError(response.status, 'Ошибка запроса')
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}
