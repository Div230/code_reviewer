type LogLevel = 'info' | 'warn' | 'error' | 'debug'

function sanitizeMeta(meta?: Record<string, unknown>) {
  if (!meta) return undefined
  const denied = new Set(['password', 'passwordHash', 'token', 'authorization', 'inputContent', 'content'])
  return Object.fromEntries(Object.entries(meta).filter(([key]) => !denied.has(key)))
}

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const record = {
    level,
    message,
    time: new Date().toISOString(),
    ...sanitizeMeta(meta),
  }
  const line = JSON.stringify(record)
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => log('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => log('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => log('error', message, meta),
  debug: (message: string, meta?: Record<string, unknown>) => log('debug', message, meta),
}
