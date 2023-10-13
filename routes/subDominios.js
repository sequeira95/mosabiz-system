import express from 'express'
import { getSubDominios, createSubDominio, disabledSubDominio, disabledSubDominios, deleteManySubDominios } from '../controllers/subDominios.js'
import { requireToken } from '../middlewares/requireToken.js'

const router = express.Router()

router.get('/', requireToken, getSubDominios)
router.post('/create', requireToken, createSubDominio)
router.post('/disabled/:id', requireToken, disabledSubDominio)
router.post('/disabledMany', requireToken, disabledSubDominios)
router.post('/deleteMany', requireToken, deleteManySubDominios)

export default router
