import moment from 'moment'
import { agreggateCollectionsSD, createItemSD, getItemSD, updateItemSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'

export const getListComprobantes = async (req, res) => {
  const { clienteId } = req.body
  try {
    const comprobantes = await agreggateCollectionsSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $project:
          {
            nombre: '$nombre'
          }
        }
      ]
    })
    return res.status(200).json({ comprobantes })
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la lista de comprobantes' + e.message })
  }
}

export const createComprobante = async (req, res) => {
  const { nombre, periodoId, clienteId } = req.body
  try {
    const newComprobante = await createItemSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      item: { nombre, periodoId: ObjectId(periodoId), isBloqueado: false, fechaCreacion: moment().toDate() }
    })
    const comprobante = await getItemSD({ nameCollection: 'comprobantes', enviromentClienteId: clienteId, filters: { _id: newComprobante.insertedId } })
    return res.status(200).json({ status: 'Comprobante guardado exitosamente', comprobante })
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el comprobante' + e.message })
  }
}
export const updateComprobante = async (req, res) => {
  const { nombre, periodoId, clienteId, _id, isBloqueado } = req.body
  try {
    const comprobante = await updateItemSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      filters: { _id: ObjectId(_id) },
      update: { nombre, periodoId: ObjectId(periodoId), isBloqueado }
    })
    return res.status(200).json({ status: 'Comprobante guardado exitosamente', comprobante })
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el comprobante' + e.message })
  }
}
