import { apiRequest, clearToken, setToken } from './client'

export type User = {
  id: string
  email: string
  name: string
}

export const authApi = {
  async register(input: { email: string; name: string; password: string }) {
    const result = await apiRequest<{ user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    setToken(result.token)
    return result
  },
  async login(input: { email: string; password: string }) {
    const result = await apiRequest<{ user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    })
    setToken(result.token)
    return result
  },
  me() {
    return apiRequest<{ user: User }>('/api/auth/me')
  },
  logout() {
    clearToken()
  },
}
