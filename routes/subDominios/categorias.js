import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteCategorias, getCategorias, getCategoriasForCompras, getCategoriasForVentas, saveCategoriaToArray, saveCategorias, saveCategoriasForCompras, saveCategoriasForVentas } from '../../controllers/subDominios/categorias.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getCategorias)
router.post('/save', requireSubDominioToken, saveCategorias)
router.post('/delete', requireSubDominioToken, deleteCategorias)
router.post('/saveToArray', requireSubDominioToken, saveCategoriaToArray)
router.post('/get/ventas', requireSubDominioToken, getCategoriasForVentas)
router.post('/save/ventas', requireSubDominioToken, saveCategoriasForVentas)
router.post('/get/compras', requireSubDominioToken, getCategoriasForCompras)
router.post('/save/compras', requireSubDominioToken, saveCategoriasForCompras)
export default router
