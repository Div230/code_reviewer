import type { ReviewInputType } from '@prisma/client'
import { ProjectRepository } from '../repositories/project.repository.js'
import { ReviewRepository } from '../repositories/review.repository.js'
import type { CreateReviewInput, ListReviewsQuery } from '../schemas/review.schema.js'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import { DiffService } from './diff.service.js'
import { ModelService } from './model.service.js'
import { ReviewPromptService } from './review-prompt.service.js'
import { ScoringService } from './scoring.service.js'

const projects = new ProjectRepository()
const reviews = new ReviewRepository()

export class ReviewService {
  constructor(
    private readonly model = new ModelService(),
    private readonly diff = new DiffService(),
    private readonly promptBuilder = new ReviewPromptService(),
    private readonly scoring = new ScoringService(),
  ) {}

  async create(userId: string, input: CreateReviewInput, requestId?: string) {
    const project = await projects.findOwned(input.projectId, userId)
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found')

    const review = await reviews.createAnalyzing({
      projectId: input.projectId,
      userId,
      commitSha: input.commitSha,
      pullRequestNumber: input.pullRequestNumber,
      inputType: input.inputType as ReviewInputType,
      inputContent: input.content,
      language: input.language,
    })

    logger.info('review.created', { requestId, reviewId: review.id, userId, projectId: input.projectId })

    try {
      const normalized = this.diff.normalizeForPrompt(input.inputType, input.content)
      const prompt = this.promptBuilder.build({
        inputType: input.inputType,
        language: input.language,
        content: normalized,
      })
      const modelOutput = await this.model.review({ inputType: input.inputType, prompt, requestId })
      const score = this.scoring.calculate(modelOutput.findings)
      const counts = this.scoring.counts(modelOutput.findings)
      const completed = await reviews.complete(review.id, modelOutput, counts, score)
      logger.info('review.completed', { requestId, reviewId: review.id, score, totalIssues: counts.totalIssues })
      return completed
    } catch (error) {
      const message = error instanceof AppError ? error.message : 'Review analysis failed'
      const failed = await reviews.fail(review.id, message)
      logger.error('review.failed', { requestId, reviewId: review.id, message })
      return failed
    }
  }

  list(userId: string, query: ListReviewsQuery) {
    return reviews.list(userId, query)
  }

  async get(userId: string, id: string) {
    const review = await reviews.findOwned(id, userId)
    if (!review) throw new AppError(404, 'NOT_FOUND', 'Review not found')
    return review
  }

  async delete(userId: string, id: string) {
    await this.get(userId, id)
    await reviews.deleteOwned(id, userId)
  }
}
