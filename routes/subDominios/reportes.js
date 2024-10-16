import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { balanceComprobacion, comprobantes, estadoResultado, estadoSituacionFinanciera, libroDiario, libroMayor, mayorAnalitico } from '../../controllers/subDominios/reportes.js'
import { reporteAntiguedadInventario, reporteAntiguedadInventarioAlmacen, reporteHistoricoMovimientos, reporteInventarios, reporteProductos, reporteProductosAlmacen, reporteRotacionInventario, reporteRotacionInventarioAlmacen } from '../../controllers/subDominios/reportesInventario.js'

const router = express.Router()

router.post('/mayorAnalitico', requireSubDominioToken, mayorAnalitico)
router.post('/balanceComprobacion', requireSubDominioToken, balanceComprobacion)
router.post('/comprobantes', requireSubDominioToken, comprobantes)
router.post('/libroDiario', requireSubDominioToken, libroDiario)
router.post('/libroMayor', requireSubDominioToken, libroMayor)
router.post('/ESF', requireSubDominioToken, estadoSituacionFinanciera)
router.post('/ER', requireSubDominioToken, estadoResultado)
router.post('/inventario/productos', requireSubDominioToken, reporteProductos)
router.post('/inventario/productosAlmacen', requireSubDominioToken, reporteProductosAlmacen)
router.post('/inventario/rotacionInventario', requireSubDominioToken, reporteRotacionInventario)
router.post('/inventario/rotacionInventarioAlmacen', requireSubDominioToken, reporteRotacionInventarioAlmacen)
router.post('/inventario/historicoMovimientos', requireSubDominioToken, reporteHistoricoMovimientos)
router.post('/inventario/antiguedadInventario', requireSubDominioToken, reporteAntiguedadInventario)
router.post('/inventario/antiguedadInventarioAlmacen', requireSubDominioToken, reporteAntiguedadInventarioAlmacen)
router.post('/inventario/reporteInventarios', requireSubDominioToken, reporteInventarios)
export default router
