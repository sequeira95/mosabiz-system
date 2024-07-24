import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { getCiclos, getComprobantesRetencionIslr, getFacturasPorDeclarar, getListImpuestosIslr, getListProveedores, saveComprobanteRetIslrCompras, ultimaInfoRetencion } from '../../controllers/subDominios/tributos/tributos.js'

const router = express.Router()

router.post('/get/listIslr', requireSubDominioToken, getListImpuestosIslr)
router.post('/getCiclos', requireSubDominioToken, getCiclos)
router.post('/get/facturas/porDeclarar', requireSubDominioToken, getFacturasPorDeclarar)
router.post('/get/ultimaRetencion', requireSubDominioToken, ultimaInfoRetencion)
router.post('/get/proveedores', requireSubDominioToken, getListProveedores)
router.post('/save/retIslrCompras', requireSubDominioToken, saveComprobanteRetIslrCompras)
router.post('/get/retIslrCompra', requireSubDominioToken, getComprobantesRetencionIslr)
export default router