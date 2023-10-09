import express from 'express'
import { createUserSuperAdmi, createUserAdmi, createUserProgramador } from '../controllers/user.js'
const router = express.Router()

router.post('/create/superAdmi', createUserSuperAdmi)
router.post('/create/admi', createUserAdmi)
router.post('/create/programador', createUserProgramador)

export default router
