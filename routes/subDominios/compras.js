import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { createOrdenCompra, getListImpuestosIslr, getListImpuestosIva, getListProductosForCompra, getServiciosForCompra } from '../../controllers/subDominios/compras.js'

const router = express.Router()

router.post('/get/impuestos/islr', requireSubDominioToken, getListImpuestosIslr)
router.post('/get/impuestos/iva', requireSubDominioToken, getListImpuestosIva)
router.post('/get/productos', requireSubDominioToken, getListProductosForCompra)
router.post('/get/servicios', requireSubDominioToken, getServiciosForCompra)
router.post('/save/compra', requireSubDominioToken, createOrdenCompra)
export default router
