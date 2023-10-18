import crypto from 'node:crypto'
import { encryptPassword } from '../utils/hashPassword.js'
import { senEmail } from '../utils/nodemailsConfing.js'
import { accessToDataBase, formatCollectionName } from '../utils/dataBaseConfing.js'
import { dataBasePrincipal } from '../constants.js'
// import { formatCollectionName } from '../utils/formatCollectionName.js'
import moment from 'moment/moment.js'
import { ObjectId } from 'mongodb'

export const getSubDominios = async (req, res) => {
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const subDominiosCollection = await db.collection('sub-dominios')
    const subDominios = await subDominiosCollection.find().toArray()
    return res.status(200).json(subDominios)
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}

export const createSubDominio = async (req, res) => {
  try {
    const { subDominio, razonSocial, documentoIdentidad, email, telefono, modulos } = req.body.empresaData
    const db = await accessToDataBase(dataBasePrincipal)
    const subDominiosCollection = await db.collection('sub-dominios')
    // buscamos si el sub-dominio ya existe
    const verifySubDominio = await subDominiosCollection.findOne({ subDominio })
    // en caso de que exista, retornamos un error
    if (verifySubDominio) return res.status(400).json({ error: 'El sub-dominio ya existe' })
    // buscamos si el email ya existe
    const verifyEmail = await subDominiosCollection.findOne({ email })
    // en caso de que exista, retornamos un error
    if (verifyEmail) return res.status(400).json({ error: 'El email ya existe' })
    // en caso de que no exista, insertamos el sub-dominio
    const modulosId = modulos?.map(modulo => modulo._id)
    const newSubDominio = await subDominiosCollection.insertOne({ subDominio, razonSocial, documentoIdentidad, email, telefono, modulosId, fechaCreacion: moment().toDate() })
    const usuariosCollection = await db.collection('usuarios')
    // generamos un password aleatorio
    const randomPassword = crypto.randomBytes(10).toString('hex')
    // encriptamos el password
    const password = await encryptPassword(randomPassword)
    // insertamos un usuario por defecto para el nuevo sub dominio
    const newUsuario = await usuariosCollection.insertOne({
      email,
      password,
      subDominioId: newSubDominio.insertedId,
      subDominio,
      nombre: razonSocial,
      telefono,
      modulosId,
      fechaActPass: moment().toDate(),
      fechaCreacion: moment().toDate()
    })
    // insertamos una persona por defecto para el nuevo sub dominio
    const personasCollection = await db.collection('personas')
    await personasCollection.insertOne({
      email,
      subDominioId: newSubDominio.insertedId,
      subDominio,
      nombre: razonSocial,
      telefono,
      documentoIdentidad,
      modulosId,
      usuarioId: newUsuario.insertedId,
      fechaCreacion: moment().toDate()
    })
    // enviamos el email con el password
    const emailConfing = {
      from: 'Aibiz <pruebaenviocorreonode@gmail.com>',
      to: email,
      subject: 'verifique cuenta de email',
      html: `
      <p>email: ${email}</p>
      <p>Contraseña: ${randomPassword}</p>
      `
    }
    await senEmail(emailConfing)
    // enviromentEmpresa = nombre del sub dominio o del enviroment de sub dominio
    // nameCollection = nombre de la coleccion de la empresa

    // creamos los campos del sub dominio en la  nueva base de datos
    const dbSubDominio = await accessToDataBase(subDominio)
    const subDominioEmpresasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominio, nameCollection: 'empresas' })
    const subDominioEmpresasCollections = await dbSubDominio.collection(subDominioEmpresasCollectionsName)
    const newSubDominioEmpresa = await subDominioEmpresasCollections.insertOne({
      razonSocial,
      documentoIdentidad,
      email,
      telefono,
      modulosId
    })
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominio, nameCollection: 'usuarios' })
    const subDominioUsuariosCollections = await dbSubDominio.collection(subDominioUsuariosCollectionsName)
    const newUsuarioSubDominio = await subDominioUsuariosCollections.insertOne({
      nombre: razonSocial,
      email,
      telefono,
      password,
      fechaActPass: moment().toDate(),
      usuarioAibiz: newUsuario.insertedId,
      fechaCreacion: moment().toDate(),
      empresaId: newSubDominioEmpresa.insertedId
    })
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominio, nameCollection: 'personas' })
    const subDominioPersonasCollections = await dbSubDominio.collection(subDominioPersonasCollectionsName)
    await subDominioPersonasCollections.insertOne({
      nombre: razonSocial,
      email,
      telefono,
      isEmpresa: true,
      usuarioId: newUsuarioSubDominio.insertedId,
      documentoIdentidad,
      fechaCreacion: moment().toDate(),
      empresaId: newSubDominioEmpresa.insertedId
    })
    return res.status(200).json({ status: 'sub dominio y usuario creado' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
export const updateSubDominio = async (req, res) => {
  const { _id } = req.params
  try {
    const { subDominio, razonSocial, documentoIdentidad, email, telefono, modulosId } = req.body.empresaData
    const db = await accessToDataBase(dataBasePrincipal)
    const subDominiosCollection = await db.collection('sub-dominios')
    // const modulosId = modulos?.map(modulo => modulo._id) || []
    await subDominiosCollection.updateOne({ _id: new ObjectId(_id) }, { $set: { razonSocial, documentoIdentidad, email, telefono, modulosId } })
    // luego de actualizar el sub dominio, actualizamos los usuarios y personas
    const usuariosCollection = await db.collection('usuarios')
    const updateUser = await usuariosCollection.findOneAndUpdate({ subDominioId: new ObjectId(_id) }, { $set: { nombre: razonSocial, email, telefono, modulosId } }, { returnNewDocument: true })
    const personasCollection = await db.collection('personas')
    await personasCollection.updateOne({ usuarioId: updateUser._id }, { $set: { nombre: razonSocial, email, telefono, documentoIdentidad, modulosId } })
    // actualizamos los datos de la base de datos del sub dominio
    const dbSubDominio = await accessToDataBase(subDominio)
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominio, nameCollection: 'usuarios' })
    const subDominioUsuariosCollections = await dbSubDominio.collection(subDominioUsuariosCollectionsName)
    const updateUsuarioSubDominio = await subDominioUsuariosCollections.findOneAndUpdate(
      { usuarioAibiz: updateUser._id },
      { $set: { nombre: razonSocial, email, telefono } }
    )
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominio, nameCollection: 'personas' })
    const subDominioPersonasCollections = await dbSubDominio.collection(subDominioPersonasCollectionsName)
    await subDominioPersonasCollections.updateOne(
      { usuarioId: updateUsuarioSubDominio._id },
      { $set: { nombre: razonSocial, email, telefono, documentoIdentidad } }
    )
    const subDominioEmpresasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominio, nameCollection: 'empresas' })
    const subDominioEmpresasCollections = await dbSubDominio.collection(subDominioEmpresasCollectionsName)
    await subDominioEmpresasCollections.updateOne({}, { $set: { razonSocial, documentoIdentidad, email, telefono, modulosId } })
    return res.status(200).json({ status: 'Sub-dominio actualizado' })
  } catch (e) {
    // console.log(e)
  }
}

