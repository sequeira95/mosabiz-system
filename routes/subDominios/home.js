import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { getDataEstadisticas, getEstadisticasAntiguedadCuentas, getEstadisticasPosicionMonetaria, getEstadisticasTransacciones } from '../../controllers/subDominios/home/estadisticas.js'

const router = express.Router()

router.post('/get/estadisticas', requireSubDominioToken, getDataEstadisticas)
router.post('/get/estadisticas/transacciones', requireSubDominioToken, getEstadisticasTransacciones)
router.post('/get/estadisticas/posicionMonetaria', requireSubDominioToken, getEstadisticasPosicionMonetaria)
router.post('/get/estadisticas/antiguedadCuentas', requireSubDominioToken, getEstadisticasAntiguedadCuentas)
export default router
