import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { createComprobante, getListComprobantes, updateComprobante } from '../../controllers/subDominios/comprobantes.js'

const router = express.Router()

router.post('/getComprobantes', requireSubDominioToken, getListComprobantes)
router.post('/create', requireSubDominioToken, createComprobante)
router.post('/update', requireSubDominioToken, updateComprobante)
export default router
