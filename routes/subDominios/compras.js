import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import {
  addImagenCompras,
  aprobarOrdenCompra,
  aprobarPagosOrdenCompra,
  cancelarCompra, createFacturas, createOrdenCompra,
  createPagoOrdenes,
  deleteImgCompras,
  editOrden,
  getDataCompra,
  getDataOrdenesComprasPorPagar,
  getDetalleProveedor,
  getFacturas,
  getListImpuestosIslr,
  getListImpuestosIva,
  getListProductosForCompra,
  getListadoCompras,
  getListadoPagos,
  getOrdenesComprasForFacturas,
  getServiciosForCompra,
  getSolicitudesInventario
} from '../../controllers/subDominios/compras/compras.js'
import { dataReportePorPagar } from '../../controllers/subDominios/compras/reportes.js'

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
router.post('/get/solicitudesInventario', requireSubDominioToken, getSolicitudesInventario)
router.post('/get/ordenesCompras', requireSubDominioToken, getOrdenesComprasForFacturas)
router.post('/save/factura', requireSubDominioToken, createFacturas)
router.post('/get/listadoFacturas', requireSubDominioToken, getFacturas)
router.post('/delete/img', requireSubDominioToken, deleteImgCompras)
router.post('/add/img', requireSubDominioToken, addImagenCompras)
router.post('/getDataReportePorPagar', requireSubDominioToken, dataReportePorPagar)
export default router
