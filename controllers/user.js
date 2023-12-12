import moment from 'moment'
import { dataBasePrincipal } from '../constants.js'
import { accessToDataBase, createItem, /* , formatCollectionName */ getCollection, getItem } from '../utils/dataBaseConfing.js'
import { encryptPassword } from '../utils/hashPassword.js'
import { ObjectId } from 'mongodb'
import { senEmail } from '../utils/nodemailsConfing.js'
import crypto from 'node:crypto'

export const getUsers = async (req, res) => {
  try {
    /* const db = await accessToDataBase(dataBasePrincipal)
    const personasCollection = await db.collection('personas')
    const personas = await personasCollection.find({ subDominioId: { $exists: false } }).toArray() */
    const personas = await getCollection({ nameCollection: 'personas', filters: { subDominioId: { $exists: false } } })
    return res.status(200).json(personas)
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}

export const createUserSuperAdmi = async (req, res) => {
  const { nombre, email, password } = req.body
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const usuariosCollection = await db.collection('usuarios')
    // buscamos si el usuario ya existe
    const verifyUser = await usuariosCollection.findOne({ email: email.toLowerCase() })
    // en caso de que exista, retornamos un error
    if (verifyUser) return res.status(400).json({ error: 'El usuario ya se encuentra registrado' })
    // encriptamos el password
    const newPassword = await encryptPassword(password)
    const userCol = await usuariosCollection.insertOne({
      nombre,
      email: email.toLowerCase(),
      password: newPassword,
      fechaActPass: moment().toDate(),
      fechaCreacion: moment().toDate()
    })
    const personasCollection = await db.collection('personas')
    await personasCollection.insertOne({
      nombre,
      email: email.toLowerCase(),
      isSuperAdmin: true,
      usuarioId: userCol.insertedId,
      fechaCreacion: moment().toDate()
    })
    return res.status(200).json({ status: 'usuario creado' }) // ({ token, expiresIn, persona })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
export const createUserAdmi = async (req, res) => {
  const { nombre, email, telefono } = req.body
  try {
    /* const db = await accessToDataBase(dataBasePrincipal)
    const usuariosCollection = await db.collection('usuarios') */
    // buscamos si el usuario ya existe
    // const verifyUser = await usuariosCollection.findOne({ email: email.toLowerCase() })
    const verifyUser = await getItem({ nameCollection: 'usuarios', filters: { email: email.toLowerCase() } })
    // en caso de que exista, retornamos un error
    if (verifyUser) return res.status(400).json({ error: 'El usuario ya se encuentra registrado' })
    // encriptamos el password
    // generamos un password aleatorio
    const randomPassword = crypto.randomBytes(3).toString('hex')
    // encriptamos el password
    const password = await encryptPassword(randomPassword)
    /* const userCol = await usuariosCollection.insertOne({
      nombre,
      email: email.toLowerCase(),
      password,
      fechaActPass: moment().toDate(),
      fechaCreacion: moment().toDate()
    }) */
    const userCol = await createItem({
      nameCollection: 'usuarios',
      item: {
        nombre,
        email: email.toLowerCase(),
        password,
        fechaActPass: moment().toDate(),
        fechaCreacion: moment().toDate()
      }
    })
    // const personasCollection = await db.collection('personas')
    /* await personasCollection.insertOne({
      nombre,
      email: email.toLowerCase(),
      telefono,
      isAdmin: true,
      usuarioId: userCol.insertedId,
      fechaCreacion: moment().toDate()
    }) */
    await createItem({
      nameCollection: 'personas',
      item: {
        nombre,
        email: email.toLowerCase(),
        telefono,
        isAdmin: true,
        usuarioId: userCol.insertedId,
        fechaCreacion: moment().toDate()
      }
    })
    // enviamos el email con el password
    const emailConfing = {
      from: 'Aibiz <pruebaenviocorreonode@gmail.com>',
      to: email.toLowerCase(),
      subject: 'verifique cuenta de email',
      html: `
      <p>email: ${email.toLowerCase()}</p>
      <p>Contraseña: ${randomPassword}</p>
      `
    }
    await senEmail(emailConfing)
    return res.status(200).json({ status: 'usuario creado' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error al crear usuario' })
  }
}
export const createUserProgramador = async (req, res) => {
  const { nombre, email, password, telefono } = req.body
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const usuariosCollection = await db.collection('usuarios')
    // encriptamos el password
    const newPassword = await encryptPassword(password)
    const userCol = await usuariosCollection.insertOne({
      nombre,
      email: email.toLowerCase(),
      password: newPassword,
      fechaActPass: moment().toDate(),
      fechaCreacion: moment().toDate()
    })
    const personasCollection = await db.collection('personas')
    await personasCollection.insertOne({
      nombre,
      email: email.toLowerCase(),
      telefono,
      isProgramador: true,
      usuarioId: userCol.insertedId,
      fechaCreacion: moment().toDate()
    })
    return res.status(200).json({ status: 'usuario creado' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
export const updateUser = async (req, res) => {
  const { _id } = req.params
  const { nombre, email, telefono } = req.body
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const personasCollection = await db.collection('personas')
    const persona = await personasCollection.findOne({ _id: new ObjectId(_id) })
    await personasCollection.updateOne({ _id: new ObjectId(persona._id) }, { $set: { nombre, email: email.toLowerCase(), telefono } })
    const usuariosCollection = await db.collection('usuarios')
    await usuariosCollection.findOne({ _id: new ObjectId(persona.usuarioId) })
    await usuariosCollection.updateOne({ _id: new ObjectId(persona.usuarioId) }, { $set: { nombre, email: email.toLowerCase(), telefono } })
    /* const updateUser = await usuariosCollection.findOneAndUpdate({ _id: new ObjectId(persona.usuarioId) }, { $set: { nombre, email } }, { returnNewDocument: true })
    console.log({ updateUser })
    if (updateUser.value.subDominio) {
      const subDominiosCollection = await db.collection('subDominios')
      await subDominiosCollection.updateOne({ _id: new ObjectId(updateUser.value.subDominioId) }, { $set: { nombre, email, telefono } })
      // enviromentEmpresa = nombre del sub dominio o del enviroment de sub dominio
      // nameCollection = nombre de la coleccion de la empresa
      const dbSubDominio = await accessToDataBase(updateUser.value.subDominio)
      const subDominioEmpresasCollectionsName = formatCollectionName({ enviromentEmpresa: updateUser.value.subDominio, nameCollection: 'empresa' })
      const subDominioEmpresasCollections = await dbSubDominio.collection(subDominioEmpresasCollectionsName)
      await subDominioEmpresasCollections.updateOne({}, { $set: { razonSocial: nombre, email, telefono } })
      const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: updateUser.value.subDominio, nameCollection: 'usuarios' })
      const subDominioUsuariosCollections = await dbSubDominio.collection(subDominioUsuariosCollectionsName)
      const updateUserSubDominio = await subDominioUsuariosCollections.findOneAndUpdate(
        { usuarioAibiz: updateUser.value._id },
        { $set: { nombre, email, telefono } },
        { returnNewDocument: true }
      )
      const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: updateUser.value.subDominio, nameCollection: 'personas' })
      const subDominioPersonasCollections = await dbSubDominio.collection(subDominioPersonasCollectionsName)
      await subDominioPersonasCollections.updateOne({ usuarioId: new ObjectId(updateUserSubDominio.value._id) }, { $set: { nombre, email, telefono } }) */
    return res.status(200).json({ status: 'usuario actualizado con exito' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error al editar usuario' })
  }
}

export const deleteUser = async (req, res) => {
  // const isSuperAdmin = req?.isSuperAdmin
  // const isProgramador = req?.isProgramador
  // if (!(isSuperAdmin || isProgramador)) return res.status(400).json({ error: 'Este usuario no tiene permiso para eliminar otro usuario' })
  const { _id } = req.params
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const personasCollection = await db.collection('personas')
    const persona = await personasCollection.findOne({ _id: new ObjectId(_id) })
    await personasCollection.deleteOne({ _id: new ObjectId(persona._id) })
    const usuariosCollection = await db.collection('usuarios')
    await usuariosCollection.deleteOne({ _id: new ObjectId(persona.usuarioId) })
    return res.status(200).json({ status: 'usuario eliminado' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error al eliminar usuario' })
  }
}
export const deleteUserMany = async (req, res) => {
  const userList = req.body
  try {
    const filterListPersonas = userList.filter(user => !user.isSuperAdmin).map(user => new ObjectId(user._id))
    const filterListUsuarios = userList.filter(user => !user.isSuperAdmin).map(user => new ObjectId(user.usuarioId))
    const db = await accessToDataBase(dataBasePrincipal)
    const personasCollection = await db.collection('personas')
    await personasCollection.deleteMany({ _id: { $in: filterListPersonas } })
    const usuariosCollection = await db.collection('usuarios')
    await usuariosCollection.deleteMany({ _id: { $in: filterListUsuarios } })
    return res.status(200).json({ status: 'usuarios eliminados' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error al eliminar usuarios' })
  }
}
