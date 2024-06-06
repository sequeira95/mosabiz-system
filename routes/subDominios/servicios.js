import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { deleteServicio, getServicios, saveServicios, saveToArrayServicios } from '../../controllers/subDominios/servicios.js'

const router = express.Router()

router.post('/get', requireSubDominioToken, getServicios)
router.post('/save', requireSubDominioToken, saveServicios)
router.post('/saveToArray', requireSubDominioToken, saveToArrayServicios)
router.post('/delete', requireSubDominioToken, deleteServicio)
export default router
