import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { balanceComprobacion, comprobantes, mayorAnalitico } from '../../controllers/subDominios/reportes.js'

const router = express.Router()

router.post('/mayorAnalitico', requireSubDominioToken, mayorAnalitico)
router.post('/balanceComprobacion', requireSubDominioToken, balanceComprobacion)
router.post('/comprobantes', requireSubDominioToken, comprobantes)
export default router
