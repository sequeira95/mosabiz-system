import moment from 'moment'
import { agreggateCollectionsSD, createItemSD, getItemSD, updateItemSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'

export const getListComprobantes = async (req, res) => {
  const { clienteId, periodoId } = req.body
  if (!(periodoId || clienteId)) return res.status(400).json({ error: 'Datos incompletos' })
  try {
    const comprobantes = await agreggateCollectionsSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: { periodoId: new ObjectId(periodoId) }
        },
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
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la lista de comprobantes' + e.message })
  }
}

export const createComprobante = async (req, res) => {
  const { nombre, periodoId, clienteId } = req.body
  if (!(nombre || !periodoId || clienteId)) return res.status(400).json({ error: 'Datos incompletos' })
  try {
    const newComprobante = await createItemSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      item: { nombre, periodoId: new ObjectId(periodoId), isBloqueado: false, fechaCreacion: moment().toDate() }
    })
    const comprobante = await getItemSD({ nameCollection: 'comprobantes', enviromentClienteId: clienteId, filters: { _id: newComprobante.insertedId } })
    return res.status(200).json({ status: 'Comprobante guardado exitosamente', comprobante })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el comprobante' + e.message })
  }
}
export const updateComprobante = async (req, res) => {
  const { nombre, periodoId, clienteId, _id, isBloqueado } = req.body
  if (!(nombre || !periodoId || clienteId)) return res.status(400).json({ error: 'Datos incompletos' })
  try {
    const comprobante = await updateItemSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: { nombre, periodoId: new ObjectId(periodoId), isBloqueado }
    })
    return res.status(200).json({ status: 'Comprobante guardado exitosamente', comprobante })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el comprobante' + e.message })
  }
}

export const getDetallesComprobantes = async (req, res) => {
  const { clienteId, comprobanteId } = req.body
  if (!(comprobanteId || clienteId)) return res.status(400).json({ error: 'Datos incompletos' })
  try {
    const detallesComprobantes = await agreggateCollectionsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: { comprobanteId: new ObjectId(comprobanteId) }
        }
      ]
    })
    return res.status(200).json({ detallesComprobantes })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el comprobante' + e.message })
  }
}
