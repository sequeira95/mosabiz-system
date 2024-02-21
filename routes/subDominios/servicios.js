import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteServicio, getServicios, saveServicios } from '../../controllers/subDominios/servicios.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getServicios)
router.post('/save', requireSubDominioToken, saveServicios)
router.post('/delete', requireSubDominioToken, deleteServicio)
export default router
