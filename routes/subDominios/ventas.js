import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import {
  createSucursal,
  getSucursales,
  saveSucursales,
  deleteSucursales
} from '../../controllers/subDominios/ventas/sucursales.js'

const router = express.Router()

router.post('/sucursales/get', requireSubDominioToken, getSucursales)
router.post('/sucursales/set', requireSubDominioToken, createSucursal)
router.post('/sucursales/save', requireSubDominioToken, saveSucursales)
router.post('/sucursales/delete', requireSubDominioToken, deleteSucursales)


export default router
