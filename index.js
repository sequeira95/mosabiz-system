import 'dotenv/config'
import database from './database/connectdb.js'
import express from 'express'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import empresasRouter from './routes/empresas.js'
import authRouter from './routes/auth.js'
import rolsRouter from './routes/rols.js'

export const clientDb = database // .db(process.env.DB_NAME)
const app = express()
app.disable('x-powered-by')
app.use(
  cors()
)
const PORT = process.env.PORT || 5000

// midelware
app.use(express.json())
app.use(cookieParser())
app.use('/api/v1/empresas', empresasRouter)
app.use('/api/v1/auth', authRouter)
app.use('/api/v1/rols', rolsRouter)

app.listen(PORT, () => console.log('http://localhost:' + PORT))
