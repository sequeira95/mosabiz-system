import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, formatCollectionName } from './dataBaseConfing.js'
import moment from 'moment'
import { subDominioName } from '../constants.js'

export const agregateDetalleComprobante = async ({ clienteId, comprobanteId, itemsPorPagina, pagina, search = {} }) => {
  const configMatch = comprobanteId ? { comprobanteId: new ObjectId(comprobanteId) } : {}
  const lookups = []
  // console.log(search)
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
  if (search.terceros) {
    configMatch.terceroNombre = { $regex: `${search.terceros}`, $options: 'si' }
  }
  if (!comprobanteId) {
    const comprobanteColName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'comprobantes' })
    lookups.push({
      $lookup: {
        from: comprobanteColName,
        localField: 'comprobanteId',
        foreignField: '_id',
        pipeline: [
          {
            $match: {
              periodoId: new ObjectId(search.periodoId)
            }
          }
        ],
        as: 'comprobanteName'
      }
    },
    { $unwind: '$comprobanteName' }
    )
  }
  // console.log({ configMatch })
  try {
    const detallesComprobantes = await agreggateCollectionsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: configMatch },
        { $sort: { fechaCreacion: -1 } },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) },
        { $sort: { fechaCreacion: 1 } },
        ...lookups
      ]
    })
    // console.log({ detallesComprobantes })
    const datosExtras = await agreggateCollectionsSD(
      {
        nameCollection: 'detallesComprobantes',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: configMatch },
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
    let detalleIndex = -1
    // console.log({ search })
    let detalleall
    if (search.detalleId) {
      const detalle = await agreggateCollectionsSD(
        {
          nameCollection: 'detallesComprobantes',
          enviromentClienteId: clienteId,
          pipeline: [
            { $match: configMatch },
            { $sort: { fechaCreacion: 1 } },
            {
              $group: {
                _id: null,
                detallesId: { $push: '$_id' }
              }
            },
            {
              $project: {
                index: { $indexOfArray: ['$detallesId', new ObjectId(search.detalleId)] }
              }
            }
          ]
        })
      // console.log({ detalle })
      detalleall = await agreggateCollectionsSD(
        {
          nameCollection: 'detallesComprobantes',
          enviromentClienteId: clienteId,
          pipeline: [
            { $match: configMatch }
          ]
        })
      // console.log({ detalleall })
      detalleIndex = detalle[0]?.index ?? -1
    }
    return ({ detalleall, detallesComprobantes, cantidad: datosExtras[0]?.count, totalDebe: datosExtras[0]?.debe, totalHaber: datosExtras[0]?.haber, detalleIndex })
  } catch (e) {
    console.log(e)
    return e
  }
}
