import moment from 'moment-timezone'
import { agreggateCollectionsSD } from './dataBaseConfing.js'

export const getDataEstadisticasComprasVentas = async ({ clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone }) => {
  try {
    const dataCompraVentaMonths = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fecha: { $gte: moment(dateInitLastSixMonth).toDate(), $lte: moment(dataEnd).toDate() },
            tipoMovimiento: { $in: ['compra', 'venta'] }
          }
        },
        {
          $group: {
            _id: { $month: '$fecha' },
            compras: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoMovimiento', 'compra'] },
                  then: '$total',
                  else: 0
                }
              }
            },
            ventas: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoMovimiento', 'venta'] },
                  then: '$total',
                  else: 0
                }
              }
            }
          }
        },
        {
          $project: {
            compras: '$compras',
            ventas: '$ventas'
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]
    })
    const dataCompraVentaTotalYear = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fecha: { $gte: moment(dateInitYear).toDate(), $lte: moment(dataEnd).toDate() },
            tipoMovimiento: { $in: ['compra', 'venta'] }
          }
        },
        {
          $group: {
            _id: null,
            compras: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoMovimiento', 'compra'] },
                  then: '$total',
                  else: 0
                }
              }
            },
            ventas: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoMovimiento', 'venta'] },
                  then: '$total',
                  else: 0
                }
              }
            }
          }
        },
        {
          $project: {
            compras: '$compras',
            ventas: '$ventas'
          }
        },
        {
          $sort: { compras: 1 }
        }
      ]
    })
    return { dataCompraVentaMonths, dataCompraVentaTotalYear }
  } catch (e) {
    return e
  }
}
