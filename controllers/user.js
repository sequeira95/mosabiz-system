import { dataBasePrincipal } from '../constants.js'
import { accessToDataBase } from '../utils/dataBaseConfing.js'
import { encryptPassword } from '../utils/hashPassword.js'

export const createUserAdmi = async (req, res) => {
  const { nombreUsuario, email, password } = req.body
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const usuariosCollection = await db.collection('usuarios')
    // encriptamos el password
    const newPassword = await encryptPassword(password)
    await usuariosCollection.insertOne({
      nombreUsuario,
      email,
      password: newPassword,
      isAdmin: true
    })
    const personasCollection = await db.collection('personas')
    await personasCollection.insertOne({
      nombreUsuario,
      email,
      isAdmin: true
    })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
