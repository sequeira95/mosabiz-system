import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { addImagenPlanillaIva, anularComprobante, deleteImgPlanillas, deletePeriodoFactura, eliminarDocumentos, getCajasSucursalList, getCiclos, getComprobantesRetencionIslr, getComprobantesRetencionIVA, getComprobantesRetencionIVAVenta, getDataIva, getFacturasPorDeclarar, getFacturasPorDeclararIva, getListClientes, getListImpuestosIslr, getListImpuestosRetIva, getListProveedores, getSucursalesList, saveComprobanteRetIslrCompras, saveComprobanteRetIvaCompras, saveComprobanteRetIvaVentas, saveDeclaracionIslr, saveDeclaracionIva, saveDocumentosfiscalesToArray, savePeriodoFactura, savePlanillaIva, ultimaInfoRetencion } from '../../controllers/subDominios/tributos/tributos.js'
import { getLibroCompra } from '../../controllers/subDominios/tributos/reportes.js'

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
router.post('/save/retIvaVenta', requireSubDominioToken, saveComprobanteRetIvaVentas)
router.post('/get/clientesVentas', requireSubDominioToken, getListClientes)
router.post('/get/facturas/porDeclarar/iva', requireSubDominioToken, getFacturasPorDeclararIva)
router.post('/save/periodoFactura', requireSubDominioToken, savePeriodoFactura)
router.post('/delete/periodoFactura', requireSubDominioToken, deletePeriodoFactura)
router.post('/save/documentosFiscalesToArray', requireSubDominioToken, saveDocumentosfiscalesToArray)
router.post('/get/sucursales', requireSubDominioToken, getSucursalesList)
router.post('/get/sucursales/caja', requireSubDominioToken, getCajasSucursalList)
router.post('/save/planillaIva', requireSubDominioToken, savePlanillaIva)
router.post('/add/img/planillaIva', requireSubDominioToken, addImagenPlanillaIva)
router.post('/delete/img/planillaIva', requireSubDominioToken, deleteImgPlanillas)
router.post('/get/libroCompras', requireSubDominioToken, getLibroCompra)
router.post('/eliminando', requireSubDominioToken, eliminarDocumentos) // eliminar esta ruta
export default router
