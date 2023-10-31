import moment from 'moment'
import { dataBaseSecundaria, subDominioName } from '../../constants'
import { accessToDataBase, formatCollectionName } from '../../utils/dataBaseConfing'
import { encryptPassword } from '../../utils/hashPassword'
import { senEmail } from '../../utils/nodemailsConfing'

export const getClientes = async (req, res) => {
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
    const clientesCollection = await db.collection(subDominioClientesCollectionsName)
    const clientes = await clientesCollection.aggregate([])
    return res.status(200).json(clientes)
  } catch (error) {
    return res.status(500).json({ error: 'Error de servidor al momento de buscar clientes' })
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
    const randomPassword = crypto.randomBytes(10).toString('hex')
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
      isEmpresa: true,
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
    return res.status(500).json({ error: 'Error de servidor al momento de crear cliente' })
  }
}
