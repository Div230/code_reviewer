import { z } from 'zod'

const projectBody = z.object({
  name: z.string().trim().min(1).max(160),
  repository: z.string().trim().url().max(500).optional().or(z.literal('').transform(() => undefined)),
  defaultBranch: z.string().trim().min(1).max(120).default('main'),
})

export const createProjectSchema = z.object({
  body: projectBody,
})

export const updateProjectSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: projectBody.partial().refine((body) => Object.keys(body).length > 0, 'At least one field is required'),
})

export const projectIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
})

export type CreateProjectInput = z.infer<typeof createProjectSchema>['body']
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>['body']
