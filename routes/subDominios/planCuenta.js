import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { /* saveCuenta, */ getPlanCuenta, deleteCuenta, saveCuentaToExcel, addTerceroToCuenta, saveCuentaToArray, saveCuentatoExcelNewNivel, getCuentasMovimientos, deletePlanCuenta } from '../../controllers/subDominios/planCuenta.js'

const router = express.Router()

router.post('/getPlan', requireSubDominioToken, getPlanCuenta)
router.post('/getPlanMovimientos', requireSubDominioToken, getCuentasMovimientos)
router.post('/saveCuenta', requireSubDominioToken, saveCuentaToArray)
router.post('/saveCuentatoExcel', requireSubDominioToken, saveCuentaToExcel)
router.post('/saveCuentatoExcelNewNivel', requireSubDominioToken, saveCuentatoExcelNewNivel)
router.post('/deleteCuenta', requireSubDominioToken, deleteCuenta)
router.post('/terceros/add', requireSubDominioToken, addTerceroToCuenta)
router.post('/deletePlan', requireSubDominioToken, deletePlanCuenta)
export default router
