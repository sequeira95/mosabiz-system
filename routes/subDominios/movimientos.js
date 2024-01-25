import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { cancelarMovimiento, createMovimientos, getDataMovimientos, updateEstadoMovimiento } from '../../controllers/subDominios/movimientos.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getDataMovimientos)
router.post('/create', requireSubDominioToken, createMovimientos)
router.post('/cancel', requireSubDominioToken, cancelarMovimiento)
router.post('/updateEstate', requireSubDominioToken, updateEstadoMovimiento)
export default router
