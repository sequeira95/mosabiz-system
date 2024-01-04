import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { mayorAnalitico } from '../../controllers/subDominios/reportes.js'

const router = express.Router()

router.post('/mayorAnalitico', requireSubDominioToken, mayorAnalitico)
export default router
