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
    const persoans = await personasCollection.aggregate([
      { $match: { isEmpresa: true } }
    ])
    return res.status(200).json(persoans)
  } catch (error) {
    return res.status(500).json({ error })
  }
}
export const getUsersClientes = async (req, res) => {
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioUsersClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const usersClientesCollection = await db.collection(subDominioUsersClientesCollectionsName)
    const usersClientes = await usersClientesCollection.aggregate([
      { $match: { isCliente: true, clienteId: new ObjectId(req.params._id) } }
    ])
    return res.status(200).json(usersClientes)
  } catch (error) {
    return res.status(500).json({ error })
  }
}
export const createUser = async (req, res) => {
  const { nombre, email, clientes, telefono } = req.body
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
    await personasCollection.insertOne({
      nombre,
      email,
      isEmpresa: true,
      clientes,
      telefono,
      usuarioId: userCol.insertedId,
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
    return res.status(200).json({ status: 'usuario creado' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de crear usuario' })
  }
}
export const createUserCliente = async (req, res) => {
  const { nombre, email, telefono, clienteId } = req.body
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
    const empresa = await empresaCollection.findOne()
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    await personasCollection.insertOne({
      nombre,
      email,
      isCliente: true,
      clienteId,
      telefono,
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
    return res.status(200).json({ status: 'usuario creado' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de crear usuario' })
  }
}
