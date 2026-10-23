import { readFileSync } from 'node:fs'
import { env } from '../config/env.js'

const defaultPrompt = `You are an expert senior software engineer performing a rigorous code review.

Analyze the provided code or Git diff.

Look for:
1. Correctness bugs
2. Security vulnerabilities
3. Performance problems
4. Error handling problems
5. Concurrency issues
6. Resource leaks
7. Maintainability problems
8. API misuse
9. Bad abstractions
10. Unnecessary complexity

Only report issues that are genuinely actionable.
Do not invent problems.

For every finding provide severity, category, title, description, whyItMatters, suggestedFix, filePath, startLine, endLine, codeBefore, codeAfter, and resolved.

Do not make Unnecessary classifications into Security or other tags make sure that there is valid proof for it.

Return ONLY valid JSON matching this TypeScript shape:
{
  "score": number,
  "summary": string,
  "findings": [
    {
      "severity": "CRITICAL" | "WARNING" | "INFO" | "SUGGESTION",
      "category": "SECURITY" | "CORRECTNESS" | "PERFORMANCE" | "CODE_QUALITY" | "MAINTAINABILITY",
      "title": string,
      "description": string,
      "whyItMatters": string,
      "suggestedFix": string,
      "filePath": string,
      "startLine": number,
      "endLine": number,
      "codeBefore": string | null,
      "codeAfter": string | null,
      "resolved": false
    }
  ]
}`

export class ReviewPromptService {
  private basePrompt: string

  constructor() {
    this.basePrompt = env.REVIEW_PROMPT_PATH ? readFileSync(env.REVIEW_PROMPT_PATH, 'utf8') : defaultPrompt
  }

  build(input: { inputType: 'CODE' | 'DIFF' | 'FILE'; language?: string; content: string }) {
    return `${this.basePrompt}

Input type: ${input.inputType}
Language: ${input.language ?? 'unknown'}

Review target:
\`\`\`
${input.content}
\`\`\``
  }
}
