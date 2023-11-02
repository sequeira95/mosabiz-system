import moment from 'moment'
import { dataBasePrincipal, dataBaseSecundaria, subDominioName } from '../../constants.js'
import { accessToDataBase, formatCollectionName } from '../../utils/dataBaseConfing.js'
import { generateTokenSD } from '../../utils/generateToken.js'
import { comparePassword, encryptPassword } from '../../utils/hashPassword.js'
import jwt from 'jsonwebtoken'
import { ObjectId } from 'mongodb'
import { senEmail } from '../../utils/nodemailsConfing.js'

export const login = async (req, res) => {
  const db = await accessToDataBase(dataBaseSecundaria)
  const { email, password } = req.body
  let token = req.headers?.authorization
  if (token) {
    // quitamos el Bearer del token
    try {
      token = token.split(' ')[1]
      const { uid, fechaActPass } = jwt.verify(token, process.env.JWT_SECRETSD)
      const subDominioEmpresasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'empresa' })
      const subDominioEmpresasCollections = await db.collection(subDominioEmpresasCollectionsName)
      const empresa = await subDominioEmpresasCollections.findOne({})
      if (!empresa) throw new Error('No existe empresa')
      if (empresa.activo === false) throw new Error('Empresa desactivada')
      const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
      const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
      const usuario = await usuariosCollection.findOne({ _id: new ObjectId(uid) })
      if (!usuario) throw new Error('No existe usuario')
      if (usuario.activo === false) throw new Error('Usuario desactivado')
      if (moment(fechaActPass).valueOf() !== moment(usuario.fechaActPass).valueOf()) throw new Error('Contraseña no coinciden')
      const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
      const personasCollection = await db.collection(subDominioPersonasCollectionsName)
      const persona = await personasCollection.findOne({ usuarioId: new ObjectId(usuario._id) })
      let cliente = {}
      if (persona.clienteId) {
        const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
        const clientesCollection = await db.collection(subDominioClientesCollectionsName)
        cliente = await clientesCollection.findOne({ _id: new ObjectId(persona.clienteId) })
        if (!cliente) throw new Error('No existe cliente')
        if (cliente.activo === false) throw new Error('El cliente se encuentra inactivo')
      }
      return res.status(200).json({ persona, empresa, cliente })
    } catch (e) {
      // console.log(e)
      return res.status(500).json({ error: 'Error de servidor' })
    }
  }

  try {
    const subDominioEmpresasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'empresa' })
    const subDominioEmpresasCollections = await db.collection(subDominioEmpresasCollectionsName)
    const empresa = await subDominioEmpresasCollections.findOne({})
    if (!empresa) throw new Error('No existe empresa')
    if (empresa.activo === false) throw new Error('Empresa desactivada')
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    const usuario = await usuariosCollection.findOne({ email })
    // en caso de que no exista el email , retornamos un error
    if (!usuario) return res.status(403).json({ error: 'Usuario o contraseña incorrecto' })
    const isValidPassword = await comparePassword(password, usuario.password)
    // en caso de que no sea valida la contraseña, retornamos un error
    if (!isValidPassword) return res.status(403).json({ error: 'Usuario o contraseña incorrecto' })
    // generando token jwt
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const persona = await personasCollection.findOne({ usuarioId: usuario._id })
    if (persona && persona.clienteId) {
      const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
      const clientesCollection = await db.collection(subDominioClientesCollectionsName)
      const cliente = await clientesCollection.findOne({ _id: new ObjectId(persona.clienteId) })
      if (!cliente) return res.status(403).json({ error: 'El cliente no existe' })
      if (cliente.activo === false) return res.status(403).json({ error: 'El cliente no se encuentra activo' })
    }
    const { token, expiresIn } = generateTokenSD({
      uid: usuario._id,
      fechaActPass: usuario.fechaActPass
    }, res)
    let cliente = {}
    if (persona.clienteId) {
      const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
      const clientesCollection = await db.collection(subDominioClientesCollectionsName)
      cliente = await clientesCollection.findOne({ _id: new ObjectId(persona.clienteId) })
    }
    return res.status(200).json(({ token, expiresIn, persona, empresa, cliente }))
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
export const logout = (req, res) => {
  res.clearCookie('SDToken')
  res.json({ ok: 'cerró sesión' })
}
export const recoverPassword = async (req, res) => {
  const { email } = req.body
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    const usuario = await usuariosCollection.findOne({ email })
    if (!usuario) return res.status(403).json({ error: 'Este email no se encuentra registrado' })
    // generamos un password aleatorio
    const randomPassword = crypto.randomBytes(3).toString('hex')
    // encriptamos el password
    const password = await encryptPassword(randomPassword)
    // actualizamos el usuario con el nuevo password
    await usuariosCollection.updateOne({ _id: usuario._id }, { $set: { password, fechaActPass: moment().toDate() } })
    if (usuario.usuarioAibiz) {
      const dbPrincipal = await accessToDataBase(dataBasePrincipal)
      const usuariosCollectionPrincipal = await dbPrincipal.collection('usuarios')
      await usuariosCollectionPrincipal.updateOne({ _id: new ObjectId(usuario.usuarioAibiz) }, { $set: { password, fechaActPass: moment().toDate() } })
    }
    // enviamos el email con el nuevo password
    const emailConfing = {
      from: 'Aibiz <pruebaenviocorreonode@gmail.com>',
      to: email,
      subject: 'Actialización de contraseña',
      html: `
      <p>Contraseña: ${randomPassword}</p>
      `
    }
    await senEmail(emailConfing)
    return res.status(200).json({ ok: 'Contraseña actualizada correctamente' })
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor' + e.message })
  }
}

export const login2 = async (req, res) => {
  const db = await accessToDataBase(dataBaseSecundaria)
  const { email, password } = req.body
  try {
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    const usuario = await usuariosCollection.findOne({ email })
    // en caso de que no exista el email , retornamos un error
    if (!usuario) return res.status(403).json({ error: 'Usuario o contraseña incorrecto' })
    const isValidPassword = await comparePassword(password, usuario.password)
    // en caso de que no sea valida la contraseña, retornamos un error
    if (!isValidPassword) return res.status(403).json({ error: 'Usuario o contraseña incorrecto' })
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const subDominioEmpresasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'empresa' })
    const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const persona = await personasCollection.aggregate([
      { $match: { usuarioId: usuario._id } },
      {
        $lookup:
          {
            from: `${subDominioEmpresasCollectionsName}`,
            localField: 'empresaId',
            foreignField: '_id',
            as: 'empresa'
          }
      },
      { $unwind: { path: 'empresa', preserveNullAndEmptyArrays: true } },
      {
        $lookup:
          {
            from: `${subDominioClientesCollectionsName}`,
            localField: 'clienteId',
            foreignField: '_id',
            as: 'cliente'
          }
      },
      { $unwind: { path: 'cliente', preserveNullAndEmptyArrays: true } }
    ])
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
