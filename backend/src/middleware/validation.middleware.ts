import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'
import { AppError } from '../utils/errors.js'

export function validate(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    })

    if (!result.success) {
      return next(new AppError(400, 'VALIDATION_ERROR', 'Invalid request input', result.error.flatten()))
    }

    req.body = result.data.body ?? req.body
    req.query = result.data.query ?? req.query
    req.params = result.data.params ?? req.params
    return next()
  }
}
