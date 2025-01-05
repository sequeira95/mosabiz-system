import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import {
  createComprobante,
  deleteComprobante,
  deleteDetalleComprobante,
  getDetallesComprobantes,
  getListComprobantes,
  saveDetalleComprobanteToArray,
  updateComprobante,
  updateDetalleComprobante,
  addLineDetalleComprobante,
  changeCuentas
} from '../../controllers/subDominios/comprobantes.js'

const router = express.Router()

router.post('/getComprobantes', requireSubDominioToken, getListComprobantes)
router.post('/create', requireSubDominioToken, createComprobante)
router.post('/delete', requireSubDominioToken, deleteComprobante)
router.post('/update', requireSubDominioToken, updateComprobante)
router.post('/detalles/get', requireSubDominioToken, getDetallesComprobantes)
router.post('/detalles/save', requireSubDominioToken, saveDetalleComprobanteToArray)
router.post('/detalles/update', requireSubDominioToken, updateDetalleComprobante)
router.post('/detalles/delete', requireSubDominioToken, deleteDetalleComprobante)
router.post('/detalles/add-line', requireSubDominioToken, addLineDetalleComprobante)
router.post('/detalles/change-cuentas', requireSubDominioToken, changeCuentas)
export default router
