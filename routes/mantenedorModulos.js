import express from 'express'
import { getModules, createModules } from '../controllers/mantenedorModulos.js'

const router = express.Router()

router.get('/', getModules)
router.post('/', createModules)

export default router
