import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { anularComprobante, deletePeriodoFactura, getCiclos, getComprobantesRetencionIslr, getComprobantesRetencionIVA, getComprobantesRetencionIVAVenta, getDataIva, getFacturasPorDeclarar, getFacturasPorDeclararIva, getListClientes, getListImpuestosIslr, getListImpuestosRetIva, getListProveedores, saveComprobanteRetIslrCompras, saveComprobanteRetIvaCompras, saveDeclaracionIslr, saveDeclaracionIva, savePeriodoFactura, ultimaInfoRetencion } from '../../controllers/subDominios/tributos/tributos.js'

const router = express.Router()

router.post('/get/listIslr', requireSubDominioToken, getListImpuestosIslr)
router.post('/get/listRetIva', requireSubDominioToken, getListImpuestosRetIva)
router.post('/getCiclos', requireSubDominioToken, getCiclos)
router.post('/get/facturas/porDeclarar', requireSubDominioToken, getFacturasPorDeclarar)
router.post('/get/ultimaRetencion', requireSubDominioToken, ultimaInfoRetencion)
router.post('/get/proveedores', requireSubDominioToken, getListProveedores)
router.post('/save/retIslrCompras', requireSubDominioToken, saveComprobanteRetIslrCompras)
router.post('/get/retIslrCompra', requireSubDominioToken, getComprobantesRetencionIslr)
router.post('/anular/comprobante', requireSubDominioToken, anularComprobante)
router.post('/save/declaracionISLR', requireSubDominioToken, saveDeclaracionIslr)
router.post('/save/retIvaCompras', requireSubDominioToken, saveComprobanteRetIvaCompras)
router.post('/get/retIvaCompra', requireSubDominioToken, getComprobantesRetencionIVA)
router.post('/save/declaracionIva', requireSubDominioToken, saveDeclaracionIva)
router.post('/get/dataIva', requireSubDominioToken, getDataIva)
router.post('/get/retIvaVenta', requireSubDominioToken, getComprobantesRetencionIVAVenta)
router.post('/get/clientesVentas', requireSubDominioToken, getListClientes)
router.post('/get/facturas/porDeclarar/iva', requireSubDominioToken, getFacturasPorDeclararIva)
router.post('/save/periodoFactura', requireSubDominioToken, savePeriodoFactura)
router.post('/delete/periodoFactura', requireSubDominioToken, deletePeriodoFactura)
export default router
