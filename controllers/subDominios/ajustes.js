import moment from 'moment'
import { dataBaseSecundaria, subDominioName } from '../../constants.js'
import { accessToDataBase, formatCollectionName } from '../../utils/dataBaseConfing.js'

export const getAjustesCliente = async (req, res) => {
  const { clienteId } = req.body
  if (!clienteId) return res.status(400).json({ error: 'Falta el cliente' })
  const db = await accessToDataBase(dataBaseSecundaria)
  try {
    const subDominioAjustesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'ajustes' })
    const ajustesCollection = await db.collection(subDominioAjustesCollectionsName)
    const ajustes = await ajustesCollection.find().toArray()
    const ajusteToObject = {}
    ajustes.forEach(ajuste => {
      ajusteToObject[ajuste.tipo] = ajuste
    })
    return res.status(200).json({ status: 'ajustes obtenidos exitosamente', ajustes: ajusteToObject })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de obtener ajustes ${e.message}` })
  }
}
export const getTipoAjustesCliente = async (req, res) => {
  const clienteId = req.body.clienteId
  if (!clienteId) return res.status(400).json({ error: 'Falta el cliente' })
  const tipo = req.body.tipo
  const db = await accessToDataBase(dataBaseSecundaria)
  try {
    const subDominioAjustesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'ajustes' })
    const ajustesCollection = await db.collection(subDominioAjustesCollectionsName)
    const ajustes = await ajustesCollection.findOne({ tipo })
    return res.status(200).json(ajustes)
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de obtener ajustes ${tipo} ${e.message}` })
  }
}
export const upsertAjusteCliente = async (req, res) => {
  const ajuste = req.body.ajuste
  const clienteId = req.body.clienteId
  if (!clienteId) return res.status(400).json({ error: 'Falta el cliente' })
  const db = await accessToDataBase(dataBaseSecundaria)
  try {
    const subDominioAjustesCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'ajustes' })
    const ajustesCollection = await db.collection(subDominioAjustesCollectionsName)
    const ajusteActualizado = await ajustesCollection.findOneAndUpdate({ tipo: ajuste.tipo }, { $set: { ...ajuste, fechaCreacion: moment().toDate() } }, { upsert: true, returnDocument: 'after' })
    return res.status(200).json({ status: 'ajuste actualizado exitosamente', ajuste: ajusteActualizado })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de actualizar ajuste ${ajuste.tipo} ${e.message}` })
  }
}
