import 'dotenv/config'
import database from './database/connectdb.js'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import empresasRouter from './routes/empresas.js'
import authRouter from './routes/auth.js'
import rolsRouter from './routes/rols.js'
import mantenedorModulosRouter from './routes/mantenedorModulos.js'
import userRouter from './routes/user.js'

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
app.use('/v1/empresas', empresasRouter)
app.use('/v1/auth', authRouter)
app.use('/v1/rols', rolsRouter)
app.use('/v1/modulos', mantenedorModulosRouter)
app.use('/v1/users', userRouter)

app.listen(PORT, () => console.log('http://localhost:' + PORT))
