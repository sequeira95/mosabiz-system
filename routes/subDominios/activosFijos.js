import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import {
  addImagenToActivo,
  createActivoFijo,
  datosInicualesDepreciacion,
  deleteActivoFijo,
  deleteImgActivo,
  editActivoFijo,
  getActivosFijos,
  saveCalculosDepreciacion,
  saveToArray,
  DatosExcelCalculos
} from '../../controllers/subDominios/activosFijos.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getActivosFijos)
router.post('/edit', requireSubDominioToken, editActivoFijo)
router.post('/create', requireSubDominioToken, createActivoFijo)
router.post('/delete', requireSubDominioToken, deleteActivoFijo)
router.post('/saveToArray', requireSubDominioToken, saveToArray)
router.post('/delete/img', requireSubDominioToken, deleteImgActivo)
router.post('/add/img', requireSubDominioToken, addImagenToActivo)
router.post(
  '/datosInicialesDepreciacion',
  requireSubDominioToken,
  datosInicualesDepreciacion
)
router.post(
  '/saveCalculosDepreciacion',
  requireSubDominioToken,
  saveCalculosDepreciacion
)
router.post('/DatosExcelCalculos', requireSubDominioToken, DatosExcelCalculos)

export default router
