import moment from 'moment'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, getItemSD, updateItemSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'

export const getListComprobantes = async (req, res) => {
  const { clienteId, periodoId, nombre } = req.body
  if (!(periodoId || clienteId)) return res.status(400).json({ error: 'Datos incompletos' })
  let filterNombre = {}
  if (nombre) {
    filterNombre = { nombre: { $regex: `/^${nombre}/`, $options: 'i' } }
  }
  try {
    const comprobantes = await agreggateCollectionsSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: { periodoId: new ObjectId(periodoId), ...filterNombre }
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
  const { clienteId, comprobanteId, itemPorPagina = 1 } = req.body
  if (!(comprobanteId || clienteId)) return res.status(400).json({ error: 'Datos incompletos' })
  const skip = (itemPorPagina - 1) * itemPorPagina || 0
  try {
    const detallesComprobantes = await agreggateCollectionsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { comprobanteId: new ObjectId(comprobanteId) } },
        { $skip: skip },
        { $limit: itemPorPagina }
      ]
    })
    const datosExtras = await agreggateCollectionsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { comprobanteId: new ObjectId(comprobanteId) } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            debe: { $sum: '$debe' },
            haber: { $sum: '$haber' }
          }
        },
        {
          $addFields: {
            total: { $subtract: ['$debe', '$haber'] }
          }
        },
        {
          $project: {
            count: '$count',
            debe: '$debe',
            haber: '$haber',
            total: '$total'
          }
        }
      ]
    })
    return res.status(200).json({ detallesComprobantes, datosExtras })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar detalles del comprobante' + e.message })
  }
}
export const saveDetalleComprobante = async (req, res) => {
  const { clienteId, comprobanteId, detalleComprobante } = req.body
  if (!clienteId) return res.status(400).json({ error: 'Debe seleccionar un cliente' })
  if (!comprobanteId) return res.status(400).json({ error: 'Debe seleccionar un comprobante' })
  try {
    const detalle = detalleComprobante.map(e => {
      const cuentaId = new ObjectId(e.cuentaId)
      return {
        updateOne: {
          filter: { comprobanteId: new ObjectId(comprobanteId), linea: e.linea },
          update: {
            $set: {
              ...e,
              cuentaId,
              fechaCreacion: e.fechaCreacion ? e.fechaCreacion : moment().toDate()
            }
          },
          upsert: true
        }
      }
    })
    await bulkWriteSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, pipeline: detalle })
    return res.status(200).json({ status: 'detalle de comprobante  guardado exitosamente' })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el detalle del comprobante' + e.message })
  }
}
