import { ProjectRepository } from '../repositories/project.repository.js'
import type { CreateProjectInput, UpdateProjectInput } from '../schemas/project.schema.js'
import { AppError } from '../utils/errors.js'

const projects = new ProjectRepository()

export class ProjectService {
  create(ownerId: string, input: CreateProjectInput) {
    return projects.create(ownerId, input)
  }

  list(ownerId: string) {
    return projects.list(ownerId)
  }

  async get(ownerId: string, id: string) {
    const project = await projects.findOwned(id, ownerId)
    if (!project) throw new AppError(404, 'NOT_FOUND', 'Project not found')
    return project
  }

  async update(ownerId: string, id: string, input: UpdateProjectInput) {
    await this.get(ownerId, id)
    return projects.updateOwned(id, ownerId, input)
  }

  async delete(ownerId: string, id: string) {
    await this.get(ownerId, id)
    await projects.deleteOwned(id, ownerId)
  }
}
