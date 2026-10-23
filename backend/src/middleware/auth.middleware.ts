import type { NextFunction, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { AppError } from '../utils/errors.js'

type JwtPayload = {
  sub: string
  email: string
  name: string
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.header('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined

  if (!token) {
    return next(new AppError(401, 'AUTHENTICATION_ERROR', 'Authentication required'))
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload
    if (typeof payload.sub !== 'string' || !payload.sub || typeof payload.email !== 'string' || typeof payload.name !== 'string') throw new Error('Invalid claims')
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    }
    return next()
  } catch {
    return next(new AppError(401, 'AUTHENTICATION_ERROR', 'Invalid or expired token'))
  }
}
