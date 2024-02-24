import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, deleteItemSD, getItemSD, updateItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment'

export const getRetenciones = async (req, res) => {
  const { clienteId } = req.body
  try {
    const retenciones = await agreggateCollectionsSD({
      nameCollection: 'retencionISLR',
      enviromentClienteId: clienteId
    })
    return res.status(200).json({ retenciones })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las retenciones de ISLR ' + e.message })
  }
}
export const saveRetencion = async (req, res) => {
  const { _id, clienteId, nombre, valorRet, moneda, sustraendo, minimo, isVariable, codigo } = req.body
  try {
    if (!_id) {
      const verify = await getItemSD({
        nameCollection: 'retencionISLR',
        enviromentClienteId: clienteId,
        filters: {
          codigo
        }
      })
      if (verify) return res.status(400).json({ error: 'Ya existe una retención con este código' })
      const retencion = await upsertItemSD({
        nameCollection: 'retencionISLR',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            nombre,
            codigo,
            valorRet: Number(valorRet),
            moneda: new ObjectId(moneda),
            sustraendo: Number(sustraendo),
            minimo: Number(minimo),
            isVariable,
            fechaCreacion: moment().toDate()
          }
        }
      })
      return res.status(200).json({ status: 'Retención de ISLR guardada exitosamente', retencion })
    }
    const retencion = await updateItemSD({
      nameCollection: 'retencionISLR',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          nombre,
          codigo,
          valorRet: Number(valorRet),
          moneda: new ObjectId(moneda),
          sustraendo: Number(sustraendo),
          minimo: Number(minimo),
          isVariable
        }
      }
    })
    return res.status(200).json({ status: 'Retención de ISLR guardada exitosamente', retencion })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la retención de ISLR' + e.message })
  }
}
export const deleteRetencion = async (req, res) => {
  const { clienteId, _id } = req.body
  try {
    await deleteItemSD({ nameCollection: 'retencionISLR', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Retención de ISLR eliminada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar esta retención de ISLR ' + e.message })
  }
}
