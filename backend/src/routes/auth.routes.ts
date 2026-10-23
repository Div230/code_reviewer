import { Router } from 'express'
import { AuthController } from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validation.middleware.js'
import { loginSchema, registerSchema } from '../schemas/auth.schema.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()
const controller = new AuthController()

router.post('/register', validate(registerSchema), asyncHandler(controller.register.bind(controller)))
router.post('/login', validate(loginSchema), asyncHandler(controller.login.bind(controller)))
router.get('/me', requireAuth, asyncHandler(controller.me.bind(controller)))

export default router
