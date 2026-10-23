const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'
const TOKEN_KEY = 'codereviewer.token'

export type ApiError = {
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!headers.has('content-type') && options.body) headers.set('content-type', 'application/json')
  const token = getToken()
  if (token) headers.set('authorization', `Bearer ${token}`)

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 204) return undefined as T

  let data: unknown
  try { data = await response.json() }
  catch { throw new Error(`The API returned an invalid response (HTTP ${response.status}).`) }
  if (response.status === 401) clearToken()
  if (!response.ok) {
    const message = (data as ApiError).error?.message ?? 'Request failed'
    throw new Error(message)
  }

  return data as T
}
