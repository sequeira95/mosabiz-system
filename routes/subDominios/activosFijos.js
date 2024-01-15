import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { createActivoFijo, deleteActivoFijo, editActivoFijo, getActivosFijos, saveToArray } from '../../controllers/subDominios/activosFijos.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getActivosFijos)
router.post('/edit', requireSubDominioToken, editActivoFijo)
router.post('/create', requireSubDominioToken, createActivoFijo)
router.post('/delete', requireSubDominioToken, deleteActivoFijo)
router.post('/saveToArray', requireSubDominioToken, saveToArray)
export default router
