import { env } from '../config/env.js'
import { modelReviewOutputSchema, type ModelReviewOutput } from '../schemas/review.schema.js'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'

const reviewSchema = {
  type: "object",
  properties: {
    summary: {
      type: "string",
    },
    findings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          severity: {
            type: "string",
            enum: ["CRITICAL", "WARNING", "INFO", "SUGGESTION"],
          },
          category: {
            type: "string",
            enum: [
              "CORRECTNESS",
              "SECURITY",
              "PERFORMANCE",
              "CODE_QUALITY",
              "MAINTAINABILITY",
            ],
          },
          title: {
            type: "string",
          },
          description: {
            type: "string",
          },
          whyItMatters: {
            type: "string",
          },
          suggestedFix: {
            type: "string",
          },
          filePath: {
            type: "string",
          },
          startLine: {
            type: "integer",
          },
          endLine: {
            type: "integer",
          },
        },
        required: [
          "severity",
          "category",
          "title",
          "description",
          "whyItMatters",
          "suggestedFix",
          "filePath",
          "startLine",
          "endLine",
        ],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "findings"],
  additionalProperties: false,
};
type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string } }>
}

function extractJson(text: string) {
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) return trimmed
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenced?.[1]) return fenced[1].trim()
  const first = trimmed.indexOf('{')
  const last = trimmed.lastIndexOf('}')
  if (first >= 0 && last > first) return trimmed.slice(first, last + 1)
  return trimmed
}

let activeRequests = 0

export class ModelClient {
  async reviewCode(prompt: string, requestId?: string): Promise<ModelReviewOutput> {
    return this.complete(prompt, requestId)
  }

  async reviewDiff(prompt: string, requestId?: string): Promise<ModelReviewOutput> {
    return this.complete(prompt, requestId)
  }

  private async complete(prompt: string, requestId?: string) {
    if (activeRequests >= env.MODEL_MAX_CONCURRENT) throw new AppError(503, 'MODEL_BUSY', 'The review model is busy; retry later')
    activeRequests += 1
    const started = Date.now()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), env.MODEL_TIMEOUT)

    try {
      logger.info('model.request.started', { requestId, model: env.MODEL_NAME, url: env.MODEL_API_URL, timeout: env.MODEL_TIMEOUT,})
      const response = await fetch(env.MODEL_API_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...(env.MODEL_API_KEY ? { authorization: `Bearer ${env.MODEL_API_KEY}` } : {}) },
        body: JSON.stringify({
          model: env.MODEL_NAME,
          temperature: env.MODEL_TEMPERATURE,
          max_tokens: env.MODEL_MAX_TOKENS,
          response_format: {
              type: "json_schema",
              json_schema: {
                  name: "code_review",
                  schema: reviewSchema,
              },
          },
          messages: [
            { role: 'user', content: prompt },
          ],
        }),
        signal: controller.signal,
      })

      if (!response.ok) {
        await response.body?.cancel()
        throw new AppError(502, 'MODEL_UNAVAILABLE', 'The review model is unavailable')
      }

      if (!response.body) throw new AppError(502, 'INVALID_MODEL_RESPONSE', 'The review model returned no body')
      const reader = response.body.getReader()
      const chunks: Uint8Array[] = []
      let size = 0
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          size += value.byteLength
          if (size > env.MODEL_MAX_RESPONSE_BYTES) {
            controller.abort()
            throw new AppError(502, 'INVALID_MODEL_RESPONSE', 'The review model response was too large')
          }
          chunks.push(value)
        }
      } finally {
        reader.releaseLock()
      }
      let json: ChatCompletionResponse
      try { json = JSON.parse(Buffer.concat(chunks).toString('utf8')) as ChatCompletionResponse }
      catch { throw new AppError(502, 'INVALID_MODEL_RESPONSE', 'The review model returned invalid JSON') }
      const content = json?.choices?.[0]?.message?.content
      if (typeof content !== 'string' || !content) throw new AppError(502, 'INVALID_MODEL_RESPONSE', 'The review model returned an empty response')
      

      let parsed: unknown
      try {
        parsed = JSON.parse(extractJson(content))
      } catch {
        throw new AppError(502, 'INVALID_MODEL_RESPONSE', 'The review model returned invalid JSON')
      }

      const validated = modelReviewOutputSchema.safeParse(parsed)
      if (!validated.success) {
        throw new AppError(502, 'INVALID_MODEL_RESPONSE', 'The review model response did not match the expected schema')
      }

      logger.info('model.request.completed', { requestId, latencyMs: Date.now() - started })
      return validated.data
    } catch (error) {
      logger.error('model.request.failed', { requestId, errorType: error instanceof Error ? error.name : 'unknown' })

      if (error instanceof AppError) {
        throw error
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new AppError(
          504,
          'MODEL_TIMEOUT',
          'The review model timed out',
        )
      }

      throw new AppError(
        502,
        'MODEL_UNAVAILABLE',
        'The review model is unavailable',
      )
    } finally {
      activeRequests -= 1
      clearTimeout(timeout)
    }
  }
}

export class ModelService {
  constructor(private readonly client = new ModelClient()) {}

  review(input: { inputType: 'CODE' | 'DIFF' | 'FILE'; prompt: string; requestId?: string }) {
    return input.inputType === 'DIFF'
      ? this.client.reviewDiff(input.prompt, input.requestId)
      : this.client.reviewCode(input.prompt, input.requestId)
  }
}
