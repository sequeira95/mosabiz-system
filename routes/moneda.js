import express from 'express'
import { requireToken } from '../middlewares/requireToken.js'
import { deleteMoneda, getMonedas, getTasas, saveMoneda, deleteTasa, saveTasas, getTasasByMonth, getTasaByDay } from '../controllers/monedas.js'

const router = express.Router()

router.post('/get', getMonedas)
router.post('/save', requireToken, saveMoneda)
router.post('/delete', requireToken, deleteMoneda)
router.post('/getTasas', getTasas)
router.post('/getTasasOfMonth', getTasasByMonth)
router.post('/deleteTasa', deleteTasa)
router.post('/saveTasas', saveTasas)
router.post('/get/tasaDay', getTasaByDay)

export default router
