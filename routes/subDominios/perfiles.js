import express from 'express'
import { getPerfil, updatePerfilEmpresa } from '../../controllers/subDominios/perfiles.js'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'

const router = express.Router()

router.post('/', requireSubDominioToken, getPerfil)
router.post('/updatePerfilEmpresa', updatePerfilEmpresa)
export default router
