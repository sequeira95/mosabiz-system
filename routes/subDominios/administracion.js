import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { getTotalesTransaciones } from '../../controllers/subDominios/administracion/tesoria.js'

const router = express.Router()

router.post('/get/totalesTransacciones', requireSubDominioToken, getTotalesTransaciones)
export default router
