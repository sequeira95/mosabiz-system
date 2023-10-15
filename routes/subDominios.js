import express from 'express'
import { getSubDominios, createSubDominio, disabledSubDominio, disabledmanySubDominios, deleteManySubDominios, updateSubDominio } from '../controllers/subDominios.js'
import { requireToken } from '../middlewares/requireToken.js'

const router = express.Router()

router.get('/', requireToken, getSubDominios)
router.post('/create', requireToken, createSubDominio)
router.post('/disabled/:id', requireToken, disabledSubDominio)
router.post('/disabledMany', requireToken, disabledmanySubDominios)
router.post('/deleteMany', requireToken, deleteManySubDominios)
router.put('/update/:_id', requireToken, updateSubDominio)

export default router
