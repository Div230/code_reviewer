import { z } from 'zod'

export const modelFindingSchema = z.object({
  severity: z.enum(['CRITICAL', 'WARNING', 'INFO', 'SUGGESTION']),
  category: z.enum(['SECURITY', 'CORRECTNESS', 'PERFORMANCE', 'CODE_QUALITY', 'MAINTAINABILITY']),
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().min(1).max(4000),
  whyItMatters: z.string().trim().max(4000).optional().nullable(),
  suggestedFix: z.string().trim().max(8000).optional().nullable(),
  filePath: z.string().trim().min(1).max(500),
  startLine: z.coerce.number().int().min(1),
  endLine: z.coerce.number().int().min(1),
  codeBefore: z.string().max(12000).optional().nullable(),
  codeAfter: z.string().max(12000).optional().nullable(),
  resolved: z.boolean().default(false),
}).refine((finding) => finding.endLine >= finding.startLine, {
  path: ['endLine'],
  message: 'endLine must be greater than or equal to startLine',
})

export const modelReviewOutputSchema = z.object({
  score: z.coerce.number().int().min(0).max(100).optional(),
  summary: z.string().trim().min(1).max(4000),
  findings: z.array(modelFindingSchema).max(200),
})

export const createReviewSchema = z.object({
  body: z.object({
    projectId: z.string().min(1),
    inputType: z.enum(['code', 'diff', 'file']).transform((value) => value.toUpperCase() as 'CODE' | 'DIFF' | 'FILE'),
    content: z.string().min(1).max(32_000).refine((value) => value.trim().length > 0, 'Content must not be blank'),
    language: z.string().trim().max(80).optional(),
    commitSha: z.string().trim().max(80).optional(),
    pullRequestNumber: z.coerce.number().int().positive().optional(),
  }),
})

export const reviewIdSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
})

export const listReviewsSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    search: z.string().trim().max(160).optional(),
    projectId: z.string().trim().optional(),
    status: z.enum(['PENDING', 'ANALYZING', 'COMPLETED', 'FAILED']).optional(),
    severity: z.enum(['CRITICAL', 'WARNING', 'INFO', 'SUGGESTION']).optional(),
    sort: z.enum(['createdAt:desc', 'createdAt:asc', 'score:desc', 'score:asc']).default('createdAt:desc'),
  }),
})

export type CreateReviewInput = z.infer<typeof createReviewSchema>['body']
export type ListReviewsQuery = z.infer<typeof listReviewsSchema>['query']
export type ModelReviewOutput = z.infer<typeof modelReviewOutputSchema>
