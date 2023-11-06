import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { upsertAjusteCliente } from '../../controllers/subDominios/ajustes.js'

const router = express.Router()

router.post('/modificar', requireSubDominioToken, upsertAjusteCliente)
export default router
