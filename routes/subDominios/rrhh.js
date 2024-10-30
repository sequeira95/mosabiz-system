import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import {
  deleteEmpleado,
  getEmpleados,
  saveEmpleados,
  upsertEmpleados
} from '../../controllers/subDominios/rrhh/empleados.js'
import { getPerfiles, upsertPerfiles } from '../../controllers/subDominios/rrhh/perfiles.js'
import { getEmpleadosByPerfiles, getEmpleadosBySelected, upsertNomina, getNominas } from '../../controllers/subDominios/rrhh/nomina.js'

const router = express.Router()

router.post('/empleados/get', requireSubDominioToken, getEmpleados)
router.post('/empleados/set', requireSubDominioToken, upsertEmpleados)
router.post('/empleados/save', requireSubDominioToken, saveEmpleados)
router.post('/empleados/delete', requireSubDominioToken, deleteEmpleado)

router.post('/perfiles/get', requireSubDominioToken, getPerfiles)
router.post('/perfiles/set', requireSubDominioToken, upsertPerfiles)

router.post('/nomina/get-empleados', requireSubDominioToken, getEmpleadosByPerfiles)
router.post('/nomina/get-empleados-selected', requireSubDominioToken, getEmpleadosBySelected)
router.post('/nomina/get', requireSubDominioToken, getNominas)
router.post('/nomina/set', requireSubDominioToken, upsertNomina)

export default router
