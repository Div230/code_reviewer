import type { User } from '@prisma/client'

export type AuthUser = Pick<User, 'id' | 'email' | 'name'>

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser
      requestId?: string
    }
  }
}

export type Pagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}
