import 'dotenv/config'
import database from './database/connectdb.js'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import SubDominiosRouter from './routes/subDominios.js'
import authRouter from './routes/auth.js'
import rolsRouter from './routes/rols.js'
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

const PORT = process.env.PORT || 5000
// midelware
app.use(express.json({ limit: '50mb' }))
app.use(cookieParser())
app.use('/v1/sub-dominios', SubDominiosRouter)
app.use('/v1/auth', authRouter)
app.use('/v1/rols', rolsRouter)
app.use('/v1/modulos', mantenedorModulosRouter)
app.use('/v1/users', userRouter)

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

app.listen(PORT, () => console.log('http://localhost:' + PORT))
