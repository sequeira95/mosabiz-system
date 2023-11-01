import moment from 'moment'
import { dataBaseSecundaria, subDominioName } from '../../constants.js'
import { accessToDataBase, formatCollectionName } from '../../utils/dataBaseConfing.js'
import { encryptPassword } from '../../utils/hashPassword.js'
import { senEmail } from '../../utils/nodemailsConfing.js'
import { ObjectId } from 'mongodb'

export const getClientes = async (req, res) => {
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
    const clientesCollection = await db.collection(subDominioClientesCollectionsName)
    const clientes = await clientesCollection.aggregate([])
    return res.status(200).json(clientes)
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de buscar clientes' + e.message })
  }
}
export const createCliente = async (req, res) => {
  const {
    razonSocial,
    email,
    documentoIdentidad,
    telefono,
    direccion,
    estado,
    codPostal,
    tipoEmpresa,
    clasificacionContribuyente,
    primerPeriodoFiscal,
    limiteUsuarios,
    modulos
  } = req.body
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
    const clientesCollection = await db.collection(subDominioClientesCollectionsName)
    // buscamos si la empresa ya existe
    const verifyClient = await clientesCollection.findOne({ documentoIdentidad })
    // en caso de que exista, retornamos un error
    if (verifyClient) return res.status(400).json({ error: 'Esta empresa ya se encuentra registrado' })
    const clienteCol = await clientesCollection.insertOne({
      razonSocial,
      email,
      telefono,
      direccion,
      estado,
      codPostal,
      tipoEmpresa,
      clasificacionContribuyente,
      primerPeriodoFiscal,
      limiteUsuarios,
      modulos,
      fechaCreacion: moment().toDate()
    })
    // creamos el usuario asociado a este nuevo cliente
    const randomPassword = crypto.randomBytes(3).toString('hex')
    // encriptamos el password
    const password = await encryptPassword(randomPassword)
    const subDominioEmpresaCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'empresa' })
    const empresaCollection = await db.collection(subDominioEmpresaCollectionsName)
    const empresa = await empresaCollection.findOne()
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    const userCol = await usuariosCollection.insertOne({
      nombre: razonSocial,
      email,
      password,
      isCliente: true,
      clienteId: clienteCol.insertedId,
      fechaActPass: moment().toDate(),
      fechaCreacion: moment().toDate()
    })
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    await personasCollection.insertOne({
      nombre: razonSocial,
      email,
      direccion,
      isCliente: true,
      isAdministrador: true,
      clienteId: clienteCol.insertedId,
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
    return res.status(200).json({ status: 'cliente creado exitosamente' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de crear cliente' })
  }
}
export const updateCliente = async (req, res) => {
  const {
    _id,
    razonSocial,
    email,
    documentoIdentidad,
    telefono,
    direccion,
    estado,
    codPostal,
    tipoEmpresa,
    clasificacionContribuyente,
    primerPeriodoFiscal,
    limiteUsuarios,
    modulos
  } = req.body
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
    const clientesCollection = await db.collection(subDominioClientesCollectionsName)
    const clienteCol = await clientesCollection.findOneAndUpdate({ _id: new ObjectId(_id) }, {
      $set: {
        razonSocial,
        email,
        telefono,
        direccion,
        estado,
        codPostal,
        tipoEmpresa,
        documentoIdentidad,
        clasificacionContribuyente,
        primerPeriodoFiscal,
        limiteUsuarios,
        modulos
      }
    }, { returnDocument: 'after' })
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const persona = await personasCollection.findOneAndUpdate({ clienteId: clienteCol._id, isAdministrador: true }, {
      $set: {
        nombre: razonSocial,
        email,
        direccion
      }
    }, { returnDocument: 'after' })
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    await usuariosCollection.updateOne({ _id: persona.usuarioId }, { $set: { nombre: razonSocial, email } })
    return res.status(200).json({ status: 'Cliente actualizado exitosamente' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de crear cliente' })
  }
}
export const disabledClient = async (req, res) => {
  const { _id } = req.body
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
    const clientesCollection = await db.collection(subDominioClientesCollectionsName)
    const cliente = await clientesCollection.findOneAndUpdate({ _id: new ObjectId(_id) }, { $set: { activo: false } }, { returnDocument: 'after' })
    return res.status(200).json({ status: 'Empresa desactivada correctamente', cliente })
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de desactivar la empresa' + e.message })
  }
}
export const disableManydClient = async (req, res) => {
  const listClient = req.body
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const listClientId = listClient.map(client => new ObjectId(client._id))
    const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
    const clientesCollection = await db.collection(subDominioClientesCollectionsName)
    await clientesCollection.updateMany({ _id: { $in: listClientId } }, { $set: { activo: false } })
    return res.status(200).json({ status: 'Empresa desactivadas correctamente' })
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de desactivar la empresa' + e.message })
  }
}
