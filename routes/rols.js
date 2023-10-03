import express from 'express'
import { getRols, createRol } from '../controllers/rols.js'
const router = express.Router()

router.get('/', getRols)
router.post('/', createRol)

export default router
