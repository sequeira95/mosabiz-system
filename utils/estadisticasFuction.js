import moment from 'moment-timezone'
import { agreggateCollectionsSD, formatCollectionName } from './dataBaseConfing.js'
import { subDominioName, tiposDocumentosFiscales } from '../constants.js'

export const getDataEstadisticasComprasVentas = async ({ clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone }) => {
  try {
    const dataCompraVentaMonths = await agreggateCollectionsSD({
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
            ncCompras: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipoMovimiento', 'compra'] },
                      { $eq: ['$tipoDocumentoFiscal', tiposDocumentosFiscales.notaCredito] }
                    ]
                  },
                  then: '$total',
                  else: 0
                }
              }
            },
            ndCompras: {
              $sum: {
                $cond: {
                  if: { $and: [{ $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumentoFiscal', tiposDocumentosFiscales.notaDebito] }] },
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
            },
            ncVentas: {
              $sum: {
                $cond: {
                  if: { $and: [{ $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumentoFiscal', tiposDocumentosFiscales.notaCredito] }] },
                  then: '$total',
                  else: 0
                }
              }
            },
            ndVentas: {
              $sum: {
                $cond: {
                  if: { $and: [{ $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumentoFiscal', tiposDocumentosFiscales.notaDebito] }] },
                  then: '$total',
                  else: 0
                }
              }
            }
          }
        },
        {
          $project: {
            compras: { $subtract: [{ $add: ['$compras', '$ndCompras'] }, '$ncCompras'] },
            ventas: { $subtract: [{ $add: ['$ventas', '$ndVentas'] }, '$ncVentas'] }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]
    })
    const dataCompraVentaTotalYear = [] /* await agreggateCollectionsSD({
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
    }) */
    return { dataCompraVentaMonths, dataCompraVentaTotalYear }
  } catch (e) {
    return e
  }
}
export const getDataEstadisticasTransacciones = async ({ clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone }) => {
  try {
    const dataTransaccionesMonths = await agreggateCollectionsSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fechaPago: { $gte: moment(dateInitYear).toDate(), $lte: moment(dataEnd).toDate() },
            // tipo: { $in: ['compra', 'venta', 'Ingreso', 'Egreso'] }
          }
        },
        {
          $group: {
            _id: { $month: '$fechaPago' },
            ingresos: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      { $eq: ['$tipo', 'Ingreso'] },
                      { $eq: ['$tipo', 'venta'] }
                    ]
                  },
                  then: '$pago',
                  else: 0
                }
              }
            },
            egresos: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] }
                        ]
                      },
                      { $eq: ['$tipo', 'Egreso'] },
                      { $eq: ['$tipo', 'compra'] }
                    ]
                  },
                  then: '$pago',
                  else: 0
                }
              }
            }
          }
        },
        {
          $project: {
            ingresos: '$ingresos',
            egresos: '$egresos'
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]
    })
    const dataTransaccionesTotalYear = []/* await agreggateCollectionsSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fechaPago: { $gte: moment(dateInitYear).toDate(), $lte: moment(dataEnd).toDate() },
            // tipo: { $in: ['compra', 'venta', 'Ingreso', 'Egreso'] }
          }
        },
        {
          $group: {
            _id: null,
            ingresos: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      { $eq: ['$tipo', 'Ingreso'] },
                      { $eq: ['$tipo', 'venta'] }
                    ]
                  },
                  then: '$pago',
                  else: 0
                }
              }
            },
            egresos: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] }
                        ]
                      },
                      { $eq: ['$tipo', 'Egreso'] },
                      { $eq: ['$tipo', 'compra'] }
                    ]
                  },
                  then: '$pago',
                  else: 0
                }
              }
            }
          }
        },
        {
          $project: {
            ingresos: '$ingresos',
            egresos: '$egresos'
          }
        },
        {
          $sort: { ingresos: 1 }
        }
      ]
    }) */
    return { dataTransaccionesMonths, dataTransaccionesTotalYear }
  } catch (e) {
    return e
  }
}

export const getDataEstadisticasPosicionMonetaria = async ({ clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone }) => {
  try {
    const tiposMovimientosUsar = [
      tiposDocumentosFiscales.factura,
      tiposDocumentosFiscales.notaDebito,
      'Nota de entrega'
    ]
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const transaccionesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'transacciones' })
    const dataDocumentos = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fecha: { $lte: moment(dataEnd).toDate() },
            estado: { $ne: 'pagada' },
            tipoMovimiento: { $in: ['compra', 'venta'] },
            tipoDocumento: { $in: tiposMovimientosUsar }
            // tipo: { $in: ['compra', 'venta', 'Ingreso', 'Egreso'] }
          }
        },
        { $sort: { fechaVencimiento: 1 } },
        {
          $lookup: {
            from: transaccionesCollection,
            localField: '_id',
            foreignField: 'documentoId',
            pipeline: [
              { $match: { fechaPago: { $lte: moment(dataEnd).endOf('day').toDate() } } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$pagoSecundario'] }
                }
              },
              {
                $group: {
                  _id: '$documentoId',
                  totalAbono: { $sum: '$valor' },
                  totalAbonoPrincipal: { $sum: '$pago' },
                  totalAbonoSecundario: { $sum: '$pagoSecundario' }
                }
              }
            ],
            as: 'detalleTransacciones'
          }
        },
        { $unwind: { path: '$detalleTransacciones', preserveNullAndEmptyArrays: true } },
      ]
    })
    console.log(dataDocumentos)
    return { dataDocumentos }
  } catch (e) {
    return e
  }
}
