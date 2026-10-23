import { z } from 'zod'

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email().max(255).transform((value) => value.toLowerCase()),
    name: z.string().trim().min(1).max(120),
    password: z.string().min(8).max(72).refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Password must not exceed 72 UTF-8 bytes'),
  }),
})

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email().max(255).transform((value) => value.toLowerCase()),
    password: z.string().min(1).max(128),
  }),
})

export type RegisterInput = z.infer<typeof registerSchema>['body']
export type LoginInput = z.infer<typeof loginSchema>['body']
