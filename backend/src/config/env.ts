import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32).refine((value) => !/^(change|replace|example)/i.test(value), 'Generate a random signing secret'),
  JWT_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(8).max(15).default(12),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173,http://127.0.0.1:5174'),
  REQUEST_BODY_LIMIT: z.string().default('2mb'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  MODEL_API_URL: z.string().url().refine((value) => { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash }, 'Use an HTTP(S) URL without credentials or query parameters').default('http://localhost:8000/v1/chat/completions'),
  MODEL_NAME: z.string().min(1).default('codereviewer'),
  MODEL_API_KEY: z.string().optional(),
  MODEL_MAX_CONCURRENT: z.coerce.number().int().min(1).max(64).default(2),
  MODEL_MAX_RESPONSE_BYTES: z.coerce.number().int().positive().max(16_000_000).default(1_000_000),
  MODEL_TIMEOUT: z.coerce.number().int().positive().default(120000),
  MODEL_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.1),
  REVIEW_PROMPT_PATH: z.string().optional().default(''),
  MODEL_MAX_TOKENS: z.coerce.number().int().positive().default(2048),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment configuration', parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = {
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean),
  isProduction: parsed.data.NODE_ENV === 'production',
  isTest: parsed.data.NODE_ENV === 'test',
}
