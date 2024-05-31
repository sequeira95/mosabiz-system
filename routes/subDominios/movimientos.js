import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { cancelarMovimiento, createDevolucion, createMovimientos, getDataMovimientos, getDevoluciones, getMovimientosAjustes, getMovimientosParaDevoluciones, saveAjusteAlmacenAuditoria, updateCostoMovimiento, updateEstadoMovimiento } from '../../controllers/subDominios/movimientos.js'

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
export default router
