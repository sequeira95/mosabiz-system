import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { balanceComprobacion, comprobantes, estadoResultado, estadoSituacionFinanciera, libroDiario, libroMayor, mayorAnalitico } from '../../controllers/subDominios/reportes.js'

const router = express.Router()

router.post('/mayorAnalitico', requireSubDominioToken, mayorAnalitico)
router.post('/balanceComprobacion', requireSubDominioToken, balanceComprobacion)
router.post('/comprobantes', requireSubDominioToken, comprobantes)
router.post('/libroDiario', requireSubDominioToken, libroDiario)
router.post('/libroMayor', requireSubDominioToken, libroMayor)
router.post('/ESF', requireSubDominioToken, estadoSituacionFinanciera)
router.post('/ER', requireSubDominioToken, estadoResultado)
export default router
