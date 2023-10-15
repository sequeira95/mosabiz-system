import moment from 'moment'
import { dataBasePrincipal } from '../constants.js'
import { accessToDataBase, formatCollectionName } from '../utils/dataBaseConfing.js'
import { encryptPassword } from '../utils/hashPassword.js'

export const getUsers = async (req, res) => {
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const usuariosCollection = await db.collection('usuarios')
    const users = await usuariosCollection.find().toArray()
    return res.status(200).json(users)
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}

export const createUserSuperAdmi = async (req, res) => {
  const { nombre, email, password } = req.body
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const usuariosCollection = await db.collection('usuarios')
    // encriptamos el password
    const newPassword = await encryptPassword(password)
    await usuariosCollection.insertOne({
      nombre,
      email,
      password: newPassword,
      isSuperAdmin: true,
      fechaActPass: moment().toDate(),
      fechaCreacion: moment().toDate()
    })
    const personasCollection = await db.collection('personas')
    await personasCollection.insertOne({
      nombre,
      email,
      isSuperAdmin: true,
      fechaCreacion: moment().toDate()
    })
    return res.status(200).json({ status: 'usuario creado' }) // ({ token, expiresIn, persona })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
export const createUserAdmi = async (req, res) => {
  const { nombre, email, password, telefono } = req.body
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const usuariosCollection = await db.collection('usuarios')
    // buscamos si el usuario ya existe
    const verifyUser = await usuariosCollection.findOne({ email })
    // en caso de que exista, retornamos un error
    if (verifyUser) return res.status(400).json({ error: 'El usuario ya se encuentra registrado' })
    // encriptamos el password
    const newPassword = await encryptPassword(password)
    await usuariosCollection.insertOne({
      nombre,
      email,
      password: newPassword,
      isAdmin: true,
      fechaActPass: moment().toDate(),
      fechaCreacion: moment().toDate()
    })
    const personasCollection = await db.collection('personas')
    await personasCollection.insertOne({
      nombre,
      email,
      telefono,
      isAdmin: true,
      fechaCreacion: moment().toDate()
    })
    return res.status(200).json({ status: 'usuario creado' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
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
      email,
      password: newPassword,
      isProgramador: true,
      fechaActPass: moment().toDate(),
      fechaCreacion: moment().toDate()
    })
    const personasCollection = await db.collection('personas')
    await personasCollection.insertOne({
      nombre,
      email,
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
    const persona = await personasCollection.findOne({ _id })
    await personasCollection.updateOne({ _id }, { $set: { nombre, email, telefono } })
    const usuariosCollection = await db.collection('usuarios')
    const updateUser = await usuariosCollection.findOneAndUpdate({ _id: persona.usuarioId }, { $set: { nombre, email } }, { returnNewDocument: true })
    if (updateUser.value.subDominio) {
    // enviromentEmpresa = nombre del sub dominio o del enviroment de sub dominio
    // nameCollection = nombre de la coleccion de la empresa
      const dbSubDominio = await accessToDataBase(updateUser.value.subDominio)
      const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: updateUser.value.subDominio, nameCollection: 'usuarios' })
      const subDominioUsuariosCollections = await dbSubDominio.collection(subDominioUsuariosCollectionsName)
      const updateUserSubDominio = await subDominioUsuariosCollections.findOneAndUpdate(
        { usuarioAibiz: updateUser.value._id },
        { $set: { nombre, email, telefono } },
        { returnNewDocument: true }
      )
      const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: updateUser.value.subDominio, nameCollection: 'personas' })
      const subDominioPersonasCollections = await dbSubDominio.collection(subDominioPersonasCollectionsName)
      await subDominioPersonasCollections.updateOne({ usuarioId: updateUserSubDominio.value._id }, { $set: { nombre, email, telefono } })
    }
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error al editar usuario' })
  }
}

export const deleteUser = async (req, res) => {
  const isSuperAdmin = req?.isSuperAdmin
  const isProgramador = req?.isProgramador
  if (!(isSuperAdmin || isProgramador)) return res.status(400).json({ error: 'Este usuario no tiene permiso para eliminar otro usuario' })
  const { _id } = req.params
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const usuariosCollection = await db.collection('usuarios')
    await usuariosCollection.deleteOne({ _id })
    return res.status(200).json({ status: 'usuario eliminado' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error al eliminar usuario' })
  }
}
