import express from 'express'
import { getClientes, createCliente, disabledClient, disableManydClient, updateCliente } from '../../controllers/subDominios/cliente.js'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'

const router = express.Router()

router.post('/', requireSubDominioToken, getClientes)
router.post('/createCliente', requireSubDominioToken, createCliente)
router.post('/updateCliente', requireSubDominioToken, updateCliente)
router.post('/disabledClient', requireSubDominioToken, disabledClient)
router.post('/disableManydClient', requireSubDominioToken, disableManydClient)
export default router