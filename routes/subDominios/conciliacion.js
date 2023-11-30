import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteMovimientoBancario, getListCuentas, movimientosBancos, movimientosCP, saveToExcelMocimientosBancarios } from '../../controllers/subDominios/conciliacion.js'

const router = express.Router()

router.post('/getCuentas', requireSubDominioToken, getListCuentas)
router.post('/bancos/get', requireSubDominioToken, movimientosBancos)
router.post('/bancos/saveExcel', requireSubDominioToken, saveToExcelMocimientosBancarios)
router.post('/bancos/delete', requireSubDominioToken, deleteMovimientoBancario)
router.post('/cp/get', requireSubDominioToken, movimientosCP)
export default router
