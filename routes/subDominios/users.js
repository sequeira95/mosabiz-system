import express from 'express'
import { getUsers, getUsersClientes, createUser, updateUser, createUserCliente, updateUserCliente, deleteUser, changePassword } from '../../controllers/subDominios/users.js'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'

const router = express.Router()

router.post('/getUsers', requireSubDominioToken, getUsers)
router.post('/getUsersClientes', requireSubDominioToken, getUsersClientes)
router.post('/createUser', requireSubDominioToken, createUser)
router.post('/updateUser', requireSubDominioToken, updateUser)
router.post('/createUserCliente', requireSubDominioToken, createUserCliente)
router.post('/updateUserCliente', requireSubDominioToken, updateUserCliente)
router.post('/deleteUser', requireSubDominioToken, deleteUser)
router.post('/changePassword', requireSubDominioToken, changePassword)
export default router
