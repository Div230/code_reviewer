import { describe, expect, it } from 'vitest'
import { ScoringService } from '../../src/services/scoring.service.js'
import type { ModelReviewOutput } from '../../src/schemas/review.schema.js'

const finding = (severity: ModelReviewOutput['findings'][number]['severity']) => ({
  severity,
  category: 'SECURITY' as const,
  title: severity,
  description: 'description',
  filePath: 'src/a.ts',
  startLine: 1,
  endLine: 1,
  resolved: false,
})

describe('ScoringService', () => {
  it('calculates deterministic score with clamping', () => {
    const service = new ScoringService()
    expect(service.calculate([finding('CRITICAL'), finding('WARNING'), finding('INFO'), finding('SUGGESTION')])).toBe(74)
    expect(service.calculate(Array.from({ length: 20 }, () => finding('CRITICAL')))).toBe(0)
    expect(service.calculate([])).toBe(100)
  })

  it('counts findings by UI buckets', () => {
    const counts = new ScoringService().counts([finding('CRITICAL'), finding('WARNING'), finding('INFO'), finding('SUGGESTION')])
    expect(counts).toEqual({ criticalCount: 1, warningCount: 1, suggestionCount: 2, totalIssues: 4 })
  })
})
