import express from 'express'
import { requireToken } from '../middlewares/requireToken.js'
import { deleteMoneda, getMonedas, saveMoneda } from '../controllers/monedas.js'

const router = express.Router()

router.post('/get', requireToken, getMonedas)
router.post('/save', requireToken, saveMoneda)
router.post('/delete', requireToken, deleteMoneda)

export default router
