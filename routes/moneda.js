import express from 'express'
import { requireToken } from '../middlewares/requireToken.js'
import { deleteMoneda, getMonedas, getTasas, saveMoneda } from '../controllers/monedas.js'
import { requireSubDominioToken } from '../middlewares/requireSubDominioToken.js'

const router = express.Router()

router.post('/get', (requireToken || requireSubDominioToken), getMonedas)
router.post('/save', requireToken, saveMoneda)
router.post('/delete', requireToken, deleteMoneda)
router.post('/getTasas', (requireToken || requireSubDominioToken), getTasas)

export default router
