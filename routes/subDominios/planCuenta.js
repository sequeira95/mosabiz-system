import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { saveCuenta, getPlanCuenta, deleteCuenta } from '../../controllers/subDominios/planCuenta.js'

const router = express.Router()

router.post('/getPlan', requireSubDominioToken, getPlanCuenta)
router.post('/saveCuenta', requireSubDominioToken, saveCuenta)
router.post('/deleteCuenta', requireSubDominioToken, deleteCuenta)
export default router
