import moment from 'moment'
import { subDominioName } from '../../constants.js'
import { agreggateCollectionsSD, createItemSD, deleteItemSD, formatCollectionName, getItemSD, updateItem, updateItemSD } from '../../utils/dataBaseConfing.js'
import { comparePassword, encryptPassword } from '../../utils/hashPassword.js'
import crypto from 'node:crypto'
import { senEmail } from '../../utils/nodemailsConfing.js'
import { ObjectId } from 'mongodb'

export const getUsers = async (req, res) => {
  try {
    /* const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const personas = await personasCollection.aggregate([
      { $match: { isEmpresa: true } }
    ]).toArray() */
    const personas = await agreggateCollectionsSD({
      nameCollection: 'personas',
      pipeline: [
        { $match: { isEmpresa: true } }
      ]
    })
    return res.status(200).json(personas)
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener usuarios' })
  }
}
export const getUsersClientes = async (req, res) => {
  try {
    /* const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioUsersClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const usersClientesCollection = await db.collection(subDominioUsersClientesCollectionsName)
    const personas = await usersClientesCollection.aggregate([
      { $match: { isCliente: true, clienteId: new ObjectId(req.body._id) } }
    ]).toArray() */
    const personas = await agreggateCollectionsSD({
      nameCollection: 'personas',
      pipeline: [
        { $match: { isCliente: true, clienteId: new ObjectId(req.body._id) } }
      ]
    })
    return res.status(200).json(personas)
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener usuarios del clientes' })
  }
}
export const createUser = async (req, res) => {
  const { nombre, email, clientes, telefono, modulos } = req.body
  try {
    /* const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName) */
    // buscamos si el usuario ya existe
    /* const verifyUser = await usuariosCollection.findOne({ email: email.toLowerCase() }) */
    const verifyUser = await getItemSD({ nameCollection: 'usuarios', filters: { email: email.toLowerCase() } })
    // en caso de que exista, retornamos un error
    if (verifyUser) return res.status(400).json({ error: 'El usuario ya se encuentra registrado' })
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
    const userCol = await createItemSD({
      nameCollection: 'usuarios',
      item: {
        nombre,
        email: email.toLowerCase(),
        password,
        fechaActPass: moment().toDate(),
        fechaCreacion: moment().toDate()
      }
    })
    const objectIdClientes = clientes.map(e => new ObjectId(e))
    /* const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
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
    }) */
    const newUser = await createItemSD({
      nameCollection: 'personas',
      item: {
        nombre,
        email: email.toLowerCase(),
        isEmpresa: true,
        clientes: objectIdClientes,
        telefono,
        modulos,
        usuarioId: userCol.insertedId,
        fechaCreacion: moment().toDate()
      }
    })
    /* const persona = await personasCollection.findOne({ _id: newUser.insertedId }) */
    const persona = await getItemSD({ nameCollection: 'personas', filters: { _id: newUser.insertedId } })
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
    const objectIdClientes = clientes.map(e => new ObjectId(e))
    /* const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const persona = await personasCollection.findOneAndUpdate({ _id: new ObjectId(_id) }, {
      $set: {
        nombre,
        email: email.toLowerCase(),
        clientes: objectIdClientes,
        telefono,
        modulos
      }
    }, { returnDocument: 'after' }) */
    const persona = await updateItemSD({
      nameCollection: 'personas',
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          nombre,
          email: email.toLowerCase(),
          clientes: objectIdClientes,
          telefono,
          modulos
        }
      }
    })
    /* const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    await usuariosCollection.updateOne({ _id: persona.usuarioId }, { $set: { nombre, email: email.toLowerCase() } }) */
    await updateItemSD({
      nameCollection: 'usuarios',
      filters: { _id: persona.usuarioId },
      update: { $set: { nombre, email: email.toLowerCase() } }
    })
    return res.status(200).json({ status: 'usuario actualizado', persona })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de actualizar usuario' + e.message })
  }
}
export const createUserCliente = async (req, res) => {
  const { nombre, email, telefono, clienteId, modulos, tipoDocumento, documentoIdentidad } = req.body
  try {
    // const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    /* const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
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
    ]).toArray() */
    const cliente = await agreggateCollectionsSD({
      nameCollection: 'clientes',
      pipeline: [
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
      ]
    })
    if (cliente[0].userLength >= cliente[0].limiteUsuarios) return res.status(400).json({ error: 'El limite de usuarios ha sido alcanzado' })
    /* const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName) */
    // buscamos si el usuario ya existe
    /* const verifyUser = await usuariosCollection.findOne({ email: email.toLowerCase() }) */
    const verifyUser = await getItemSD({ nameCollection: 'usuarios', filters: { email: email.toLowerCase() } })
    // en caso de que exista, retornamos un error
    if (verifyUser) return res.status(400).json({ error: 'El usuario ya se encuentra registrado' })
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
    const userCol = await createItemSD({
      nameCollection: 'usuarios',
      item: {
        nombre,
        email: email.toLowerCase(),
        password,
        fechaActPass: moment().toDate(),
        fechaCreacion: moment().toDate()
      }
    })
    /* const subDominioEmpresaCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'empresa' })
    const empresaCollection = await db.collection(subDominioEmpresaCollectionsName)
    const empresa = await empresaCollection.findOne({}) */
    const empresa = await getItemSD({ nameCollection: 'empresa' })
    /* const personasCollection = await db.collection(subDominioPersonasCollectionsName)
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
    }) */
    const newUser = await createItemSD({
      nameCollection: 'personas',
      item: {
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
    // const persona = await personasCollection.findOne({ _id: newUser.insertedId })
    const persona = await getItemSD({ nameCollection: 'personas', filters: { _id: newUser.insertedId } })
    return res.status(200).json({ status: 'usuario creado', persona })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de crear usuario' })
  }
}
export const updateUserCliente = async (req, res) => {
  const { _id, nombre, email, telefono, modulos } = req.body
  try {
    /* const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const persona = await personasCollection.findOneAndUpdate({ _id: new ObjectId(_id) }, { $set: { nombre, email: email.toLowerCase(), telefono, modulos } }, { returnDocument: 'after' })
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    await usuariosCollection.updateOne({ _id: persona.usuarioId }, { $set: { nombre, email: email.toLowerCase() } }) */
    const persona = await updateItemSD({
      nameCollection: 'personas',
      filters: { _id: new ObjectId(_id) },
      update: { $set: { nombre, email: email.toLowerCase(), telefono, modulos } }
    })
    await updateItemSD({
      nameCollection: 'usuarios',
      filters: { _id: persona.usuarioId },
      update: { $set: { nombre, email: email.toLowerCase() } }
    })
    return res.status(200).json({ status: 'usuario actualizado', persona })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de actualizar usuario' + e.message })
  }
}
export const deleteUser = async (req, res) => {
  const { _id } = req.body
  // const db = await accessToDataBase(dataBaseSecundaria)
  try {
    /* const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const persona = await personasCollection.findOne({ _id: new ObjectId(_id) })
    const personaDelete = await personasCollection.findOneAndDelete({ _id: persona._id })
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    await usuariosCollection.deleteOne({ _id: persona.usuarioId }) */
    const persona = await getItemSD({ nameCollection: 'personas', filters: { _id: new ObjectId(_id) } })
    const personaDelete = await deleteItemSD({
      nameCollection: 'personas',
      filters: { _id: persona._id }
    })
    await deleteItemSD({
      nameCollection: 'usuarios',
      filters: { _id: persona.usuarioId }
    })
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
    const usuario = await getItemSD({ nameCollection: 'usuarios', filters: { _id: new ObjectId(uid) } })
    const isValidPassword = await comparePassword(passwordActual, usuario.password)
    if (!isValidPassword) return res.status(400).json({ error: 'Contraseña incorrecta' })
    const password = await encryptPassword(newPassword)
    await updateItemSD({
      nameCollection: 'usuarios',
      filters: { _id: new ObjectId(uid) },
      update: { $set: { password, fechaActPass: moment().toDate() } }
    })
    if (usuario.usuarioAibiz) {
      await updateItem({
        nameCollection: 'usuarios',
        filters: { _id: new ObjectId(usuario.usuarioAibiz) },
        update: { $set: { password, fechaActPass: moment().toDate() } }
      })
    }
    return res.status(200).json({ status: 'Contraseña actualizada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de cambiar la contraseña' + e.message })
  }
}
