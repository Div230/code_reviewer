import type { ModelReviewOutput } from '../schemas/review.schema.js'

const penalties = {
  CRITICAL: 15,
  WARNING: 7,
  INFO: 3,
  SUGGESTION: 1,
} as const

export class ScoringService {
  calculate(findings: ModelReviewOutput['findings']) {
    const penalty = findings.reduce((total, finding) => total + penalties[finding.severity], 0)
    return Math.max(0, Math.min(100, 100 - penalty))
  }

  counts(findings: ModelReviewOutput['findings']) {
    return {
      criticalCount: findings.filter((finding) => finding.severity === 'CRITICAL').length,
      warningCount: findings.filter((finding) => finding.severity === 'WARNING').length,
      suggestionCount: findings.filter((finding) => finding.severity === 'SUGGESTION' || finding.severity === 'INFO').length,
      totalIssues: findings.length,
    }
  }
}
