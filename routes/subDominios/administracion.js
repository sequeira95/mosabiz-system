import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { getDetalleCuenta, getDetalleTransacciones, getListTiposcuentas, getTotalesTransaciones } from '../../controllers/subDominios/administracion/tesoria.js'

const router = express.Router()

router.post('/get/totalesTransacciones', requireSubDominioToken, getTotalesTransaciones)
router.post('/get/DetalleTransacciones', requireSubDominioToken, getDetalleTransacciones)
router.post('/get/listCuentas', requireSubDominioToken, getListTiposcuentas)
router.post('/get/detalleCuenta', requireSubDominioToken, getDetalleCuenta)
export default router
