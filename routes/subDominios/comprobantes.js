import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { createComprobante, deleteDetalleComprobante, getDetallesComprobantes, getListComprobantes, saveDetalleComprobante, updateComprobante, updateDetalleComprobante } from '../../controllers/subDominios/comprobantes.js'

const router = express.Router()

router.post('/getComprobantes', requireSubDominioToken, getListComprobantes)
router.post('/create', requireSubDominioToken, createComprobante)
router.post('/update', requireSubDominioToken, updateComprobante)
router.post('/detalles/get', requireSubDominioToken, getDetallesComprobantes)
router.post('/detalles/create', requireSubDominioToken, saveDetalleComprobante)
router.post('/detalles/update', requireSubDominioToken, updateDetalleComprobante)
router.post('/detalles/delete', requireSubDominioToken, deleteDetalleComprobante)
export default router
