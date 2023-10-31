import express from 'express'
import { getPerfil } from '../../controllers/subDominios/perfiles.js'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'

const router = express.Router()

router.post('/', requireSubDominioToken, getPerfil)
export default router
