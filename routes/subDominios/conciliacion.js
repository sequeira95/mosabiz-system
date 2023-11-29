import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { getListCuentas, movimientosBancos, saveToExcelMocimientosBancarios } from '../../controllers/subDominios/conciliacion.js'

const router = express.Router()

router.post('/getCuentas', requireSubDominioToken, getListCuentas)
router.post('/bancos/get', requireSubDominioToken, movimientosBancos)
router.post('/bancos/saveExcel', requireSubDominioToken, saveToExcelMocimientosBancarios)
export default router
