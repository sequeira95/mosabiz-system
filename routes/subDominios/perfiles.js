import express from 'express'
import { getPerfil, updatePerfilEmpresa, updatePerfilCliente } from '../../controllers/subDominios/perfiles.js'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'

const router = express.Router()

router.post('/', requireSubDominioToken, getPerfil)
router.post('/updatePerfilEmpresa', requireSubDominioToken, updatePerfilEmpresa)
router.post('/updatePerfilCliente', requireSubDominioToken, updatePerfilCliente)
export default router
