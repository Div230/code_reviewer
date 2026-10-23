import type { NextFunction, Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { AppError, isAppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new AppError(404, 'NOT_FOUND', 'Route not found'))
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  let appError: AppError

  if (isAppError(error)) {
    appError = error
  } else if (error instanceof SyntaxError && 'body' in error) {
    appError = new AppError(400, 'INVALID_JSON', 'Request body must be valid JSON')
  } else if (typeof error === 'object' && error !== null && 'type' in error && error.type === 'entity.too.large') {
    appError = new AppError(413, 'PAYLOAD_TOO_LARGE', 'Request body exceeds the configured limit')
  } else if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    appError = new AppError(409, 'CONFLICT', 'Resource already exists')
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    appError = new AppError(500, 'DATABASE_ERROR', 'A database error occurred')
  } else {
    appError = new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred')
  }

  logger.error(appError.message, {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    code: appError.code,
    statusCode: appError.statusCode,
    errorType: error instanceof Error ? error.name : 'unknown',
  })

  res.status(appError.statusCode).json({
    error: {
      code: appError.code,
      message: appError.message,
      details: appError.details ?? {},
    },
  })
}
