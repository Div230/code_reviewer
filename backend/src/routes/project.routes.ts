import { Router } from 'express'
import { ProjectController } from '../controllers/project.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validation.middleware.js'
import { createProjectSchema, projectIdSchema, updateProjectSchema } from '../schemas/project.schema.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()
const controller = new ProjectController()

router.use(requireAuth)
router.post('/', validate(createProjectSchema), asyncHandler(controller.create.bind(controller)))
router.get('/', asyncHandler(controller.list.bind(controller)))
router.get('/:id', validate(projectIdSchema), asyncHandler(controller.get.bind(controller)))
router.patch('/:id', validate(updateProjectSchema), asyncHandler(controller.update.bind(controller)))
router.delete('/:id', validate(projectIdSchema), asyncHandler(controller.delete.bind(controller)))

export default router
