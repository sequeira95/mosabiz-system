import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteProveedor, getProveedores, saveProveedor } from '../../controllers/subDominios/proveedores.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getProveedores)
router.post('/save', requireSubDominioToken, saveProveedor)
router.post('/delete', requireSubDominioToken, deleteProveedor)
export default router