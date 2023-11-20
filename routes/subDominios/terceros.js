import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { createTerceros, getTerceros } from '../../controllers/subDominios/terceros.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getTerceros)
router.post('/create', requireSubDominioToken, createTerceros)
export default router
