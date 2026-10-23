import { Router } from 'express'
import { ReviewController } from '../controllers/review.controller.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { validate } from '../middleware/validation.middleware.js'
import { createReviewSchema, listReviewsSchema, reviewIdSchema } from '../schemas/review.schema.js'
import { asyncHandler } from '../utils/async-handler.js'

const router = Router()
const controller = new ReviewController()

router.use(requireAuth)
router.post('/', validate(createReviewSchema), asyncHandler(controller.create.bind(controller)))
router.get('/', validate(listReviewsSchema), asyncHandler(controller.list.bind(controller)))
router.get('/:id', validate(reviewIdSchema), asyncHandler(controller.get.bind(controller)))
router.delete('/:id', validate(reviewIdSchema), asyncHandler(controller.delete.bind(controller)))

export default router
