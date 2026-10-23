import { describe, expect, it } from 'vitest'
import { modelReviewOutputSchema } from '../../src/schemas/review.schema.js'

describe('modelReviewOutputSchema', () => {
  it('accepts valid structured findings', () => {
    const result = modelReviewOutputSchema.safeParse({
      score: 82,
      summary: 'Useful review',
      findings: [{
        severity: 'WARNING',
        category: 'CORRECTNESS',
        title: 'Missing guard',
        description: 'The code does not handle null input.',
        filePath: 'src/app.ts',
        startLine: 10,
        endLine: 12,
        resolved: false,
      }],
    })

    expect(result.success).toBe(true)
  })

  it('rejects inverted line ranges', () => {
    const result = modelReviewOutputSchema.safeParse({
      summary: 'Bad review',
      findings: [{
        severity: 'WARNING',
        category: 'CORRECTNESS',
        title: 'Bad range',
        description: 'Invalid range',
        filePath: 'src/app.ts',
        startLine: 12,
        endLine: 10,
        resolved: false,
      }],
    })

    expect(result.success).toBe(false)
  })
})