export const disabledSubDominio = async (req, res) => {
  const { _id } = req.params
  const empresa = req.body.empresaData
  // const isSuperAdmin = req?.isSuperAdmin
  // if (!isSuperAdmin) return res.status(400).json({ error: 'Este usuario no tiene permiso para desactivar un sub-dominio' })
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const isActive = !empresa.activo
    const subDominiosCollection = await db.collection('sub-dominios')
    await subDominiosCollection.updateOne({ _id: new ObjectId(_id) }, { $set: { activo: isActive } })
    const usuariosCollection = await db.collection('usuarios')
    const usuarioSubDominio = await usuariosCollection.findOneAndUpdate({ subDominioId: new ObjectId(_id) }, { $set: { activo: isActive } })
    const personasCollection = await db.collection('personas')
    await personasCollection.updateOne({ usuarioId: usuarioSubDominio._id }, { $set: { activo: isActive } })
    const dbSubDominio = await accessToDataBase(empresa.subDominio)
    const subDominioEmpresaCollectionsName = formatCollectionName({ enviromentEmpresa: empresa.subDominio, nameCollection: 'empresas' })
    const subDominioEmpresaCollections = await dbSubDominio.collection(subDominioEmpresaCollectionsName)
    await subDominioEmpresaCollections.updateOne({}, { $set: { activo: isActive } })
    return res.status(200).json({ status: 'Sub-dominio desactivado' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error al desactivar Sub-dominio' })
  }
}
export const disabledmanySubDominios = async (req, res) => {
  const isSuperAdmin = req?.isSuperAdmin
  const isProgramador = req?.isProgramador
  if (!(isSuperAdmin || isProgramador)) return res.status(400).json({ error: 'Este usuario no tiene permiso para desactivar un sub-dominio' })
  const empresaData = req.body.empresaData
  if (!empresaData[0]) return res.status(400).json({ error: 'No se enviaron datos' })
  try {
    const listSubDominiosId = empresaData.map(subDominio => new ObjectId(subDominio._id))
    const db = await accessToDataBase(dataBasePrincipal)
    const subDominiosCollection = await db.collection('sub-dominios')
    await subDominiosCollection.updateMany({ _id: { $in: listSubDominiosId } }, { $set: { activo: false } })
    const usuariosCollection = await db.collection('usuarios')
    await usuariosCollection.updateMany({ subDominioId: { $in: listSubDominiosId } }, { $set: { activo: false } })
    const listUser = await usuariosCollection.find({ subDominioId: { $in: listSubDominiosId } }).map((p) => p._id).toArray()
    const personasCollection = await db.collection('personas')
    await personasCollection.updateMany({ usuarioId: { $in: listUser } }, { $set: { activo: false } })
    for (const empresa of empresaData) {
      const dbSubDominio = await accessToDataBase(empresa.subDominio)
      const subDominioEmpresasCollectionsName = formatCollectionName({ enviromentEmpresa: empresa.subDominio, nameCollection: 'empresas' })
      const subDominioEmpresasCollections = await dbSubDominio.collection(subDominioEmpresasCollectionsName)
      await subDominioEmpresasCollections.updateOne({}, { $set: { activo: false } })
    }
    return res.status(200).json({ status: 'Sub-dominios desactivados' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error al desactivar Sub-dominio' })
  }
}
export const deleteManySubDominios = async (req, res) => {
  const isSuperAdmin = req?.isSuperAdmin
  const isProgramador = req?.isProgramador
  if (!(isSuperAdmin || isProgramador)) return res.status(400).json({ error: 'Este usuario no tiene permiso para desactivar un sub-dominio' })
  const empresaData = req.body.empresaData
  if (!empresaData[0]) return res.status(400).json({ error: 'No se enviaron datos' })
  try {
    const listSubDominiosId = empresaData.map(subDominio => new ObjectId(subDominio._id))
    // const listDataBaseName = empresaData.map(subDominio => subDominio.subDominio)
    const db = await accessToDataBase(dataBasePrincipal)
    const subDominiosCollection = await db.collection('sub-dominios')
    await subDominiosCollection.deleteMany({ _id: { $in: listSubDominiosId } })
    const usuariosCollection = await db.collection('usuarios')
    const listUser = await usuariosCollection.find({ subDominioId: { $in: listSubDominiosId } }).map((p) => p._id).toArray()
    await usuariosCollection.deleteMany({ _id: { $in: listUser } }, { $set: { activo: false } })
    const personasCollection = await db.collection('personas')
    await personasCollection.deleteMany({ usuarioId: { $in: listUser } }, { $set: { activo: false } })
    /* for (const dataBaseName of listDataBaseName) {
      console.log(dataBaseName)
      const dbSubDominio = await accessToDataBase(dataBaseName)
      await dbSubDominio.dropDatabase()
    } */
    return res.status(200).json({ status: 'Sub-dominios eliminados' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error al eliminar Sub-dominios' })
  }
}
