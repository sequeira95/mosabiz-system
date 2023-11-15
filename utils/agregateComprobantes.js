import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD } from './dataBaseConfing.js'

export const agregateDetalleComprobante = async ({ clienteId, comprobanteId, itemsPorPagina, pagina }) => {
  try {
    const detallesComprobantes = await agreggateCollectionsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { comprobanteId: new ObjectId(comprobanteId) } },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) }
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
          $project: {
            count: '$count',
            debe: '$debe',
            haber: '$haber'
          }
        }
      ]
    })
    return ({ detallesComprobantes, cantidad: datosExtras[0]?.count, totalDebe: datosExtras[0]?.debe, totalHaber: datosExtras[0]?.haber })
  } catch (e) {
    console.log(e)
    return e
  }
}
