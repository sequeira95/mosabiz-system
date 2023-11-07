import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { upsertAjusteCliente, getTipoAjustesCliente, getAjustesCliente } from '../../controllers/subDominios/ajustes.js'

const router = express.Router()

router.post('/getAjustes', requireSubDominioToken, getAjustesCliente)
router.post('/getTipoAjuste', requireSubDominioToken, getTipoAjustesCliente)
router.post('/modificar', requireSubDominioToken, upsertAjusteCliente)
export default router
