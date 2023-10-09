import { dataBasePrincipal } from '../constants.js'
import { accessToDataBase } from '../utils/dataBaseConfing.js'
import { generateToken } from '../utils/generateToken.js'
import { comparePassword } from '../utils/hashPassword.js'

export const login = async (req, res) => {
  const { email, password } = req.body
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const usuariosCollection = await db.collection('usuarios')
    const usuario = await usuariosCollection.findOne({ email })
    // en caso de que no exista el email , retornamos un error
    if (!usuario) return res.status(403).json({ error: 'Usuario o contraseña incorrecto' })
    const isValidPassword = await comparePassword(password, usuario.password)
    // en caso de que no sea valida la contraseña, retornamos un error
    if (!isValidPassword) return res.status(403).json({ error: 'Usuario o contraseña incorrecto' })
    // generando token jwt
    const personasCollection = await db.collection('personas')
    const persona = await personasCollection.findOne({ usuarioId: usuario._id })
    const { token, expiresIn } = generateToken({ uid: usuario._id, fechaActPass: usuario.fechaActPass, email: usuario.email }, res)
    return res.json({ token, expiresIn, persona })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
export const refreshToken = async (req, res) => {
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const usuariosCollection = await db.collection('usuarios')
    const usuario = await usuariosCollection.findOne({ _id: req.uid })
    const { token, expiresIn } = generateToken({ uid: usuario._id, fechaActPass: usuario.fechaActPass, email: usuario.email })
    delete usuario.password
    return res.json({ token, expiresIn, usuario })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
export const logout = (req, res) => {
  res.clearCookie('aibizToken')
  res.json({ ok: 'cerró sesión' })
}
