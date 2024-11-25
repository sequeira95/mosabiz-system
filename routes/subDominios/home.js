import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { getDataEstadisticas } from '../../controllers/subDominios/home/estadisticas.js'

const router = express.Router()

router.post('/get/estadisticas', requireSubDominioToken, getDataEstadisticas)
export default router
