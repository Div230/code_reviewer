import type { Request, Response } from 'express'
import { DashboardService } from '../services/dashboard.service.js'

const service = new DashboardService()

export class DashboardController {
  async get(req: Request, res: Response) {
    const dashboard = await service.get(req.user!.id)
    res.json(dashboard)
  }
}
