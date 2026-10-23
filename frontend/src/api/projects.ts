import { apiRequest } from './client'

export type Project = {
  id: string
  name: string
  repository?: string | null
  defaultBranch: string
  _count?: { reviews: number }
}

export const projectApi = {
  create(input: { name: string; repository?: string; defaultBranch: string }) {
    return apiRequest<{ project: Project }>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  list() {
    return apiRequest<{ items: Project[] }>('/api/projects')
  },
  update(id: string, input: Partial<{ name: string; repository?: string; defaultBranch: string }>) {
    return apiRequest<{ project: Project }>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
  },
  delete(id: string) {
    return apiRequest<void>(`/api/projects/${id}`, { method: 'DELETE' })
  },
}
