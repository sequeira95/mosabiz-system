import jwt from 'jsonwebtoken'
import { tokenVerificationErrors } from '../utils/generateToken.js'
import { accessToDataBase } from '../utils/dataBaseConfing.js'
import { dataBasePrincipal } from '../constants.js'
import moment from 'moment'
import { ObjectId } from 'mongodb'

export const requireToken = async (req, res, next) => {
  try {
    let token = req.headers?.authorization
    // verificamos si existe el token y si no existe enviamos un error
    if (!token) throw new Error('No bearer')
    // quitamos el Bearer del token
    token = token.split(' ')[1]
    const { uid, fechaActPass, isSuperAdmin, isAdmin, isProgramador } = jwt.verify(token, process.env.JWT_SECRET)
    const db = await accessToDataBase(dataBasePrincipal)
    const usuariosCollection = await db.collection('usuarios')
    const usuario = await usuariosCollection.findOne({ _id: new ObjectId(uid) })
    if (moment(fechaActPass).valueOf() !== moment(usuario.fechaActPass).valueOf()) throw new Error('Contraseña no coinciden')
    req.uid = uid
    req.isSuperAdmin = isSuperAdmin
    req.isAdmin = isAdmin
    req.isProgramador = isProgramador
    next()
  } catch (e) {
    console.log(e)
    return res.status(500).send({ error: tokenVerificationErrors[e.message] })
  }
}
