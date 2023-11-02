import { ObjectId } from 'mongodb'
import { dataBasePrincipal, dataBaseSecundaria, subDominioName } from '../../constants.js'
import { accessToDataBase, formatCollectionName } from '../../utils/dataBaseConfing.js'
import { uploadImg } from '../../utils/cloudImage.js'

export const getPerfilEmpresa = async (req, res) => {
  const uid = req.uid
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    const persona = await personasCollection.findOne({ empresaId: new ObjectId(uid) })
    const subDominioEmpresaCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'empresa' })
    const empresaCollection = await db.collection(subDominioEmpresaCollectionsName)
    const empresa = await empresaCollection.findOne({ _id: new ObjectId(persona.empresaId) })
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
    const empresaData = { razonSocial, documentoIdentidad, email, telefono, direccion, countryCode }
    console.log({ empresaData })
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
    console.log('act perfil empresa paso 1')
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'usuarios' })
    const usuariosCollection = await db.collection(subDominioUsuariosCollectionsName)
    const usuario = await usuariosCollection.findOneAndUpdate({ _id: new ObjectId(uid) }, { $set: { nombre: razonSocial, email } }, { returnDocument: 'after' })
    console.log('act perfil empresa paso 2')
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasCollection = await db.collection(subDominioPersonasCollectionsName)
    await personasCollection.updateOne({ usuarioId: usuario._id }, {
      $set: {
        nombre: razonSocial,
        email,
        countryCode,
        telefono,
        direccion
      }
    })
    console.log('act perfil empresa paso 3')
    // actualizamos los datos correspondiente pero en la base de datos de aibiz
    const dbAibiz = await accessToDataBase(dataBasePrincipal)
    const aibizUsuariosCollectionName = await dbAibiz.collection('usuarios')
    const usuarioAibiz = await aibizUsuariosCollectionName.findOneAndUpdate({ _id: usuario.usuarioAibiz }, { $set: { nombre: razonSocial, documentoIdentidad, email, telefono, countryCode } })
    console.log('act perfil empresa paso 4', { usuarioAibiz })
    console.log('act perfil empresa paso 5')
    const aibizSubDominioCollectionName = await dbAibiz.collection('sub-dominios')
    await aibizSubDominioCollectionName.updateOne({ _id: usuarioAibiz.subDominioId }, { $set: { razonSocial, documentoIdentidad, email, telefono, countryCode } })
    console.log('act perfil empresa paso 6')
    const aibizPersonasCollectionName = await dbAibiz.collection('personas')
    await aibizPersonasCollectionName.updateOne({ usuarioId: usuarioAibiz._id }, { $set: { nombre: razonSocial, documentoIdentidad, email, telefono, countryCode } })
    console.log('act perfil empresa paso 7')

    return res.status(200).json({ status: 'Empresa actualizada correctamente ', empresa })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de actualizar el perfil de la empresa' + e.message })
  }
}
