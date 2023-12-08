import express from 'express'
import { login, logout, recoverPassword } from '../../controllers/subDominios/authSubDominio.js'

const router = express.Router()

router.post('/login', login)
router.post('/logout', logout)
router.post('/recoverPass', recoverPassword)

export default router
