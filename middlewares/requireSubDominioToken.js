import jwt from 'jsonwebtoken'
import { tokenVerificationErrors } from '../utils/generateToken.js'
import { accessToDataBase, formatCollectionName } from '../utils/dataBaseConfing.js'
import { dataBaseSecundaria } from '../constants.js'
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
    const isValidFechaExp = moment.unix(exp).endOf('day') < moment().endOf('day')
    if (isValidFechaExp) throw new Error('Token expirado')
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioEmpresasCollectionsName = formatCollectionName({ enviromentEmpresa: dataBaseSecundaria, nameCollection: 'empresa' })
    const subDominioEmpresasCollections = await db.collection(subDominioEmpresasCollectionsName)
    const empresa = await subDominioEmpresasCollections.findOne({})
    if (!empresa) throw new Error('No existe empresa')
    if (empresa.activo === false) throw new Error('Empresa desactivada')
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: dataBaseSecundaria, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    const usuario = await usuariosCollection.findOne({ _id: new ObjectId(uid) })
    if (!usuario) throw new Error('No existe usuario')
    if (usuario.activo === false) throw new Error('Usuario desactivado')
    if (moment(fechaActPass).valueOf() !== moment(usuario.fechaActPass).valueOf()) throw new Error('Contraseña no coinciden')
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: dataBaseSecundaria, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const persona = await personasCollection.findOne({ usuarioId: usuario._id })
    if (persona && persona.clienteId) {
      const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: dataBaseSecundaria, nameCollection: 'clientes' })
      const clientesCollection = await db.collection(subDominioClientesCollectionsName)
      const cliente = await clientesCollection.findOne({ _id: new ObjectId(persona.clienteId) })
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
