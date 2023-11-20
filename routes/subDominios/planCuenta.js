import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { saveCuenta, getPlanCuenta, deleteCuenta, saveCuentaToExcel, addTerceroToCuenta } from '../../controllers/subDominios/planCuenta.js'

const router = express.Router()

router.post('/getPlan', requireSubDominioToken, getPlanCuenta)
router.post('/saveCuenta', requireSubDominioToken, saveCuenta)
router.post('/saveCuentatoExcel', requireSubDominioToken, saveCuentaToExcel)
router.post('/deleteCuenta', requireSubDominioToken, deleteCuenta)
router.post('/terceros/add', requireSubDominioToken, addTerceroToCuenta)
export default router
