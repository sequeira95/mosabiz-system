import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { saveTerceros, getTerceros, deleteTercero } from '../../controllers/subDominios/terceros.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getTerceros)
router.post('/save', requireSubDominioToken, saveTerceros)
router.post('/delete', requireSubDominioToken, deleteTercero)
export default router
