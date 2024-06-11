import express from 'express'
import { deleteIslr, deleteIva, deleteRetIva, getIslr, getIva, getRetIva, saveIslr, saveIva, saveRetIva } from '../controllers/impuestos.js'
import { requireToken } from '../middlewares/requireToken.js'

const router = express.Router()

router.post('/get', getIva)
router.post('/save', requireToken, saveIva)
router.post('/delete', requireToken, deleteIva)
router.post('/get/islr', getIslr)
router.post('/save/islr', requireToken, saveIslr)
router.post('/delete/islr', requireToken, deleteIslr)
router.post('/get/retIva', requireToken, getRetIva)
router.post('/save/retIva', requireToken, saveRetIva)
router.post('/delete/retIva', requireToken, deleteRetIva)
export default router
