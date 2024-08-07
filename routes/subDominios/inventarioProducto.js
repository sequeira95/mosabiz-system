import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteProducto, getDetalleCantidad, getListCostos, getProductos, saveAjusteAlmacen, saveDataInicial, saveProducto, saveProductosVentas, saveToArray, saveToArrayVentas, updateCostoPorLote } from '../../controllers/subDominios/inventarioProductos.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getProductos)
router.post('/save', requireSubDominioToken, saveProducto)
router.post('/saveToArray', requireSubDominioToken, saveToArray)
router.post('/saveToArrayVentas', requireSubDominioToken, saveToArrayVentas)
router.post('/delete', requireSubDominioToken, deleteProducto)
router.post('/getDetalleCantidad', requireSubDominioToken, getDetalleCantidad)
router.post('/getListCostos', requireSubDominioToken, getListCostos)
router.post('/saveAjuste', requireSubDominioToken, saveAjusteAlmacen)
router.post('/save/ventas', requireSubDominioToken, saveProductosVentas)
router.post('/saveDataInicial', requireSubDominioToken, saveDataInicial)
router.post('/updateCostoPorLote', requireSubDominioToken, updateCostoPorLote)
export default router
