import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { saveTerceros, getTerceros, deleteTercero, saveTercerosMany, theRealGetTerceros } from '../../controllers/subDominios/terceros.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getTerceros)
router.post('/get-with-cuenta', requireSubDominioToken, theRealGetTerceros)
router.post('/save', requireSubDominioToken, saveTerceros)
router.post('/save-many', requireSubDominioToken, saveTercerosMany)

router.post('/delete', requireSubDominioToken, deleteTercero)
export default router
