import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteRetencion, getListBancos, saveBancos } from '../../controllers/subDominios/bancos.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getListBancos)
router.post('/save', requireSubDominioToken, saveBancos)
router.post('/delete', requireSubDominioToken, deleteRetencion)
export default router
