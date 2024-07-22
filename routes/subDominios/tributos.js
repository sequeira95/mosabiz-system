import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { getCiclos } from '../../controllers/subDominios/tributos/tributos.js'

const router = express.Router()

router.post('/getCiclos', requireSubDominioToken, getCiclos)
export default router
