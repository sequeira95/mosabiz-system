import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { getDataEstadisticas, getEstadisticasTransacciones } from '../../controllers/subDominios/home/estadisticas.js'

const router = express.Router()

router.post('/get/estadisticas', requireSubDominioToken, getDataEstadisticas)
router.post('/get/estadisticas/transacciones', requireSubDominioToken, getEstadisticasTransacciones)
export default router
