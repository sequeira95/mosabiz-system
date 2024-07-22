import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteRetencion, getRetenciones, saveRetencion } from '../../controllers/subDominios/retencionISLR.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getRetenciones)
router.post('/save', requireSubDominioToken, saveRetencion)
router.post('/delete', requireSubDominioToken, deleteRetencion)
export default router
