import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteDocument, saveDocument } from '../../controllers/subDominios/documentos.js'

const router = express.Router()

router.post('/save', requireSubDominioToken, saveDocument)
router.post('/delete', requireSubDominioToken, deleteDocument)
export default router
