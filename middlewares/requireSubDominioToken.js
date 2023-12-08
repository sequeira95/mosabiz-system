import jwt from 'jsonwebtoken'
import { tokenVerificationErrors } from '../utils/generateToken.js'
import { getItemSD } from '../utils/dataBaseConfing.js'
import moment from 'moment'
import { ObjectId } from 'mongodb'

export const requireSubDominioToken = async (req, res, next) => {
  try {
    let token = req.headers?.authorization
    // verificamos si existe el token y si no existe enviamos un error
    if (!token) throw new Error('No bearer')
    // quitamos el Bearer del token
    token = token.split(' ')[1]
    const { uid, fechaActPass, exp } = jwt.verify(token, process.env.JWT_SECRETSD)
    const isValidFechaExp = moment.unix(exp) < moment()
    if (isValidFechaExp) throw new Error('Token expirado')
    const empresa = await getItemSD({ nameCollection: 'empresa' })
    if (!empresa) throw new Error('No existe empresa')
    if (empresa.activo === false) throw new Error('Empresa desactivada')
    const usuario = await getItemSD({ nameCollection: 'usuarios', filters: { _id: new ObjectId(uid) } })
    if (!usuario) throw new Error('No existe usuario')
    if (usuario.activo === false) throw new Error('Usuario desactivado')
    if (moment(fechaActPass).valueOf() !== moment(usuario.fechaActPass).valueOf()) throw new Error('Contraseña no coinciden')
    const persona = await getItemSD({ nameCollection: 'personas', filters: { usuarioId: usuario._id } })
    if (persona && persona.clienteId) {
      const cliente = await getItemSD({ nameCollection: 'clientes', filters: { _id: new ObjectId(persona.clienteId) } })
      if (!cliente) throw new Error('No existe cliente')
      if (cliente.activo === false) throw new Error('El cliente se encuentra inactivo')
    }
    req.uid = uid
    next()
  } catch (e) {
    // console.log(e)
    return res.status(500).send({ error: tokenVerificationErrors[e.message] })
  }
}
