import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteProducto, getDetalleCantidad, getListCostos, getProductos, saveAjusteAlmacen, saveProducto, saveToArray } from '../../controllers/subDominios/inventarioProductos.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getProductos)
router.post('/save', requireSubDominioToken, saveProducto)
router.post('/saveToArray', requireSubDominioToken, saveToArray)
router.post('/delete', requireSubDominioToken, deleteProducto)
router.post('/getDetalleCantidad', requireSubDominioToken, getDetalleCantidad)
router.post('/getListCostos', requireSubDominioToken, getListCostos)
router.post('/saveAjuste', requireSubDominioToken, saveAjusteAlmacen)
export default router
