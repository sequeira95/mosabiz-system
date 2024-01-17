import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { getProductos, saveProducto } from '../../controllers/subDominios/inventarioProductos.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getProductos)
router.post('/save', requireSubDominioToken, saveProducto)
export default router
