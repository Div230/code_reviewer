import { Prisma } from '@prisma/client'
import { prisma } from '../config/database.js'

export class DashboardService {
  async get(userId: string) {
    const [reviewStats, criticalIssues, issuesResolved, issuesByCategoryRows, scoreTrend, recentReviews] = await Promise.all([
      prisma.review.aggregate({
        where: { userId, status: 'COMPLETED' },
        _count: { _all: true },
        _avg: { score: true },
      }),
      prisma.reviewFinding.count({
        where: { severity: 'CRITICAL', review: { userId } },
      }),
      prisma.reviewFinding.count({
        where: { resolved: true, review: { userId } },
      }),
      prisma.reviewFinding.groupBy({
        by: ['category'],
        where: { review: { userId } },
        _count: { category: true },
      }),
      prisma.$queryRaw<Array<{ day: Date; averageScore: number }>>(Prisma.sql`
        SELECT date_trunc('day', "createdAt") AS day, ROUND(AVG(score))::int AS "averageScore"
        FROM "Review"
        WHERE "userId" = ${userId} AND status = 'COMPLETED' AND score IS NOT NULL
        GROUP BY day
        ORDER BY day ASC
        LIMIT 30
      `),
      prisma.review.findMany({
        where: { userId },
        include: { project: true, findings: true },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ])

    const issuesByCategory = {
      SECURITY: 0,
      PERFORMANCE: 0,
      CORRECTNESS: 0,
      CODE_QUALITY: 0,
      MAINTAINABILITY: 0,
    }

    for (const row of issuesByCategoryRows) {
      issuesByCategory[row.category] = row._count.category
    }

    return {
      reviewsPerformed: reviewStats._count._all,
      averageScore: Math.round(reviewStats._avg.score ?? 0),
      criticalIssues,
      issuesResolved,
      recentReviews,
      issuesByCategory,
      scoreTrend: scoreTrend.map((row) => ({
        date: row.day,
        averageScore: Number(row.averageScore),
      })),
    }
  }
}
