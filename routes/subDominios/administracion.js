import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { getDetalleTransacciones, getTotalesTransaciones } from '../../controllers/subDominios/administracion/tesoria.js'

const router = express.Router()

router.post('/get/totalesTransacciones', requireSubDominioToken, getTotalesTransaciones)
router.post('/get/DetalleTransacciones', requireSubDominioToken, getDetalleTransacciones)
export default router
