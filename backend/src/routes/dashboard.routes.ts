import { Router } from 'express'
import { DashboardController } from '../controllers/dashboard.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()
const controller = new DashboardController()

router.get('/', requireAuth, asyncHandler(controller.get.bind(controller)))

export default router
