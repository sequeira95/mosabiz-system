import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD } from './dataBaseConfing.js'
import moment from 'moment'

export const agregateDetalleComprobante = async ({ clienteId, comprobanteId, itemsPorPagina, pagina, search = {} }) => {
  const configMatch = comprobanteId ? { comprobanteId: new ObjectId(comprobanteId) } : {}
  console.log(search)
  if (search.cuenta?._id) {
    configMatch.cuentaId = new ObjectId(search.cuenta._id)
  }
  if (search.descripcion) {
    configMatch.descripcion = { $regex: `${search.descripcion}`, $options: 'si' }
  }
  if (search.documento) {
    configMatch.docReferenciaAux = { $regex: `${search.documento}`, $options: 'si' }
  }
  if (search.fecha) {
    configMatch.fecha = { $gte: moment(search.fecha).startOf('day').toDate(), $lte: moment(search.fecha).endOf('day').toDate() }
  }
  if (search.debe) {
    configMatch.debe = { $gte: Number(search.debe) }
  }
  if (search.haber) {
    configMatch.haber = { $gte: Number(search.haber) }
  }
  console.log({ configMatch })
  try {
    const detallesComprobantes = await agreggateCollectionsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: configMatch },
        { $sort: { fechaCreacion: 1 } },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) }
      ]
    })
    console.log({ detallesComprobantes })
    const datosExtras = comprobanteId
      ? await agreggateCollectionsSD(
        {
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
              $project: {
                count: '$count',
                debe: '$debe',
                haber: '$haber'
              }
            }
          ]
        })
      : []
    return ({ detallesComprobantes, cantidad: datosExtras[0]?.count, totalDebe: datosExtras[0]?.debe, totalHaber: datosExtras[0]?.haber })
  } catch (e) {
    console.log(e)
    return e
  }
}
