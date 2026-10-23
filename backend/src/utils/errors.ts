export type ApiErrorCode =
  | 'CORS_DENIED'
  | 'INVALID_JSON'
  | 'PAYLOAD_TOO_LARGE'
  | 'MODEL_BUSY'
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'MODEL_TIMEOUT'
  | 'MODEL_UNAVAILABLE'
  | 'INVALID_MODEL_RESPONSE'
  | 'DATABASE_ERROR'
  | 'INTERNAL_ERROR'

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: ApiErrorCode
  public readonly details?: unknown

  constructor(statusCode: number, code: ApiErrorCode, message: string, details?: unknown) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
