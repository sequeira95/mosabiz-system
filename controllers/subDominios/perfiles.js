import { ObjectId } from 'mongodb'
import { dataBaseSecundaria, subDominioName } from '../../constants.js'
import { accessToDataBase, formatCollectionName } from '../../utils/dataBaseConfing.js'

export const getPerfilEmpresa = async (req, res) => {
  const { uid } = req.uid
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
  const { uid } = req.uid
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
  const { uid } = req.uid
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
