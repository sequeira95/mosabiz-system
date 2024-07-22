import express from 'express'
import { deleteCiclo, deleteIslr, deleteIva, deleteRetIva, getCiclos, getIslr, getIva, getRetIva, saveCiclos, saveIslr, saveIva, saveRetIva } from '../controllers/impuestos.js'
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
router.post('/save/cicloImpusto', requireToken, saveCiclos)
router.post('/get/ciclosImpuestos', requireToken, getCiclos)
router.post('/delete/ciclosImpuestos', requireToken, deleteCiclo)
export default router
