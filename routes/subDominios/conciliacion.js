import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteMovimientoBancario, detalleMovimientos, gastosBancariosSinConciliar, getListCuentas, movimientosBancos, movimientosCP, saveToExcelMocimientosBancarios, movimientosCC, movimientosBancariosConciliados } from '../../controllers/subDominios/conciliacion.js'

const router = express.Router()

router.post('/getCuentas', requireSubDominioToken, getListCuentas)
router.post('/bancos/get', requireSubDominioToken, movimientosBancos)
router.post('/bancos/getNoConciliados', requireSubDominioToken, gastosBancariosSinConciliar)
router.post('/bancos/getConciliados', requireSubDominioToken, movimientosBancariosConciliados)
router.post('/bancos/saveExcel', requireSubDominioToken, saveToExcelMocimientosBancarios)
router.post('/bancos/delete', requireSubDominioToken, deleteMovimientoBancario)
router.post('/cp/get', requireSubDominioToken, movimientosCP)
router.post('/cc/get', requireSubDominioToken, movimientosCC)
router.post('/movimientos', requireSubDominioToken, detalleMovimientos)
export default router
