import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import {
  addImagenMovimiento,
  cancelarMovimiento,
  cerrarRecepcionCompra,
  createDevolucion,
  createDevolucionCompra,
  createMovimientos,
  deleteImgMovimiento,
  getComprasForRecepcion,
  getDataCompraRecepcion,
  getDataMovimientos,
  getDataOrdenCompra,
  getDevoluciones,
  getMovimientosAjustes,
  getMovimientosParaDevoluciones,
  recepcionInventarioCompra,
  saveAjusteAlmacenAuditoria,
  saveAjusteAlmacenDevoluciones,
  updateCostoMovimiento,
  updateEstadoMovimiento
} from '../../controllers/subDominios/movimientos.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getDataMovimientos)
router.post('/create', requireSubDominioToken, createMovimientos)
router.post('/cancel', requireSubDominioToken, cancelarMovimiento)
router.post('/updateEstate', requireSubDominioToken, updateEstadoMovimiento)
router.post('/getMovimientosAjustes', requireSubDominioToken, getMovimientosAjustes)
router.post('/saveAjusteAlmacenAuditoria', requireSubDominioToken, saveAjusteAlmacenAuditoria)
router.post('/updateCostoMovimiento', requireSubDominioToken, updateCostoMovimiento)
router.post('/getMovimientosForDevoluciones', requireSubDominioToken, getMovimientosParaDevoluciones)
router.post('/createDevolucion', requireSubDominioToken, createDevolucion)
router.post('/getDevoluciones', requireSubDominioToken, getDevoluciones)
router.post('/get/dataCompra/recepcion', requireSubDominioToken, getDataCompraRecepcion)
router.post('/get/comprasRecepcion', requireSubDominioToken, getComprasForRecepcion)
router.post('/recepcionCompra', requireSubDominioToken, recepcionInventarioCompra)
router.post('/cierreRecepcionCompra', requireSubDominioToken, cerrarRecepcionCompra)
router.post('/saveAjusteAlmacenDevoluciones', requireSubDominioToken, saveAjusteAlmacenDevoluciones)
router.post('/get/getDataOrden', requireSubDominioToken, getDataOrdenCompra)
router.post('/createDevolucionCompra', requireSubDominioToken, createDevolucionCompra)
router.post('/delete/img', requireSubDominioToken, deleteImgMovimiento)
router.post('/add/img', requireSubDominioToken, addImagenMovimiento)
export default router
