import 'dotenv/config'
// import cron from 'node-cron'
import database from './database/connectdb.js'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import SubDominiosRouter from './routes/subDominios.js'
import authRouter from './routes/auth.js'
import rolsRouter from './routes/rols.js'
import monedasRouters from './routes/moneda.js'
import bancosRouters from './routes/bancos.js'
import impuestosRouters from './routes/impuestos.js'
import mantenedorModulosRouter from './routes/mantenedorModulos.js'
import userRouter from './routes/user.js'
import fileUpload from 'express-fileupload'

// import SD

import authSDRouter from './routes/subDominios/authSubDominio.js'
import perfilSDRouter from './routes/subDominios/perfiles.js'
import usersSDRouter from './routes/subDominios/users.js'
import clientesSDRouter from './routes/subDominios/cliente.js'
import ajustesSDRouter from './routes/subDominios/ajustes.js'
import planCuentaSDRouter from './routes/subDominios/planCuenta.js'
import periodosSDRouter from './routes/subDominios/periodos.js'
import comprobantesSDRouter from './routes/subDominios/comprobantes.js'
import tercerosSDRouter from './routes/subDominios/terceros.js'
import documentosSDRouter from './routes/subDominios/documentos.js'
import conciliacionSDRouter from './routes/subDominios/conciliacion.js'
import reportesSDRouter from './routes/subDominios/reportes.js'
import categoriasSDRouter from './routes/subDominios/categorias.js'
import zonasSDRouter from './routes/subDominios/zonas.js'
import activoFijosSDRouter from './routes/subDominios/activosFijos.js'
import almacenSDRouter from './routes/subDominios/almacen.js'
import historialSDRouter from './routes/subDominios/historial.js'
import productosSDRouter from './routes/subDominios/inventarioProducto.js'
import movimientosSDRouter from './routes/subDominios/movimientos.js'
import retencionSDRouter from './routes/subDominios/retencionISLR.js'
import bancosSDRouter from './routes/subDominios/bancos.js'
import clientesVentasSDRouter from './routes/subDominios/clientesVentas.js'
import serviciosSDRouter from './routes/subDominios/servicios.js'
import ivaSDRouter from './routes/subDominios/iva.js'
import proveedoresSDRouter from './routes/subDominios/proveedores.js'
import comprasSDRouter from './routes/subDominios/compras.js'
// import { getValoresBcv } from './utils/tareas.js'

export const clientDb = database // .db(process.env.DB_NAME)

const app = express()
app.disable('x-powered-by')
app.use(cors({
  origin: '*'
}))
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 }
  /* useTempFiles: true,
  tempFileDir: './uploads' */
}))
// tareas segundo plano
/* cron.schedule('30 8 * * *', () => {
  getValoresBcv()
}, {
  scheduled: true,
  timezone: 'America/Caracas'
}) */
const PORT = process.env.PORT || 8080
// midelware
app.use(express.json({ limit: '50mb' }))
app.use(cookieParser())
app.use('/v1/sub-dominios', SubDominiosRouter)
app.use('/v1/auth', authRouter)
app.use('/v1/rols', rolsRouter)
app.use('/v1/modulos', mantenedorModulosRouter)
app.use('/v1/users', userRouter)
app.use('/v1/monedas', monedasRouters)
app.use('/v1/bancos', bancosRouters)
app.use('/v1/impuestos', impuestosRouters)

// endPoints SD

app.use('/v1/sub-dominio/auth', authSDRouter)
app.use('/v1/sub-dominio/perfil', perfilSDRouter)
app.use('/v1/sub-dominio/users', usersSDRouter)
app.use('/v1/sub-dominio/clientes', clientesSDRouter)
app.use('/v1/sub-dominio/ajustes', ajustesSDRouter)
app.use('/v1/sub-dominio/planCuenta', planCuentaSDRouter)
app.use('/v1/sub-dominio/periodos', periodosSDRouter)
app.use('/v1/sub-dominio/comprobantes', comprobantesSDRouter)
app.use('/v1/sub-dominio/terceros', tercerosSDRouter)
app.use('/v1/sub-dominio/documentos', documentosSDRouter)
app.use('/v1/sub-dominio/conciliacion', conciliacionSDRouter)
app.use('/v1/sub-dominio/reportes', reportesSDRouter)
app.use('/v1/sub-dominio/categorias', categoriasSDRouter)
app.use('/v1/sub-dominio/zonas', zonasSDRouter)
app.use('/v1/sub-dominio/activosFijo', activoFijosSDRouter)
app.use('/v1/sub-dominio/almacen', almacenSDRouter)
app.use('/v1/sub-dominio/productos', productosSDRouter)
app.use('/v1/sub-dominio/movimientos', movimientosSDRouter)
app.use('/v1/sub-dominio/historial', historialSDRouter)
app.use('/v1/sub-dominio/retencion', retencionSDRouter)
app.use('/v1/sub-dominio/bancos', bancosSDRouter)
app.use('/v1/sub-dominio/clientesVentas', clientesVentasSDRouter)
app.use('/v1/sub-dominio/servicios', serviciosSDRouter)
app.use('/v1/sub-dominio/iva', ivaSDRouter)
app.use('/v1/sub-dominio/proveedores', proveedoresSDRouter)
app.use('/v1/sub-dominio/compras', comprasSDRouter)

app.listen(PORT, () => console.log('0.0.0.0' + PORT))
