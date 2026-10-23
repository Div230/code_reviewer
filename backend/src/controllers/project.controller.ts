import type { Request, Response } from 'express'
import { ProjectService } from '../services/project.service.js'

const service = new ProjectService()

export class ProjectController {
  async create(req: Request, res: Response) {
    const project = await service.create(req.user!.id, req.body)
    res.status(201).json({ project })
  }

  async list(req: Request, res: Response) {
    const items = await service.list(req.user!.id)
    res.json({ items })
  }

  async get(req: Request, res: Response) {
    const project = await service.get(req.user!.id, req.params.id)
    res.json({ project })
  }

  async update(req: Request, res: Response) {
    const project = await service.update(req.user!.id, req.params.id, req.body)
    res.json({ project })
  }

  async delete(req: Request, res: Response) {
    await service.delete(req.user!.id, req.params.id)
    res.status(204).send()
  }
}
