import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteCliente, getClientesVentas, saveClienteVentas } from '../../controllers/subDominios/clientesVentas.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getClientesVentas)
router.post('/save', requireSubDominioToken, saveClienteVentas)
router.post('/delete', requireSubDominioToken, deleteCliente)
export default router
