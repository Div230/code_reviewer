import { apiRequest } from './client'
import type { Project } from './projects'

export type Finding = {
  id: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO' | 'SUGGESTION'
  category: 'SECURITY' | 'CORRECTNESS' | 'PERFORMANCE' | 'CODE_QUALITY' | 'MAINTAINABILITY'
  title: string
  description: string
  whyItMatters?: string | null
  suggestedFix?: string | null
  filePath: string
  startLine: number
  endLine: number
  codeBefore?: string | null
  codeAfter?: string | null
  resolved: boolean
}

export type Review = {
  id: string
  projectId: string
  project?: Project
  status: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED'
  score?: number | null
  summary?: string | null
  errorMessage?: string | null
  criticalCount: number
  warningCount: number
  suggestionCount: number
  totalIssues: number
  inputType: 'CODE' | 'DIFF' | 'FILE'
  inputContent: string
  language?: string | null
  commitSha?: string | null
  pullRequestNumber?: number | null
  createdAt: string
  completedAt?: string | null
  findings: Finding[]
}

export const reviewApi = {
  create(input: {
    projectId: string
    inputType: 'code' | 'diff' | 'file'
    content: string
    language?: string
    commitSha?: string
    pullRequestNumber?: number
  }) {
    return apiRequest<{ review: Review }>('/api/reviews', {
      method: 'POST',
      body: JSON.stringify(input),
    })
  },
  list(query: Record<string, string | number | undefined> = {}) {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params.set(key, String(value))
    }
    return apiRequest<{ items: Review[]; pagination: { page: number; limit: number; total: number; totalPages: number } }>(`/api/reviews?${params}`)
  },
  get(id: string) {
    return apiRequest<{ review: Review }>(`/api/reviews/${id}`)
  },
  delete(id: string) {
    return apiRequest<void>(`/api/reviews/${id}`, { method: 'DELETE' })
  },
}
