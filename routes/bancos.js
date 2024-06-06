import express from 'express'
import { requireToken } from '../middlewares/requireToken.js'
import { deleteBanco, getBancos, saveBancos } from '../controllers/bancos.js'

const router = express.Router()

router.post('/get', getBancos)
router.post('/save', requireToken, saveBancos)
router.post('/delete', requireToken, deleteBanco)

export default router
