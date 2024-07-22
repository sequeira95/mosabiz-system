import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteZonas, getZonas, listCategoriasPorZonas, saveCategoriasPorZonas, saveZonas, saveZonasToArray } from '../../controllers/subDominios/zonas.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getZonas)
router.post('/save', requireSubDominioToken, saveZonas)
router.post('/delete', requireSubDominioToken, deleteZonas)
router.post('/saveToArray', requireSubDominioToken, saveZonasToArray)
router.post('/get/categoriaPorZona', requireSubDominioToken, listCategoriasPorZonas)
router.post('/save/categoriaPorZona', requireSubDominioToken, saveCategoriasPorZonas)
export default router
