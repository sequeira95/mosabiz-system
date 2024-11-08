import express from 'express'
import { requireSubDominioToken } from '../../middlewares/requireSubDominioToken.js'
import { balanceComprobacion, comprobantes, estadoResultado, estadoSituacionFinanciera, libroDiario, libroMayor, mayorAnalitico } from '../../controllers/subDominios/reportes.js'
import { deleteImportaciones, reporteAntiguedadInventario, reporteAntiguedadInventarioAlmacen, reporteHistoricoMovimientos, reporteInventarios, reporteInventariosAlmacen, reporteProductos, reporteProductosAlmacen, reporteRotacionInventario, reporteRotacionInventarioAlmacen, saveComprasExcel, savePoductosExcel, saveVentasExcel } from '../../controllers/subDominios/reportesInventario.js'

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
router.post('/inventario/reporteInventariosAlmacen', requireSubDominioToken, reporteInventariosAlmacen)

// borrar estas rutas despues de probar
router.post('/save/productisInit', requireSubDominioToken, savePoductosExcel)
router.post('/save/compras', requireSubDominioToken, saveComprasExcel)
router.post('/save/ventas', requireSubDominioToken, saveVentasExcel)
router.post('/delete/todo', requireSubDominioToken, deleteImportaciones)

export default router
