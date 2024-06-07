import express from 'express'
import { deleteIslr, deleteIva, getIslr, getIva, saveIslr, saveIva } from '../controllers/impuestos.js'
import { requireToken } from '../middlewares/requireToken.js'

const router = express.Router()

router.post('/get', getIva)
router.post('/save', requireToken, saveIva)
router.post('/delete', requireToken, deleteIva)
router.post('/get/islr', getIslr)
router.post('/save/islr', requireToken, saveIslr)
router.post('/delete/islr', requireToken, deleteIslr)
export default router
