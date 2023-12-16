import express from 'express'
import { getUsers, createUserSuperAdmi, createUserAdmi, createUserProgramador, deleteUser, updateUser, deleteUserMany } from '../controllers/user.js'
import { requireToken } from '../middlewares/requireToken.js'
const router = express.Router()

router.get('/', getUsers)
router.post('/create/superAdmi', createUserSuperAdmi)
router.post('/create/admi', requireToken, createUserAdmi)
router.post('/create/programador', createUserProgramador)
router.post('/update/:_id', requireToken, updateUser)
router.delete('/delete/:_id', requireToken, deleteUser)
router.post('/deleteMany', requireToken, deleteUserMany)

export default router
