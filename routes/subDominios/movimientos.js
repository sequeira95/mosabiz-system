import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { cancelarMovimiento, createDevolucion, createMovimientos, getComprasForRecepcion, getDataCompraRecepcion, getDataMovimientos, getDevoluciones, getMovimientosAjustes, getMovimientosParaDevoluciones, recepcionInventarioCompra, saveAjusteAlmacenAuditoria, updateCostoMovimiento, updateEstadoMovimiento } from '../../controllers/subDominios/movimientos.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getDataMovimientos)
router.post('/create', requireSubDominioToken, createMovimientos)
router.post('/cancel', requireSubDominioToken, cancelarMovimiento)
router.post('/updateEstate', requireSubDominioToken, updateEstadoMovimiento)
router.post('/getMovimientosAjustes', requireSubDominioToken, getMovimientosAjustes)
router.post('/saveAjusteAlmacenAuditoria', requireSubDominioToken, saveAjusteAlmacenAuditoria)
router.post('/updateCostoMovimiento', requireSubDominioToken, updateCostoMovimiento)
router.post('/getMovimientosForDevoluciones', requireSubDominioToken, getMovimientosParaDevoluciones)
router.post('/createDevolucion', requireSubDominioToken, createDevolucion)
router.post('/getDevoluciones', requireSubDominioToken, getDevoluciones)
router.post('/get/dataCompra/recepcion', requireSubDominioToken, getDataCompraRecepcion)
router.post('/get/comprasRecepcion', requireSubDominioToken, getComprasForRecepcion)
router.post('/recepcionCompra', requireSubDominioToken, recepcionInventarioCompra)
export default router
