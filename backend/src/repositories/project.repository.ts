import { prisma } from '../config/database.js'

export class ProjectRepository {
  create(ownerId: string, input: { name: string; repository?: string; defaultBranch: string }) {
    return prisma.project.create({ data: { ...input, ownerId } })
  }

  list(ownerId: string) {
    return prisma.project.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { reviews: true } } },
    })
  }

  findOwned(id: string, ownerId: string) {
    return prisma.project.findFirst({
      where: { id, ownerId },
      include: { _count: { select: { reviews: true } } },
    })
  }

  updateOwned(id: string, ownerId: string, input: { name?: string; repository?: string; defaultBranch?: string }) {
    return prisma.project.update({ where: { id, ownerId }, data: input })
  }

  deleteOwned(id: string, ownerId: string) {
    return prisma.project.delete({ where: { id, ownerId }, select: { id: true } })
  }
}
