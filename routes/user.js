import express from 'express'
import { getUsers, createUserSuperAdmi, createUserAdmi, createUserProgramador, deleteUser, updateUser } from '../controllers/user.js'
import { requireToken } from '../middlewares/requireToken.js'
const router = express.Router()

router.get('/', getUsers)
router.post('/create/superAdmi', createUserSuperAdmi)
router.post('/create/admi', requireToken, createUserAdmi)
router.post('/create/programador', createUserProgramador)
router.post('/update/:id', requireToken, updateUser)
router.delete('/delele/:_id', requireToken, deleteUser)

export default router
