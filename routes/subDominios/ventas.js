import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import {
  createSucursal,
  getSucursales,
  saveSucursales,
  deleteSucursales,
  listSucursalesPorZonas,
  saveSucursalesPorZonas
} from '../../controllers/subDominios/ventas/sucursales.js'

import {
  createCajas,
  deleteCajas,
  getCajas,
  saveCajas
} from '../../controllers/subDominios/ventas/cajas.js'

import {
  deleteZonas,
  getZonas,
  saveZonas,
  saveZonasToArray
} from '../../controllers/subDominios/ventas/zonas.js'

import {
  getData,
  getPedidosVentas,
  getDetallePedidoVenta,
  getFacturas,
  getDetalleFacturas,
  getProductos,
  handleVenta,
  getNotasEntrega,
  getDetalleNotasEntrega
} from '../../controllers/subDominios/ventas/facturacion.js'

import {
  getDocumentosByTipo,
  getDocumentoByTipo
} from '../../controllers/subDominios/ventas/documentos.js'
import { getDetalleVentas, getVentasCobros } from '../../controllers/subDominios/ventas/cobros.js'

const router = express.Router()

router.post('/sucursales/get', requireSubDominioToken, getSucursales)
router.post('/sucursales/set', requireSubDominioToken, createSucursal)
router.post('/sucursales/save', requireSubDominioToken, saveSucursales)
router.post('/sucursales/delete', requireSubDominioToken, deleteSucursales)
router.post('/sucursales/zonas', requireSubDominioToken, listSucursalesPorZonas)
router.post('/sucursales/zonas/save', requireSubDominioToken, saveSucursalesPorZonas)

router.post('/cajas/get', requireSubDominioToken, getCajas)
router.post('/cajas/set', requireSubDominioToken, createCajas)
router.post('/cajas/save', requireSubDominioToken, saveCajas)
router.post('/cajas/delete', requireSubDominioToken, deleteCajas)

router.post('/zonas/get', requireSubDominioToken, getZonas)
router.post('/zonas/set', requireSubDominioToken, saveZonas)
router.post('/zonas/save', requireSubDominioToken, saveZonasToArray)
router.post('/zonas/delete', requireSubDominioToken, deleteZonas)

router.post('/facturacion/data', requireSubDominioToken, getData)
router.post('/facturacion/pedidos-venta', requireSubDominioToken, getPedidosVentas)
router.post('/facturacion/pedidos-venta/detalle', requireSubDominioToken, getDetallePedidoVenta)
router.post('/facturacion/facturas', requireSubDominioToken, getFacturas)
router.post('/facturacion/facturas/detalle', requireSubDominioToken, getDetalleFacturas)
router.post('/facturacion/notas-entrega', requireSubDominioToken, getNotasEntrega)
router.post('/facturacion/notas-entrega/detalle', requireSubDominioToken, getDetalleNotasEntrega)
router.post('/facturacion/productos', requireSubDominioToken, getProductos)
router.post('/facturacion/pago-venta', requireSubDominioToken, handleVenta)

router.post('/documentos/:tipo', requireSubDominioToken, getDocumentosByTipo)
router.post('/documentos/:tipo/detalle', requireSubDominioToken, getDocumentoByTipo)

router.post('/get/ventas/porCobrar', requireSubDominioToken, getVentasCobros)
router.post('/getDetalleVentas', requireSubDominioToken, getDetalleVentas)

export default router
