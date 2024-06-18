import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import {
  aprobarOrdenCompra,
  aprobarPagosOrdenCompra,
  cancelarCompra, createOrdenCompra,
  createPagoOrdenes,
  editOrden,
  getComprasForRecepcion,
  getDataCompra,
  getDataCompraRecepcion,
  getDataOrdenesComprasPorPagar,
  getDetalleProveedor,
  getListImpuestosIslr,
  getListImpuestosIva,
  getListProductosForCompra,
  getListadoCompras,
  getListadoPagos,
  getServiciosForCompra
} from '../../controllers/subDominios/compras.js'

const router = express.Router()

router.post('/get/impuestos/islr', requireSubDominioToken, getListImpuestosIslr)
router.post('/get/impuestos/iva', requireSubDominioToken, getListImpuestosIva)
router.post('/get/productos', requireSubDominioToken, getListProductosForCompra)
router.post('/get/servicios', requireSubDominioToken, getServiciosForCompra)
router.post('/save/compra', requireSubDominioToken, createOrdenCompra)
router.post('/get/dataCompra', requireSubDominioToken, getDataCompra)
router.post('/get/ordenesCompra', requireSubDominioToken, getListadoCompras)
router.post('/cancelar', requireSubDominioToken, cancelarCompra)
router.post('/aprobarOrden', requireSubDominioToken, aprobarOrdenCompra)
router.post('/aprobarForPagos', requireSubDominioToken, aprobarPagosOrdenCompra)
router.post('/editOrden', requireSubDominioToken, editOrden)
router.post('/get/ordenesCompra/porPagar', requireSubDominioToken, getDataOrdenesComprasPorPagar)
router.post('/getDetalleProveedor', requireSubDominioToken, getDetalleProveedor)
router.post('/create/pagosOrdenes', requireSubDominioToken, createPagoOrdenes)
router.post('/get/listadoTransacciones', requireSubDominioToken, getListadoPagos)
router.post('/get/comprasRecepcion', requireSubDominioToken, getComprasForRecepcion)
router.post('/get/dataCompra/recepcion', requireSubDominioToken, getDataCompraRecepcion)
export default router
