import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteZonas, getZonas, listCategoriasPorZonas, saveZonas, saveZonasToArray } from '../../controllers/subDominios/zonas.js'

const router = express.Router()

router.post('/get/activoFijo', requireSubDominioToken, getZonas)
router.post('/save', requireSubDominioToken, saveZonas)
router.post('/delete', requireSubDominioToken, deleteZonas)
router.post('/saveToArray', requireSubDominioToken, saveZonasToArray)
router.post('/get/categoriaPorZona', requireSubDominioToken, listCategoriasPorZonas)
export default router
