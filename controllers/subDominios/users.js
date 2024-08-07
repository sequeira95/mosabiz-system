import moment from 'moment'
import { subDominioName } from '../../constants.js'
import { agreggateCollectionsSD, createItemSD, deleteItemSD, formatCollectionName, getItemSD, updateItem, updateItemSD } from '../../utils/dataBaseConfing.js'
import { comparePassword, encryptPassword } from '../../utils/hashPassword.js'
import crypto from 'node:crypto'
import { senEmail } from '../../utils/nodemailsConfing.js'
import { ObjectId } from 'mongodb'

export const getUsers = async (req, res) => {
  try {
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
export const getUsuariosYAlmacenesClientes = async (req, res) => {
  try {
    const usuarios = await agreggateCollectionsSD({
      nameCollection: 'personas',
      pipeline: [
        { $match: { isCliente: true, clienteId: new ObjectId(req.body._id) } }
      ]
    })
    const almacenes = await agreggateCollectionsSD({
      nameCollection: 'almacenes',
      enviromentClienteId: req.body._id,
      pipeline: [
        { $match: { nombre: { $nin: ['Transito', 'Auditoria'] } } },
        {
          $project: {
            _id: 1,
            nombre: { $concat: ['$codigo', ' - ', '$nombre'] }
          }
        }
      ]
    })
    const zonas = await agreggateCollectionsSD({
      nameCollection: 'zonas',
      enviromentClienteId: req.body._id,
      pipeline: [
        { $match: { tipo: 'inventario' } },
        {
          $project: {
            _id: 1,
            nombre: 1
          }
        }
      ]
    })
    return res.status(200).json({ usuarios, almacenes, zonas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener usuarios del clientes' })
  }
}
export const createUser = async (req, res) => {
  const { nombre, email, clientes, telefono, modulos } = req.body
  try {
    const verifyUser = await getItemSD({ nameCollection: 'usuarios', filters: { email: email.toLowerCase() } })
    // en caso de que exista, retornamos un error
    if (verifyUser) return res.status(400).json({ error: 'El usuario ya se encuentra registrado' })
    const randomPassword = crypto.randomBytes(3).toString('hex')
    // encriptamos el password
    const password = await encryptPassword(randomPassword)
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
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
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
    const verifyUser = await getItemSD({ nameCollection: 'usuarios', filters: { email: email.toLowerCase() } })
    // en caso de que exista, retornamos un error
    if (verifyUser) return res.status(400).json({ error: 'El usuario ya se encuentra registrado' })
    const randomPassword = crypto.randomBytes(3).toString('hex')
    // encriptamos el password
    const password = await encryptPassword(randomPassword)
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
    const empresa = await getItemSD({ nameCollection: 'empresa' })
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
  try {
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
    const decodePasswordActual = atob(passwordActual)
    const usuario = await getItemSD({ nameCollection: 'usuarios', filters: { _id: new ObjectId(uid) } })
    const isValidPassword = await comparePassword(decodePasswordActual, usuario.password)
    if (!isValidPassword) return res.status(400).json({ error: 'Contraseña incorrecta' })
    const decodeNewPassword = atob(newPassword)
    const password = await encryptPassword(decodeNewPassword)
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
