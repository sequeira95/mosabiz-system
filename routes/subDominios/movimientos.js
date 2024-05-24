import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { cancelarMovimiento, createMovimientos, getDataMovimientos, getMovimientosAjustes, saveAjusteAlmacenAuditoria, updateCostoMovimiento, updateEstadoMovimiento } from '../../controllers/subDominios/movimientos.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getDataMovimientos)
router.post('/create', requireSubDominioToken, createMovimientos)
router.post('/cancel', requireSubDominioToken, cancelarMovimiento)
router.post('/updateEstate', requireSubDominioToken, updateEstadoMovimiento)
router.post('/getMovimientosAjustes', requireSubDominioToken, getMovimientosAjustes)
router.post('/saveAjusteAlmacenAuditoria', requireSubDominioToken, saveAjusteAlmacenAuditoria)
router.post('/updateCostoMovimiento', requireSubDominioToken, updateCostoMovimiento)
export default router
