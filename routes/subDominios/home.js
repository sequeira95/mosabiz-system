import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { getDataEstadisticas, getEstadisticasAntiguedadCuentas, getEstadisticasPosicionMonetaria, getEstadisticasTransacciones, prubaMetric } from '../../controllers/subDominios/home/estadisticas.js'
import { deleteEvent, getEvents, saveEvents } from '../../controllers/subDominios/home/calendarToDo.js'

const router = express.Router()

router.post('/get/estadisticas', requireSubDominioToken, getDataEstadisticas)
router.post('/get/estadisticas/transacciones', requireSubDominioToken, getEstadisticasTransacciones)
router.post('/get/estadisticas/posicionMonetaria', requireSubDominioToken, getEstadisticasPosicionMonetaria)
router.post('/get/estadisticas/antiguedadCuentas', requireSubDominioToken, getEstadisticasAntiguedadCuentas)
router.post('/get/estadisticas/antiguedadCuentas', requireSubDominioToken, getEstadisticasAntiguedadCuentas)
router.post('/save/event', requireSubDominioToken, saveEvents)
router.post('/get/events', requireSubDominioToken, getEvents)
router.post('/delete/event', requireSubDominioToken, deleteEvent)

// borrar despues de aqui
router.post('/pruebas', requireSubDominioToken, prubaMetric)
export default router
