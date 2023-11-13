import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { getListPeriodo } from '../../controllers/subDominios/periodos.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getListPeriodo)
export default router
