import { apiRequest } from './client'
import type { Review } from './reviews'

export type Dashboard = {
  reviewsPerformed: number
  averageScore: number
  criticalIssues: number
  issuesResolved: number
  recentReviews: Review[]
  issuesByCategory: Record<string, number>
  scoreTrend: Array<{ date: string; averageScore: number }>
}

export const dashboardApi = {
  get() {
    return apiRequest<Dashboard>('/api/dashboard')
  },
}
