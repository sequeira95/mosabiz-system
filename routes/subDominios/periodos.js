import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deletePeriodo, getListPeriodo, savePeriodo } from '../../controllers/subDominios/periodos.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getListPeriodo)
router.post('/save', requireSubDominioToken, savePeriodo)
router.post('/delete', requireSubDominioToken, deletePeriodo)
export default router
