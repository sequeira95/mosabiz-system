import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import {
  createSucursal,
  getSucursales,
  saveSucursales,
  deleteSucursales
} from '../../controllers/subDominios/ventas/sucursales.js'

import {
  deleteZonas,
  getZonas,
  saveZonas,
  saveZonasToArray
} from '../../controllers/subDominios/ventas/zonas.js'

const router = express.Router()

router.post('/sucursales/get', requireSubDominioToken, getSucursales)
router.post('/sucursales/set', requireSubDominioToken, createSucursal)
router.post('/sucursales/save', requireSubDominioToken, saveSucursales)
router.post('/sucursales/delete', requireSubDominioToken, deleteSucursales)

router.post('/zonas/get', requireSubDominioToken, getZonas)
router.post('/zonas/set', requireSubDominioToken, saveZonas)
router.post('/zonas/save', requireSubDominioToken, saveZonasToArray)
router.post('/zonas/delete', requireSubDominioToken, deleteZonas)

export default router
