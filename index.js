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

// import SD

import authSDRouter from './routes/subDominios/authSubDominio.js'
import perfilSDRouter from './routes/subDominios/perfiles.js'

export const clientDb = database // .db(process.env.DB_NAME)
const app = express()
app.disable('x-powered-by')
app.use(cors({
  origin: '*'
}))
const PORT = process.env.PORT || 5000

// midelware
app.use(express.json())
app.use(cookieParser())
app.use('/v1/sub-dominios', SubDominiosRouter)
app.use('/v1/auth', authRouter)
app.use('/v1/rols', rolsRouter)
app.use('/v1/modulos', mantenedorModulosRouter)
app.use('/v1/users', userRouter)

// endPoints SD

app.use('/v1/sub-dominio/auth', authSDRouter)
app.use('/v1/sub-dominio/perfil', perfilSDRouter)

app.listen(PORT, () => console.log('http://localhost:' + PORT))
