import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { getHistorial, getHistorialCompra } from '../../controllers/subDominios/historial.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getHistorial)
router.post('/get/compras', requireSubDominioToken, getHistorialCompra)
export default router
