import type { Request, Response } from 'express'
import { AuthService } from '../services/auth.service.js'

const service = new AuthService()

export class AuthController {
  async register(req: Request, res: Response) {
    const result = await service.register(req.body)
    res.status(201).json(result)
  }

  async login(req: Request, res: Response) {
    const result = await service.login(req.body)
    res.json(result)
  }

  async me(req: Request, res: Response) {
    const user = await service.me(req.user!.id)
    res.json({ user })
  }
}
