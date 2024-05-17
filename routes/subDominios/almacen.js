import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { addImagenToAlmacen, createAlmacen, deleteAlmacen, deleteImgAlmacen, editAlmacen, getAlmacenes, getDataAlmacenAuditoria, listCategoriaPorAlmacen, saveCategoriaPorAlmacen, saveToArray } from '../../controllers/subDominios/almacen.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getAlmacenes)
router.post('/get/categoriaPorAlmacen', requireSubDominioToken, listCategoriaPorAlmacen)
router.post('/edit', requireSubDominioToken, editAlmacen)
router.post('/create', requireSubDominioToken, createAlmacen)
router.post('/save/categoriaPorAlmacen', requireSubDominioToken, saveCategoriaPorAlmacen)
router.post('/delete', requireSubDominioToken, deleteAlmacen)
router.post('/delete/img', requireSubDominioToken, deleteImgAlmacen)
router.post('/add/img', requireSubDominioToken, addImagenToAlmacen)
router.post('/saveToArray', requireSubDominioToken, saveToArray)
router.post('/getAlmacenAuditoria', requireSubDominioToken, getDataAlmacenAuditoria)
export default router
