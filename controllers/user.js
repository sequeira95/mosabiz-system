import moment from 'moment'
import { dataBasePrincipal } from '../constants.js'
import { accessToDataBase } from '../utils/dataBaseConfing.js'
import { encryptPassword } from '../utils/hashPassword.js'

export const createUserSuperAdmi = async (req, res) => {
  const { nombre, email, password } = req.body
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const usuariosCollection = await db.collection('usuarios')
    // encriptamos el password
    const newPassword = await encryptPassword(password)
    await usuariosCollection.insertOne({
      nombre,
      email,
      password: newPassword,
      isSuperAdmin: true,
      fechaActPass: moment().toDate()
    })
    const personasCollection = await db.collection('personas')
    await personasCollection.insertOne({
      nombre,
      email,
      isSuperAdmin: true
    })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
export const createUserAdmi = async (req, res) => {
  const { nombre, email, password } = req.body
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const usuariosCollection = await db.collection('usuarios')
    // encriptamos el password
    const newPassword = await encryptPassword(password)
    await usuariosCollection.insertOne({
      nombre,
      email,
      password: newPassword,
      isAdmin: true,
      fechaActPass: moment().toDate()
    })
    const personasCollection = await db.collection('personas')
    await personasCollection.insertOne({
      nombre,
      email,
      isAdmin: true
    })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
