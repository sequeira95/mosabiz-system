import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { getHistorial } from '../../controllers/subDominios/historial.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getHistorial)
export default router
