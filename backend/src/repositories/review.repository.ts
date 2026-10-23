import { Prisma, type FindingSeverity, type ReviewInputType, type ReviewStatus } from '@prisma/client'
import { prisma } from '../config/database.js'
import type { ListReviewsQuery, ModelReviewOutput } from '../schemas/review.schema.js'

const reviewInclude = {
  project: true,
  findings: { orderBy: { createdAt: 'asc' as const } },
}

export class ReviewRepository {
  createAnalyzing(input: {
    projectId: string
    userId: string
    commitSha?: string
    pullRequestNumber?: number
    inputType: ReviewInputType
    inputContent: string
    language?: string
  }) {
    return prisma.review.create({
      data: {
        ...input,
        status: 'ANALYZING',
      },
      include: reviewInclude,
    })
  }

  async complete(reviewId: string, output: ModelReviewOutput, counts: {
    criticalCount: number
    warningCount: number
    suggestionCount: number
    totalIssues: number
  }, score: number) {
    return prisma.$transaction(async (tx) => {
      await tx.reviewFinding.deleteMany({ where: { reviewId } })
      return tx.review.update({
        where: { id: reviewId },
        data: {
          status: 'COMPLETED',
          score,
          summary: output.summary,
          errorMessage: null,
          ...counts,
          completedAt: new Date(),
          findings: {
            create: output.findings.map((finding) => ({
              severity: finding.severity,
              category: finding.category,
              title: finding.title,
              description: finding.description,
              whyItMatters: finding.whyItMatters ?? null,
              suggestedFix: finding.suggestedFix ?? null,
              filePath: finding.filePath,
              startLine: finding.startLine,
              endLine: finding.endLine,
              codeBefore: finding.codeBefore ?? null,
              codeAfter: finding.codeAfter ?? null,
              resolved: finding.resolved,
            })),
          },
        },
        include: reviewInclude,
      })
    })
  }

  fail(reviewId: string, message: string) {
    return prisma.review.update({
      where: { id: reviewId },
      data: {
        status: 'FAILED',
        errorMessage: message,
        completedAt: new Date(),
      },
      include: reviewInclude,
    })
  }

  findOwned(id: string, userId: string) {
    return prisma.review.findFirst({
      where: { id, userId },
      include: reviewInclude,
    })
  }

  deleteOwned(id: string, userId: string) {
    return prisma.review.delete({ where: { id, userId }, select: { id: true } })
  }

  async list(userId: string, query: ListReviewsQuery) {
    const where: Prisma.ReviewWhereInput = {
      userId,
      ...(query.projectId ? { projectId: query.projectId } : {}),
      ...(query.status ? { status: query.status as ReviewStatus } : {}),
      ...(query.search
        ? {
            OR: [
              { summary: { contains: query.search, mode: 'insensitive' } },
              { project: { name: { contains: query.search, mode: 'insensitive' } } },
              { findings: { some: { title: { contains: query.search, mode: 'insensitive' } } } },
            ],
          }
        : {}),
      ...(query.severity ? { findings: { some: { severity: query.severity as FindingSeverity } } } : {}),
    }

    const [sortField, sortDirection] = query.sort.split(':') as ['createdAt' | 'score', 'asc' | 'desc']
    const skip = (query.page - 1) * query.limit

    const [items, total] = await prisma.$transaction([
      prisma.review.findMany({
        where,
        include: reviewInclude,
        orderBy: { [sortField]: sortDirection },
        skip,
        take: query.limit,
      }),
      prisma.review.count({ where }),
    ])

    return {
      items,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    }
  }
}
