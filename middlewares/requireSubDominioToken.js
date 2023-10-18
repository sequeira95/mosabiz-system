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
    const { uid, fechaActPass } = jwt.verify(token, process.env.JWT_SECRETSD)
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioEmpresasCollectionsName = formatCollectionName({ enviromentEmpresa: dataBaseSecundaria, nameCollection: 'empresas' })
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
    req.uid = uid
    next()
  } catch (e) {
    // console.log(e)
    return res.status(500).send({ error: tokenVerificationErrors[e.message] })
  }
}
