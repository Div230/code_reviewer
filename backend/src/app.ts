import compression from 'compression'
import cors from 'cors'
import express from 'express'
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'
import morgan from 'morgan'
import { randomUUID } from 'node:crypto'
import { env } from './config/env.js'
import { errorHandler, notFound } from './middleware/error.middleware.js'
import authRoutes from './routes/auth.routes.js'
import dashboardRoutes from './routes/dashboard.routes.js'
import projectRoutes from './routes/project.routes.js'
import reviewRoutes from './routes/review.routes.js'
import { AppError } from './utils/errors.js'
import { logger } from './utils/logger.js'

export function createApp() {
  const app = express()

  app.use((req, res, next) => {
    req.requestId = randomUUID()
    res.setHeader('x-request-id', req.requestId)
    next()
  })
  app.use(helmet())
  app.use(compression())
  app.use(cors({
    origin(origin, callback) {
      if (!origin || env.CORS_ORIGINS.includes(origin)) callback(null, true)
      else callback(new AppError(403, 'CORS_DENIED', 'Origin is not allowed'))
    },
    credentials: true,
  }))
  app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }))
  app.use(express.urlencoded({ extended: false, limit: env.REQUEST_BODY_LIMIT }))
  app.use(rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests', details: {} } },
  }))
  app.use(morgan(':method :status :response-time ms', {
    stream: { write: (message) => logger.info('http.request', { message: message.trim() }) },
    skip: () => env.isTest,
  }))

  app.get('/health', (_req, res) => res.json({ ok: true }))
  app.use('/api/auth', rateLimit({ windowMs: 900000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'Too many authentication requests', details: {} } } }), authRoutes)
  app.use('/api/projects', projectRoutes)
  app.use('/api/reviews', reviewRoutes)
  app.use('/api/dashboard', dashboardRoutes)
  app.use(notFound)
  app.use(errorHandler)

  return app
}
