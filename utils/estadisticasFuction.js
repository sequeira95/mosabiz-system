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
                $group: {
                  _id: '$documentoId',
                  totalAbono: { $sum: '$pago' },
                }
              }
            ],
            as: 'detalleTransacciones'
          }
        },
        { $unwind: { path: '$detalleTransacciones', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaAsociada',
            pipeline: [
              { $match: { tipoDocumento: { $nin: tiposMovimientosUsar } } },
              {
                $group: {
                  _id: 0,
                  totalNotaCredito: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                        then: '$toda',
                        else: 0
                      }
                    }
                  },
                  totalIslr: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.retIslr] },
                        then: '$totalRetenido',
                        else: 0
                      }
                    }
                  },
                  totalIva: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.retIva] },
                        then: '$totalRetenido',
                        else: 0
                      }
                    }
                  }
                }
              }
            ],
            as: 'documentosAsociados'
          }
        },
        { $unwind: { path: '$documentosAsociados', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'notaEntregaAsociada',
            pipeline: [
              {
                $group: {
                  _id: 0,
                  totalDevolucion: {
                    $sum: '$total'
                  }
                }
              }
            ],
            as: 'devoluciones'
          }
        },
        { $unwind: { path: '$devoluciones', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$tipoMovimiento',
            total: { $sum: '$total' },
            totalAbono: { $sum: '$detalleTransacciones.totalAbono' },
            totalNotaCredito: { $sum: '$documentosAsociados.totalNotaCredito' },
            totalIslr: { $sum: '$creditoDebito.totalIslr' },
            totalIva: { $sum: '$creditoDebito.totalIva' },
            totalDevolucion: { $sum: '$devoluciones.totalDevolucion' }
          }
        },
        {
          $project: {
            saldo: {
              $subtract: [
                '$total',
                {
                  $add: ['$totalAbono', '$totalNotaCredito', '$totalIva', '$totalDevolucion', '$totalIslr']
                }
              ]
            }
          }
        },
      ]
    })
    const year = moment(dataEnd).year()
    const mees = moment(dataEnd).month()
    const conciliacionTesoreria = await agreggateCollectionsSD({
      nameCollection: 'conciliacionTesoreria',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            year: Number(year),
            mes: mees + 1
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$saldoFinal' }
          }
        }
      ]
    })
    if (conciliacionTesoreria[0]) {
      dataDocumentos.push({
        _id: 'disponible',
        saldo: conciliacionTesoreria[0].total
      })
    }
    console.log(dataDocumentos)
    return { dataDocumentos }
  } catch (e) {
    return e
  }
}
