import moment from 'moment'
import { dataBaseSecundaria, subDominioName } from '../../constants.js'
import { accessToDataBase, formatCollectionName } from '../../utils/dataBaseConfing.js'

export const upsertAjusteCliente = async (req, res) => {
  const ajuste = req.body.ajuste
  const clienteId = req.body.clienteId
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
