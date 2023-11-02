import moment from 'moment'
import { dataBaseSecundaria, subDominioName } from '../../constants.js'
import { accessToDataBase, formatCollectionName } from '../../utils/dataBaseConfing.js'
import { encryptPassword } from '../../utils/hashPassword.js'
import crypto from 'node:crypto'
import { senEmail } from '../../utils/nodemailsConfing.js'
import { ObjectId } from 'mongodb'

export const getUsers = async (req, res) => {
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const personas = await personasCollection.aggregate([
      { $match: { isEmpresa: true } }
    ]).toArray()
    return res.status(200).json(personas)
  } catch (error) {
    return res.status(500).json({ error })
  }
}
export const getUsersClientes = async (req, res) => {
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioUsersClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const usersClientesCollection = await db.collection(subDominioUsersClientesCollectionsName)
    const personas = await usersClientesCollection.aggregate([
      { $match: { isCliente: true, clienteId: new ObjectId(req.body._id) } }
    ]).toArray()
    return res.status(200).json(personas)
  } catch (error) {
    return res.status(500).json({ error })
  }
}
export const createUser = async (req, res) => {
  const { nombre, email, clientes, telefono, modulos } = req.body
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    // buscamos si el usuario ya existe
    const verifyUser = await usuariosCollection.findOne({ email })
    // en caso de que exista, retornamos un error
    if (verifyUser) return res.status(400).json({ error: 'El usuario ya se encuentra registrado' })
    const randomPassword = crypto.randomBytes(3).toString('hex')
    // encriptamos el password
    const password = await encryptPassword(randomPassword)
    const userCol = await usuariosCollection.insertOne({
      nombre,
      email,
      password,
      fechaActPass: moment().toDate(),
      fechaCreacion: moment().toDate()
    })
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const newUser = await personasCollection.insertOne({
      nombre,
      email,
      isEmpresa: true,
      clientes,
      telefono,
      modulos,
      usuarioId: userCol.insertedId,
      fechaCreacion: moment().toDate()
    })
    const persona = await personasCollection.findOne({ _id: newUser.insertedId })
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
    return res.status(200).json({ status: 'usuario creado', persona })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de crear usuario' })
  }
}
export const updateUser = async (req, res) => {
  const { _id, nombre, email, clientes, telefono, modulos } = req.body
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const persona = await personasCollection.findOneAndUpdate({ _id: new ObjectId(_id) }, {
      $set: {
        nombre,
        email,
        clientes,
        telefono,
        modulos
      }
    }, { returnDocument: 'after' })
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    await usuariosCollection.updateOne({ _id: persona.usuarioId }, { $set: { nombre, email } })
    return res.status(200).json({ status: 'usuario actualizado', persona })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de actualizar usuario' + e.message })
  }
}
export const createUserCliente = async (req, res) => {
  const { nombre, email, telefono, clienteId, modulos, tipoDocumento, documentoIdentidad } = req.body
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    // buscamos si el usuario ya existe
    const verifyUser = await usuariosCollection.findOne({ email })
    // en caso de que exista, retornamos un error
    if (verifyUser) return res.status(400).json({ error: 'El usuario ya se encuentra registrado' })
    const randomPassword = crypto.randomBytes(3).toString('hex')
    // encriptamos el password
    const password = await encryptPassword(randomPassword)
    const userCol = await usuariosCollection.insertOne({
      nombre,
      email,
      password,
      fechaActPass: moment().toDate(),
      fechaCreacion: moment().toDate()
    })
    const subDominioEmpresaCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'empresa' })
    const empresaCollection = await db.collection(subDominioEmpresaCollectionsName)
    const empresa = await empresaCollection.findOne({})
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const newUser = await personasCollection.insertOne({
      nombre,
      email,
      tipoDocumento,
      documentoIdentidad,
      isCliente: true,
      clienteId,
      telefono,
      modulos,
      usuarioId: userCol.insertedId,
      fechaCreacion: moment().toDate(),
      empresaId: empresa._id
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
    const persona = await personasCollection.findOne({ _id: newUser.insertedId })
    return res.status(200).json({ status: 'usuario creado', persona })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de crear usuario' })
  }
}
export const updateUserCliente = async (req, res) => {
  const { _id, nombre, email, telefono, modulos } = req.body
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const persona = await personasCollection.findOneAndUpdate({ _id: new ObjectId(_id) }, { $set: { nombre, email, telefono, modulos } }, { returnDocument: 'after' })
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    await usuariosCollection.updateOne({ _id: persona.usuarioId }, { $set: { nombre, email } })
    return res.status(200).json({ status: 'usuario actualizado' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de actualizar usuario' + e.message })
  }
}
export const deleteUser = async (req, res) => {
  const { _id } = req.body
  const db = await accessToDataBase(dataBaseSecundaria)
  try {
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const persona = await personasCollection.findOne({ _id: new ObjectId(_id) })
    await personasCollection.deleteOne({ _id: persona._id })
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    await usuariosCollection.deleteOne({ _id: persona.usuarioId })
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar usuario' + e.message })
  }
}
