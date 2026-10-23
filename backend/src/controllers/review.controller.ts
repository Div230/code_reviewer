import type { Request, Response } from 'express'
import { ReviewService } from '../services/review.service.js'

const service = new ReviewService()

export class ReviewController {
  async create(req: Request, res: Response) {
    const review = await service.create(req.user!.id, req.body, req.requestId)
    res.status(201).json({ review })
  }

  async list(req: Request, res: Response) {
    const result = await service.list(req.user!.id, req.query as never)
    res.json(result)
  }

  async get(req: Request, res: Response) {
    const review = await service.get(req.user!.id, req.params.id)
    res.json({ review })
  }

  async delete(req: Request, res: Response) {
    await service.delete(req.user!.id, req.params.id)
    res.status(204).send()
  }
}
