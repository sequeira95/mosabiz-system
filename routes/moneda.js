import express from 'express'
import { requireToken } from '../middlewares/requireToken.js'
import { deleteMoneda, getMonedas, getTasas, saveMoneda } from '../controllers/monedas.js'

const router = express.Router()

router.post('/get', getMonedas)
router.post('/save', requireToken, saveMoneda)
router.post('/delete', requireToken, deleteMoneda)
router.post('/getTasas', getTasas)

export default router
