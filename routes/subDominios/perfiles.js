import express from 'express'
import { getPerfil } from '../../controllers/subDominios/perfiles'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken'

const router = express.Router()

router.post('/', requireSubDominioToken, getPerfil)
export default router
