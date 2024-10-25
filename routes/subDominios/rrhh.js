import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import {
  deleteEmpleado,
  getEmpleados,
  saveEmpleados,
  upsertEmpleados
} from '../../controllers/subDominios/rrhh/empleados.js'
import { getPerfiles, upsertPerfiles } from '../../controllers/subDominios/rrhh/perfiles.js'

const router = express.Router()

router.post('/empleados/get', requireSubDominioToken, getEmpleados)
router.post('/empleados/set', requireSubDominioToken, upsertEmpleados)
router.post('/empleados/save', requireSubDominioToken, saveEmpleados)
router.post('/empleados/delete', requireSubDominioToken, deleteEmpleado)

router.post('/perfiles/get', requireSubDominioToken, getPerfiles)
router.post('/perfiles/set', requireSubDominioToken, upsertPerfiles)

export default router
