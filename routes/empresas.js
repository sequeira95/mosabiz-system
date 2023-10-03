import express from 'express'
import { getSubDominios, createSubDominio } from '../controllers/subDominios.js'

const router = express.Router()

router.get('/', getSubDominios)
router.post('/', createSubDominio)

export default router
