import moment from 'moment'
import { dataBasePrincipal } from '../constants.js'
import { accessToDataBase } from '../utils/dataBaseConfing.js'
import { generateToken } from '../utils/generateToken.js'
import { comparePassword } from '../utils/hashPassword.js'
import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'

export const login = async (req, res) => {
  const db = await accessToDataBase(dataBasePrincipal)
  const { email, password } = req.body
  let token = req.headers?.authorization
  if (token) {
    // quitamos el Bearer del token
    try {
      token = token.split(' ')[1]
      const { uid, fechaActPass } = jwt.verify(token, process.env.JWT_SECRET)
      const usuariosCollection = await db.collection('usuarios')
      const usuario = await usuariosCollection.findOne({ _id: new ObjectId(uid) })
      if (!usuario) throw new Error('Usuario no encontrado')
      if (moment(fechaActPass).valueOf() !== moment(usuario.fechaActPass).valueOf()) throw new Error('Contraseña no coinciden')
      const personasCollection = await db.collection('personas')
      const persona = await personasCollection.findOne({ usuarioId: new ObjectId(usuario._id) })
      return res.status(200).json(persona)
    } catch (e) {
      // console.log(e)
      return res.status(500).json({ error: 'Error de servidor' })
    }
  }

  try {
    const usuariosCollection = await db.collection('usuarios')
    const usuario = await usuariosCollection.findOne({ email: email.toLowerCase() })
    // en caso de que no exista el email , retornamos un error
    if (!usuario) return res.status(403).json({ error: 'Usuario o contraseña incorrecto' })
    const isValidPassword = await comparePassword(password, usuario.password)
    // en caso de que no sea valida la contraseña, retornamos un error
    if (!isValidPassword) return res.status(403).json({ error: 'Usuario o contraseña incorrecto' })
    // generando token jwt
    const personasCollection = await db.collection('personas')
    const persona = await personasCollection.findOne({ usuarioId: usuario._id })
    const { token, expiresIn } = generateToken({
      uid: usuario._id,
      fechaActPass: usuario.fechaActPass,
      email: usuario.email,
      isSuperAdmin: persona.isSuperAdmin,
      isAdmin: persona.isAdmin,
      isProgramador: persona.isProgramador
    }, res)
    return res.status(200).json(({ token, expiresIn, persona }))
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
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
export const logout = (req, res) => {
  res.clearCookie('aibizToken')
  res.json({ ok: 'cerró sesión' })
}
