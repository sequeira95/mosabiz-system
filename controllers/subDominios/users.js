import moment from 'moment'
import { dataBasePrincipal, dataBaseSecundaria, subDominioName } from '../../constants.js'
import { accessToDataBase, formatCollectionName } from '../../utils/dataBaseConfing.js'
import { comparePassword, encryptPassword } from '../../utils/hashPassword.js'
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
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener usuarios' })
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
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener usuarios del clientes' })
  }
}
export const createUser = async (req, res) => {
  const { nombre, email, clientes, telefono, modulos } = req.body
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    // buscamos si el usuario ya existe
    const verifyUser = await usuariosCollection.findOne({ email: email.toLowerCase() })
    // en caso de que exista, retornamos un error
    if (verifyUser) return res.status(400).json({ error: 'El usuario ya se encuentra registrado' })
    const randomPassword = crypto.randomBytes(3).toString('hex')
    // encriptamos el password
    const password = await encryptPassword(randomPassword)
    const userCol = await usuariosCollection.insertOne({
      nombre,
      email: email.toLowerCase(),
      password,
      fechaActPass: moment().toDate(),
      fechaCreacion: moment().toDate()
    })
    const objectIdClientes = clientes.map(e => new ObjectId(e))
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const newUser = await personasCollection.insertOne({
      nombre,
      email: email.toLowerCase(),
      isEmpresa: true,
      clientes: objectIdClientes,
      telefono,
      modulos,
      usuarioId: userCol.insertedId,
      fechaCreacion: moment().toDate()
    })
    const persona = await personasCollection.findOne({ _id: newUser.insertedId })
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
    return res.status(200).json({ status: 'usuario creado', persona })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de crear usuario' })
  }
}
export const updateUser = async (req, res) => {
  const { _id, nombre, email, clientes, telefono, modulos } = req.body
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const objectIdClientes = clientes.map(e => new ObjectId(e))
    const persona = await personasCollection.findOneAndUpdate({ _id: new ObjectId(_id) }, {
      $set: {
        nombre,
        email: email.toLowerCase(),
        clientes: objectIdClientes,
        telefono,
        modulos
      }
    }, { returnDocument: 'after' })
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    await usuariosCollection.updateOne({ _id: persona.usuarioId }, { $set: { nombre, email: email.toLowerCase() } })
    return res.status(200).json({ status: 'usuario actualizado', persona })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de actualizar usuario' + e.message })
  }
}
export const createUserCliente = async (req, res) => {
  const { nombre, email, telefono, clienteId, modulos, tipoDocumento, documentoIdentidad } = req.body
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const clientesCollection = await db.collection(subDominioClientesCollectionsName)
    const cliente = await clientesCollection.aggregate([
      { $match: { _id: new ObjectId(clienteId) } },
      {
        $lookup:
          {
            from: `${subDominioPersonasCollectionsName}`,
            pipeline: [
              { $match: { clienteId: new ObjectId(clienteId) } },
              { $count: 'userLength' }
            ],
            as: 'personas'
          }
      },
      { $unwind: { path: '$personas', preserveNullAndEmptyArrays: true } },
      {
        $project:
        {
          limiteUsuarios: '$limiteUsuarios',
          userLength: '$personas.userLength'
        }
      }
    ]).toArray()
    if (cliente[0].userLength >= cliente[0].limiteUsuarios) return res.status(400).json({ error: 'El limite de usuarios ha sido alcanzado' })
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    // buscamos si el usuario ya existe
    const verifyUser = await usuariosCollection.findOne({ email: email.toLowerCase() })
    // en caso de que exista, retornamos un error
    if (verifyUser) return res.status(400).json({ error: 'El usuario ya se encuentra registrado' })
    const randomPassword = crypto.randomBytes(3).toString('hex')
    // encriptamos el password
    const password = await encryptPassword(randomPassword)
    const userCol = await usuariosCollection.insertOne({
      nombre,
      email: email.toLowerCase(),
      password,
      fechaActPass: moment().toDate(),
      fechaCreacion: moment().toDate()
    })
    const subDominioEmpresaCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'empresa' })
    const empresaCollection = await db.collection(subDominioEmpresaCollectionsName)
    const empresa = await empresaCollection.findOne({})
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const newUser = await personasCollection.insertOne({
      nombre,
      email: email.toLowerCase(),
      tipoDocumento,
      documentoIdentidad,
      isCliente: true,
      clienteId: new ObjectId(clienteId),
      telefono,
      modulos,
      usuarioId: userCol.insertedId,
      fechaCreacion: moment().toDate(),
      empresaId: empresa._id
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
    const persona = await personasCollection.findOne({ _id: newUser.insertedId })
    return res.status(200).json({ status: 'usuario creado', persona })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de crear usuario' })
  }
}
export const updateUserCliente = async (req, res) => {
  const { _id, nombre, email, telefono, modulos } = req.body
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const persona = await personasCollection.findOneAndUpdate({ _id: new ObjectId(_id) }, { $set: { nombre, email: email.toLowerCase(), telefono, modulos } }, { returnDocument: 'after' })
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    await usuariosCollection.updateOne({ _id: persona.usuarioId }, { $set: { nombre, email: email.toLowerCase() } })
    return res.status(200).json({ status: 'usuario actualizado', persona })
  } catch (e) {
    console.log(e)
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
    const personaDelete = await personasCollection.findOneAndDelete({ _id: persona._id })
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    await usuariosCollection.deleteOne({ _id: persona.usuarioId })
    return res.status(200).json({ status: 'usuario eliminado', persona: personaDelete })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar usuario' + e.message })
  }
}
export const changePassword = async (req, res) => {
  const { passwordActual, newPassword } = req.body
  const uid = req.uid
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    const usuario = await usuariosCollection.findOne({ _id: new ObjectId(uid) })
    const isValidPassword = await comparePassword(passwordActual, usuario.password)
    if (!isValidPassword) return res.status(400).json({ error: 'Contraseña incorrecta' })
    const password = await encryptPassword(newPassword)
    await usuariosCollection.updateOne({ _id: new ObjectId(uid) }, { $set: { password, fechaActPass: moment().toDate() } })
    if (usuario.usuarioAibiz) {
      const db = await accessToDataBase(dataBasePrincipal)
      const aibizUsuariosCollection = await db.collection('usuarios')
      await aibizUsuariosCollection.updateOne({ _id: new ObjectId(usuario.usuarioAibiz) }, { $set: { password, fechaActPass: moment().toDate() } })
    }
    return res.status(200).json({ status: 'Contraseña actualizada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de cambiar la contraseña' + e.message })
  }
}
