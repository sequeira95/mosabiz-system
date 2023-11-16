import moment from 'moment'
import { dataBaseSecundaria, subDominioName } from '../../constants.js'
import { accessToDataBase, agreggateCollectionsSD, createItemSD, deleteCollection, deleteItemSD, deleteManyItemsSD, formatCollectionName, getCollectionSD, getItemSD, updateItemSD } from '../../utils/dataBaseConfing.js'
import { encryptPassword } from '../../utils/hashPassword.js'
import { senEmail } from '../../utils/nodemailsConfing.js'
import { ObjectId } from 'mongodb'
import crypto from 'node:crypto'

export const getClientes = async (req, res) => {
  const { clientesId } = req.body
  const clientesIdArray = []
  if (clientesId && clientesId[0]) {
    clientesIdArray.push({
      $match: {
        _id: { $in: clientesId.map((e) => new ObjectId(e)) }
      }
    })
  }
  try {
    /* const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
    const clientesCollection = await db.collection(subDominioClientesCollectionsName)
    const clientes = await clientesCollection.aggregate(clientesIdArray).toArray() */
    const clientes = await agreggateCollectionsSD({ nameCollection: 'clientes', pipeline: clientesIdArray })
    return res.status(200).json(clientes)
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar clientes' + e.message })
  }
}
export const createCliente = async (req, res) => {
  const {
    razonSocial,
    email,
    tipoDocumento,
    primerPeriodoFiscalFechas,
    documentoIdentidad,
    countryCode,
    telefono,
    direccion,
    estado,
    pais,
    codPostal,
    tipoEmpresa,
    clasificacionContribuyente,
    primerPeriodoFiscal,
    limiteUsuarios,
    modulos,
    periodoActual
  } = req.body
  try {
    const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
    const pipeline =
    [
      {
        $lookup:
          {
            from: `${subDominioClientesCollectionsName}`,
            pipeline: [
              { $count: 'empresasLength' }
            ],
            as: 'empresas'
          }
      },
      { $unwind: { path: '$empresas', preserveNullAndEmptyArrays: true } },
      {
        $project:
        {
          limiteUsuarios: '$limiteEmpresas',
          empresasLength: '$empresas.empresasLength'
        }
      }
    ]
    const empresa = await agreggateCollectionsSD({ nameCollection: 'empresa', pipeline: [...pipeline] })
    if (empresa[0].limiteUsuarios && empresa[0].empresasLength >= empresa[0].limiteUsuarios) return res.status(400).json({ error: 'El limite de empresas ha sido alcanzado' })
    // buscamos si la empresa ya existe
    const verifyClient = await getItemSD({ nameCollection: 'clientes', filters: { documentoIdentidad } })
    // en caso de que exista, retornamos un error
    if (verifyClient) return res.status(400).json({ error: 'Esta empresa ya se encuentra registrado' })
    const verifyUserEmail = await getItemSD({ nameCollection: 'usuarios', filters: { email: email.toLowerCase() } })
    if (verifyUserEmail) return res.status(400).json({ error: 'Este email ya se encuentra registrado' })
    const clienteCol = await createItemSD({
      nameCollection: 'clientes',
      item: {
        razonSocial,
        email: email.toLowerCase(),
        tipoDocumento,
        documentoIdentidad,
        countryCode,
        telefono,
        direccion,
        estado,
        pais,
        codPostal,
        tipoEmpresa,
        primerPeriodoFiscalFechas,
        clasificacionContribuyente,
        primerPeriodoFiscal,
        limiteUsuarios: parseInt(limiteUsuarios),
        modulos,
        fechaCreacion: moment().toDate(),
        activo: true
      }
    })
    // creamos el primer periodo activo segun los datos del periodo actual
    if (periodoActual) {
      const [periodoActualFrom, periodoActualto] = periodoActual.split('/')
      await createItemSD({
        nameCollection: 'periodos',
        enviromentClienteId: clienteCol.insertedId,
        item: {
          periodo: periodoActual,
          fechaInicio: moment(periodoActualFrom, 'yyyy-MM').toDate(),
          fechaFin: moment(periodoActualto, 'yyyy-MM').toDate(),
          activo: true
        }
      })
    }
    // creamos el usuario asociado a este nuevo cliente
    const randomPassword = crypto.randomBytes(3).toString('hex')
    // encriptamos el password
    const password = await encryptPassword(randomPassword)
    const userCol = await createItemSD({
      nameCollection: 'usuarios',
      item: {
        nombre: razonSocial,
        email: email.toLowerCase(),
        password,
        isCliente: true,
        clienteId: clienteCol.insertedId,
        fechaActPass: moment().toDate(),
        fechaCreacion: moment().toDate()
      }
    })
    await createItemSD({
      nameCollection: 'personas',
      item: {
        nombre: razonSocial,
        email: email.toLowerCase(),
        direccion,
        isCliente: true,
        isAdministrador: true,
        clienteId: clienteCol.insertedId,
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
    /* const cliente = await clientesCollection.findOne({ _id: clienteCol.insertedId }) */
    const cliente = await getItemSD({ nameCollection: 'clientes', filters: { _id: clienteCol.insertedId } })
    return res.status(200).json({ status: 'cliente creado exitosamente', cliente })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de crear cliente' })
  }
}
export const updateCliente = async (req, res) => {
  const {
    _id,
    razonSocial,
    email,
    tipoDocumento,
    documentoIdentidad,
    primerPeriodoFiscalFechas,
    countryCode,
    telefono,
    direccion,
    pais,
    estado,
    codPostal,
    tipoEmpresa,
    clasificacionContribuyente,
    primerPeriodoFiscal,
    limiteUsuarios,
    modulos
  } = req.body
  try {
    const clienteCol = await updateItemSD({
      nameCollection: 'clientes',
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          razonSocial,
          email: email.toLowerCase(),
          countryCode,
          telefono,
          direccion,
          primerPeriodoFiscalFechas,
          estado,
          pais,
          codPostal,
          tipoEmpresa,
          tipoDocumento,
          documentoIdentidad,
          clasificacionContribuyente,
          primerPeriodoFiscal,
          limiteUsuarios: parseInt(limiteUsuarios),
          modulos
        }
      }
    })
    const persona = await updateItemSD({
      nameCollection: 'personas',
      filters: { clienteId: clienteCol._id, isAdministrador: true },
      update: {
        $set: {
          nombre: razonSocial,
          email: email.toLowerCase(),
          direccion,
          tipoDocumento,
          documentoIdentidad
        }
      }
    })
    await updateItemSD({
      nameCollection: 'usuarios',
      filters: { _id: persona.usuarioId },
      update: {
        $set: {
          nombre: razonSocial,
          email: email.toLowerCase()
        }
      }
    })
    return res.status(200).json({ status: 'Cliente actualizado exitosamente', cliente: clienteCol })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de crear cliente' })
  }
}
export const disabledClient = async (req, res) => {
  const { _id } = req.body
  try {
    const cliente = await updateItemSD({
      nameCollection: 'clientes',
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          activo: false
        }
      }
    })
    return res.status(200).json({ status: 'Empresa desactivada correctamente', cliente })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de desactivar la empresa' + e.message })
  }
}

export const enableClient = async (req, res) => {
  const { _id } = req.body
  try {
    const cliente = await updateItemSD({
      nameCollection: 'clientes',
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          activo: true
        }
      }
    })
    return res.status(200).json({ status: 'Empresa activada correctamente', cliente })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de activar la empresa' + e.message })
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
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de desactivar la empresa' + e.message })
  }
}

export const deleteCliente = async (req, res) => {
  const { _id } = req.body
  try {
    const personasCliente = await getCollectionSD({ nameCollection: 'personas', filters: { clienteId: new ObjectId(_id) } })
    const listUserId = personasCliente.map(persona => persona.usuarioId)
    const listPersonasId = personasCliente.map(persona => persona._id)
    await deleteManyItemsSD({ nameCollection: 'usuarios', filters: { _id: { $in: listUserId } } })
    await deleteManyItemsSD({ nameCollection: 'personas', filters: { _id: { $in: listPersonasId } } })
    await deleteCollection({ enviromentClienteId: _id })
    await deleteItemSD({ nameCollection: 'clientes', filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Cliente eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar el cliente' })
  }
}
