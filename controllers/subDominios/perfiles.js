import { ObjectId } from 'mongodb'
import { dataBasePrincipal, dataBaseSecundaria, subDominioName } from '../../constants.js'
import { accessToDataBase, formatCollectionName, getItemSD } from '../../utils/dataBaseConfing.js'
import { uploadImg } from '../../utils/cloudImage.js'

export const getPerfilEmpresa = async (req, res) => {
  const uid = req.uid
  try {
    /* const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const persona = await personasCollection.findOne({ empresaId: new ObjectId(uid) })
    const subDominioEmpresaCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'empresa' })
    const empresaCollection = await db.collection(subDominioEmpresaCollectionsName)
    const empresa = await empresaCollection.findOne({ _id: new ObjectId(persona.empresaId) }) */
    const persona = await getItemSD({ nameCollection: 'personas', filters: { usuarioId: new ObjectId(uid) } })
    const empresa = await getItemSD({ nameCollection: 'empresa', filters: { _id: new ObjectId(persona.empresaId) } })
    return res.status(200).json({ empresa, persona })
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de buscar los datos del perfil de la empresa' })
  }
}
export const getPerfilusuario = async (req, res) => {
  const uid = req.uid
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const persona = await personasCollection.findOne({ _id: new ObjectId(uid) })
    return res.status(200).json(persona)
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de buscar los datos del perfil del usuario' })
  }
}
export const getPerfilCliente = async (req, res) => {
  const uid = req.uid
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const persona = await personasCollection.findOne({ _id: new ObjectId(uid) })
    const subDominioClientesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
    const clientesCollection = await db.collection(subDominioClientesCollectionsName)
    const cliente = await clientesCollection.findOne({ _id: new ObjectId(persona.clienteId) })
    return res.status(200).json({ persona, cliente })
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de buscar los datos del perfil del usuario' })
  }
}

export const getPerfil = async (req, res) => {
  const { tipo } = req.body
  if (tipo === 'empresa') return await getPerfilEmpresa(req, res)
  if (tipo === 'usuario') return await getPerfilusuario(req, res)
  if (tipo === 'cliente') return await getPerfilCliente(req, res)
  return res.status(500).json({ error: 'Error de servidor al momento de buscar los datos del perfil' })
}

export const updatePerfilEmpresa = async (req, res) => {
  const { _id, razonSocial, documentoIdentidad, email, telefono, countryCode, direccion } = req.body
  const uid = req.uid
  const db = await accessToDataBase(dataBaseSecundaria)
  try {
    const empresaData = { razonSocial, documentoIdentidad, email: email.toLowerCase(), telefono, direccion, countryCode }
    if (req.files) {
      const imgLogo = req.files?.logo
      const extension = imgLogo.mimetype.split('/')[1]
      const namePath = `logo-${subDominioName}.${extension}`
      const resImgLogo = await uploadImg(imgLogo.data, namePath)
      // console.log(resImgLogo)
      empresaData.logo = {
        path: resImgLogo.filePath,
        name: resImgLogo.name,
        url: resImgLogo.url,
        type: extension,
        fileId: resImgLogo.fileId
      }
      // console.log(empresaData, resImgLogo)
    }

    const subDominioEmpresaCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'empresa' })
    const empresaCollection = await db.collection(subDominioEmpresaCollectionsName)
    const empresa = await empresaCollection.findOneAndUpdate({ _id: new ObjectId(_id) }, { $set: { ...empresaData } }, { returnDocument: 'after' })
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    const usuario = await usuariosCollection.findOneAndUpdate({ _id: new ObjectId(uid) }, { $set: { nombre: razonSocial, email: email.toLowerCase() } }, { returnDocument: 'after' })
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    await personasCollection.updateOne({ usuarioId: usuario._id }, {
      $set: {
        nombre: razonSocial,
        email: email.toLowerCase(),
        countryCode,
        telefono,
        direccion
      }
    })
    // actualizamos los datos correspondiente pero en la base de datos de aibiz
    const dbAibiz = await accessToDataBase(dataBasePrincipal)
    const aibizUsuariosCollectionName = await dbAibiz.collection('usuarios')
    const usuarioAibiz = await aibizUsuariosCollectionName.findOneAndUpdate({ _id: usuario.usuarioAibiz }, { $set: { nombre: razonSocial, documentoIdentidad, email: email.toLowerCase(), telefono, countryCode } })
    const aibizSubDominioCollectionName = await dbAibiz.collection('sub-dominios')
    await aibizSubDominioCollectionName.updateOne({ _id: usuarioAibiz.subDominioId }, { $set: { razonSocial, documentoIdentidad, email: email.toLowerCase(), telefono, countryCode } })
    const aibizPersonasCollectionName = await dbAibiz.collection('personas')
    await aibizPersonasCollectionName.updateOne({ usuarioId: usuarioAibiz._id }, { $set: { nombre: razonSocial, documentoIdentidad, email: email.toLowerCase(), telefono, countryCode } })

    return res.status(200).json({ status: 'Empresa actualizada correctamente ', empresa })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de actualizar el perfil de la empresa' + e.message })
  }
}

export const updatePerfilCliente = async (req, res) => {
  const { _id, razonSocial, documentoIdentidad, email, telefono, countryCode, direccion } = req.body
  const uid = req.uid
  const db = await accessToDataBase(dataBaseSecundaria)
  try {
    const clienteData = { razonSocial, documentoIdentidad, email: email.toLowerCase(), telefono, direccion, countryCode }
    if (req.files) {
      const imgLogo = req.files?.logo
      const extension = imgLogo.mimetype.split('/')[1]
      const namePath = `logo-${razonSocial}.${extension}`
      const resImgLogo = await uploadImg(imgLogo.data, namePath)
      // console.log(resImgLogo)
      clienteData.logo = {
        path: resImgLogo.filePath,
        name: resImgLogo.name,
        url: resImgLogo.url,
        type: extension,
        fileId: resImgLogo.fileId
      }
      // console.log(clienteData, resImgLogo)
    }

    const subDominioClienteCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'clientes' })
    const clientesCollection = await db.collection(subDominioClienteCollectionsName)
    const cliente = await clientesCollection.findOneAndUpdate({ _id: new ObjectId(_id) }, { $set: { ...clienteData } }, { returnDocument: 'after' })
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    const usuario = await usuariosCollection.findOneAndUpdate({ _id: new ObjectId(uid) }, { $set: { nombre: razonSocial, email: email.toLowerCase() } }, { returnDocument: 'after' })
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    await personasCollection.updateOne({ usuarioId: usuario._id }, {
      $set: {
        nombre: razonSocial,
        email: email.toLowerCase(),
        countryCode,
        telefono,
        direccion
      }
    })

    return res.status(200).json({ status: 'Empresa actualizada correctamente ', cliente })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de actualizar el perfil de la empresa' + e.message })
  }
}
