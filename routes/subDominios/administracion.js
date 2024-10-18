import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { getTotalesCuenta, getDetalleTransacciones, getListTiposcuentas, getTotalesTransaciones, getDetalleCuenta, saveTransaccion, deleteTransaccion, saveConciliacion } from '../../controllers/subDominios/administracion/tesoria.js'

const router = express.Router()

router.post('/get/totalesTransacciones', requireSubDominioToken, getTotalesTransaciones)
router.post('/get/DetalleTransacciones', requireSubDominioToken, getDetalleTransacciones)
router.post('/get/listCuentas', requireSubDominioToken, getListTiposcuentas)
router.post('/get/getTotalesCuenta', requireSubDominioToken, getTotalesCuenta)
router.post('/get/detalleCuentas', requireSubDominioToken, getDetalleCuenta)
router.post('/save/transaccion', requireSubDominioToken, saveTransaccion)
router.post('/delete/transaccion', requireSubDominioToken, deleteTransaccion)
router.post('/save/consiliacionTesoreria', requireSubDominioToken, saveConciliacion)
export default router
