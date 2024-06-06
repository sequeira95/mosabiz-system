import express from 'express'
import { deleteIva, getIva, saveIva } from '../controllers/iva.js'
import { requireToken } from '../middlewares/requireToken.js'

const router = express.Router()

router.post('/get', getIva)
router.post('/save', requireToken, saveIva)
router.post('/delete', requireToken, deleteIva)
export default router
