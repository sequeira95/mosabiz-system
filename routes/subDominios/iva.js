import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteIva, getIva, saveIva } from '../../controllers/subDominios/iva.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getIva)
router.post('/save', requireSubDominioToken, saveIva)
router.post('/delete', requireSubDominioToken, deleteIva)
export default router
