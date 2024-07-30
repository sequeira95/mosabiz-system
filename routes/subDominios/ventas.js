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
  deleteZonas,
  getZonas,
  saveZonas,
  saveZonasToArray
} from '../../controllers/subDominios/ventas/zonas.js'

import {
  getData,
  getPedidosVentas,
  getDetallePedidoVenta,
  getProductos,
  handleVenta
} from '../../controllers/subDominios/ventas/facturacion.js'

import {
  getDocumentosByTipo,
  getDocumentoByTipo
} from '../../controllers/subDominios/ventas/documentos.js'

const router = express.Router()

router.post('/sucursales/get', requireSubDominioToken, getSucursales)
router.post('/sucursales/set', requireSubDominioToken, createSucursal)
router.post('/sucursales/save', requireSubDominioToken, saveSucursales)
router.post('/sucursales/delete', requireSubDominioToken, deleteSucursales)
router.post('/sucursales/zonas', requireSubDominioToken, listSucursalesPorZonas)
router.post('/sucursales/zonas/save', requireSubDominioToken, saveSucursalesPorZonas)

router.post('/zonas/get', requireSubDominioToken, getZonas)
router.post('/zonas/set', requireSubDominioToken, saveZonas)
router.post('/zonas/save', requireSubDominioToken, saveZonasToArray)
router.post('/zonas/delete', requireSubDominioToken, deleteZonas)

router.post('/facturacion/data', requireSubDominioToken, getData)
router.post('/facturacion/pedidos-venta', requireSubDominioToken, getPedidosVentas)
router.post('/facturacion/pedidos-venta/detalle', requireSubDominioToken, getDetallePedidoVenta)
router.post('/facturacion/productos', requireSubDominioToken, getProductos)
router.post('/facturacion/pago-venta', requireSubDominioToken, handleVenta)

router.post('/documentos/:tipo', requireSubDominioToken, getDocumentosByTipo)
router.post('/documentos/:tipo/detalle', requireSubDominioToken, getDocumentoByTipo)

export default router
