import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { anularComprobante, getCiclos, getComprobantesRetencionIslr, getFacturasPorDeclarar, getListImpuestosIslr, getListProveedores, saveComprobanteRetIslrCompras, saveDeclaracionIslr, ultimaInfoRetencion } from '../../controllers/subDominios/tributos/tributos.js'

const router = express.Router()

router.post('/get/listIslr', requireSubDominioToken, getListImpuestosIslr)
router.post('/getCiclos', requireSubDominioToken, getCiclos)
router.post('/get/facturas/porDeclarar', requireSubDominioToken, getFacturasPorDeclarar)
router.post('/get/ultimaRetencion', requireSubDominioToken, ultimaInfoRetencion)
router.post('/get/proveedores', requireSubDominioToken, getListProveedores)
router.post('/save/retIslrCompras', requireSubDominioToken, saveComprobanteRetIslrCompras)
router.post('/get/retIslrCompra', requireSubDominioToken, getComprobantesRetencionIslr)
router.post('/anular/comprobante', requireSubDominioToken, anularComprobante)
router.post('/save/declaracionISLR', requireSubDominioToken, saveDeclaracionIslr)
export default router
