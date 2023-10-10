import express from 'express'
import { getSubDominios, createSubDominio, disabledSubDominio } from '../controllers/subDominios.js'
import { requireToken } from '../middlewares/requireToken.js'

const router = express.Router()

router.get('/', requireToken, getSubDominios)
router.post('/create', requireToken, createSubDominio)
router.post('/disabled/:id', requireToken, disabledSubDominio)

export default router
