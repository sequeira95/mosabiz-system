import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteCategorias, getCategorias, saveCategoriaToArray, saveCategorias } from '../../controllers/subDominios/categorias.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getCategorias)
router.post('/save', requireSubDominioToken, saveCategorias)
router.post('/delete', requireSubDominioToken, deleteCategorias)
router.post('/saveToArray', requireSubDominioToken, saveCategoriaToArray)
export default router
