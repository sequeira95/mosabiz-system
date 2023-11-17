import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { createTerceros } from '../../controllers/subDominios/terceros.js'

const router = express.Router()

router.post('/create', requireSubDominioToken, createTerceros)
export default router
