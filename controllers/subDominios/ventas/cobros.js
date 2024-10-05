import moment from 'moment-timezone'
import { subDominioName, tiposDocumentosFiscales } from '../../../constants.js'
import { agreggateCollections, agreggateCollectionsSD, bulkWriteSD, createManyItemsSD, formatCollectionName, getItem, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'
import { hasContabilidad } from '../../../utils/hasContabilidad.js'

export const getVentasCobros = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina, fechaActual, timeZone, rangoFechaVencimiento, fechaTasa, monedaPrincipal } = req.body
  try {
    let tasa = await getItem({ nameCollection: 'tasas', filters: { fechaUpdate: fechaTasa, monedaPrincipal } })
    if (!tasa) {
      const ultimaTasa = await agreggateCollections({
        nameCollection: 'tasas',
        pipeline: [
          { $sort: { fechaOperacion: -1 } },
          { $limit: 1 }
        ]
      })
      tasa = ultimaTasa[0] ? ultimaTasa[0] : null
    }
    console.log({ fechaTasa, tasa })
    console.log({ fechaActual })
    const conteosPendientesPorPago = await datosRangoFechas({ rangoFechaVencimiento, clienteId, tasa, fechaActual, timeZone })
    const { data: ventas, count } = await datosGrupoClientes({ clienteId, tasa, fechaActual, timeZone, itemsPorPagina, pagina })
    return res.status(200).json({ conteosPendientesPorPago: conteosPendientesPorPago[0], count: count[0]?.count || 0, ventas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las compras pendientes ' + e.message })
  }
}
const datosRangoFechas = async ({ rangoFechaVencimiento, clienteId, tasa, fechaActual, timeZone }) => {
  try {
    const tiposMovimientosUsar = [
      tiposDocumentosFiscales.factura,
      tiposDocumentosFiscales.notaDebito,
      tiposDocumentosFiscales.notaEntrega
    ]
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const transaccionesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'transacciones' })
    const rango1 = rangoFechaVencimiento
    const rango2 = rangoFechaVencimiento * 2
    const rango3 = rangoFechaVencimiento * 3
    const data = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'venta',
            estado: { $eq: 'pendiente' },
            tipoDocumento: { $in: tiposMovimientosUsar },
            fecha: { $lte: moment(fechaActual).endOf('day').toDate() }
          }
        },
        {
          $addFields: {
            tasa: { $objectToArray: tasa }
          }
        },
        { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
        { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
        {
          $addFields: {
            valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
          }
        },
        {
          $lookup: {
            from: transaccionesCollection,
            localField: '_id',
            foreignField: 'documentoId',
            pipeline: [
              { $match: { fechaPago: { $lte: moment(fechaActual).endOf('day').toDate() } } },
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
                  totalAbonoSecondario: { $sum: '$pagoSecundario' }
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
              { $match: { tipoDocumento: { $in: [tiposDocumentosFiscales.notaCredito] }, totalCredito: { $gt: 0 } } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
                }
              },
              {
                $group: {
                  _id: 0,
                  totalNotaCredito: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$valor',
                        else: 0
                      }
                    }
                  },
                  totalNotaCreditoPrincipal: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$total',
                        else: 0
                      }
                    }
                  },
                  totalNotaCreditoSecundario: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$totalSecundaria',
                        else: 0
                      }
                    }
                  }
                }
              }
            ],
            as: 'creditoDebito'
          }
        },
        { $unwind: { path: '$creditoDebito', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'notaEntregaAsociada',
            pipeline: [
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
                }
              },
              {
                $group: {
                  _id: 0,
                  totalDevolucion: {
                    $sum: '$valor'
                  }
                }
              }
            ],
            as: 'devoluciones'
          }
        },
        { $unwind: { path: '$devoluciones', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaAsociada',
            pipeline: [
              { $match: { tipoDocumento: { $eq: tiposDocumentosFiscales.retIva } } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$totalRetenidoSecundario'] }
                }
              },
              {
                $group: {
                  _id: 0,
                  totalRetIslr: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.retIslr] },
                        then: '$valor',
                        else: 0
                      }
                    }
                  },
                  totalRetIva: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.retIva] },
                        then: '$valor',
                        else: 0
                      }
                    }
                  }
                }
              }
            ],
            as: 'totalRetenciones'
          }
        },
        { $unwind: { path: '$totalRetenciones', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            tasa: '$tasa',
            valor: '$valor',
            numeroFactura: '$numeroFactura',
            fechaVencimiento: '$fechaVencimiento',
            diffFechaVencimiento:
            {
              $dateDiff: { startDate: moment(fechaActual).toDate(), endDate: '$fechaVencimiento', unit: 'day', timezone: timeZone }
            },
            monedaSecundaria: '$monedaSecundaria',
            detalleTransacciones: '$detalleTransacciones',
            totalTransaccion: {
              $subtract: [
                { $add: ['$valor', { $ifNull: ['$creditoDebito.totalNotaDebito', 0] }] },
                {
                  $add: [
                    { $ifNull: ['$detalleTransacciones.totalAbono', 0] },
                    { $ifNull: ['$creditoDebito.totalNotaCredito', 0] },
                    { $ifNull: ['$devoluciones.totalDevolucion', 0] },
                    { $ifNull: ['$totalRetenciones.totalRetIva', 0] }
                  ]
                }
              ]
            }
          }
        },
        {
          $group: {
            _id: 0,
            rangoVencidos: {
              $sum: {
                $cond: {
                  if: { $lt: ['$diffFechaVencimiento', 0] }, then: '$totalTransaccion', else: 0
                }
              }
            },
            rango1: {
              $sum: {
                $cond: {
                  if: {
                    $and: [{ $gte: ['$diffFechaVencimiento', 0] }, { $lte: ['$diffFechaVencimiento', rango1] }]
                  },
                  then: '$totalTransaccion',
                  else: 0
                }
              }
            },
            rango2: {
              $sum: {
                $cond: {
                  if: {
                    $and: [{ $gt: ['$diffFechaVencimiento', rango1] }, { $lte: ['$diffFechaVencimiento', rango2] }]
                  },
                  then: '$totalTransaccion',
                  else: 0
                }
              }
            },
            rango3: {
              $sum: {
                $cond: {
                  if: {
                    $and: [{ $gt: ['$diffFechaVencimiento', rango2] }, { $lte: ['$diffFechaVencimiento', rango3] }]
                  },
                  then: '$totalTransaccion',
                  else: 0
                }
              }
            },
            rangoOtros: {
              $sum: {
                $cond: {
                  if: { $gt: ['$diffFechaVencimiento', rango3] },
                  then: '$totalTransaccion',
                  else: 0
                }
              }
            },
            totalPorPagar: { $sum: '$totalTransaccion' }
          }
        },
        {
          $project: {
            rangoVencidos: '$rangoVencidos',
            rangoOtros: '$rangoOtros',
            rango1: '$rango1',
            rango2: '$rango2',
            rango3: '$rango3',
            totalPorPagar: '$totalPorPagar'
          }
        }
      ]
    })
    return data
  } catch (e) {
    console.log(e)
    return e
  }
}
const datosGrupoClientes = async ({ clienteId, tasa, fechaActual, timeZone, itemsPorPagina, pagina }) => {
  try {
    const tiposMovimientosUsar = [
      tiposDocumentosFiscales.factura,
      tiposDocumentosFiscales.notaDebito,
      tiposDocumentosFiscales.notaEntrega
    ]
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const transaccionesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'transacciones' })
    const clientesColletions = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'clientes' })
    const data = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipoMovimiento: 'venta', estado: { $eq: 'pendiente' }, tipoDocumento: { $in: tiposMovimientosUsar }, fecha: { $lte: moment(fechaActual).endOf('day').toDate() } } },
        { $sort: { fechaVencimiento: 1 } },
        {
          $lookup: {
            from: transaccionesCollection,
            localField: '_id',
            foreignField: 'documentoId',
            pipeline: [
              { $match: { fechaPago: { $lte: moment(fechaActual).endOf('day').toDate() } } },
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
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaAsociada',
            pipeline: [
              { $match: { tipoDocumento: { $in: [tiposDocumentosFiscales.notaCredito] }, totalCredito: { $gt: 0 } } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
                }
              },
              {
                $group: {
                  _id: 0,
                  totalNotaCredito: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$valor',
                        else: 0
                      }
                    }
                  },
                  totalNotaCreditoPrincipal: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$total',
                        else: 0
                      }
                    }
                  },
                  totalNotaCreditoSecundario: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$totalSecundaria',
                        else: 0
                      }
                    }
                  }
                }
              }
            ],
            as: 'creditoDebito'
          }
        },
        { $unwind: { path: '$creditoDebito', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaAsociada',
            pipeline: [
              { $match: { tipoDocumento: { $in: [tiposDocumentosFiscales.retIva] } } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$totalRetenidoSecundario'] }
                }
              },
              {
                $group: {
                  _id: 0,
                  totalRetIslr: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.retIslr] },
                        then: '$valor',
                        else: 0
                      }
                    }
                  },
                  totalRetIva: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.retIva] },
                        then: '$valor',
                        else: 0
                      }
                    }
                  }
                }
              }
            ],
            as: 'totalRetenciones'
          }
        },
        { $unwind: { path: '$totalRetenciones', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'notaEntregaAsociada',
            pipeline: [
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
                }
              },
              {
                $group: {
                  _id: 0,
                  totalDevolucion: {
                    $sum: '$valor'
                  }
                }
              }
            ],
            as: 'devoluciones'
          }
        },
        { $unwind: { path: '$devoluciones', preserveNullAndEmptyArrays: true } },
        {
          $addFields: {
            tasa: { $objectToArray: tasa }
          }
        },
        { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
        { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
        {
          $addFields: {
            valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
          }
        },
        {
          $group: {
            _id: '$clienteId',
            fechaVencimiento: { $first: '$fechaVencimiento' },
            costoTotal: { $sum: '$valor' },
            totalPrincipal: { $sum: 'total' },
            totalSecundaria: { $sum: '$totalSecundaria' },
            totalAbono: { $sum: '$detalleTransacciones.totalAbono' },
            totalAbonoPrincipal: { $sum: '$detalleTransacciones.totalAbonoPrincipal' },
            totalAbonoSecundario: { $sum: '$detalleTransacciones.totalAbonoSecundario' },
            totalNotaDebito: { $sum: '$creditoDebito.totalNotaDebito' },
            totalNotaDebitoPrincipal: { $sum: '$creditoDebito.totalNotaDebitoPrincipal' },
            totalNotaDebitoSecundario: { $sum: '$creditoDebito.totalNotaDebitoSecundario' },
            totalNotaCredito: { $sum: '$creditoDebito.totalNotaCredito' },
            totalNotaCreditoPrincipal: { $sum: '$creditoDebito.totalNotaCreditoPrincipal' },
            totalNotaCreditoSecundario: { $sum: '$creditoDebito.totalNotaCreditoSecundario' },
            totalRetIva: { $sum: '$totalRetenciones.totalRetIva' },
            totalDevolucion: { $sum: '$devoluciones.totalDevolucion' }
          }
        },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) },
        {
          $lookup: {
            from: clientesColletions,
            localField: '_id',
            foreignField: '_id',
            as: 'cliente'
          }
        },
        { $unwind: { path: '$cliente', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            clienteId: '$_id',
            cliente: '$cliente.razonSocial',
            documentoIdentidad: { $concat: ['$cliente.tipoDocumento', '-', '$cliente.documentoIdentidad'] },
            costoTotal2: '$costoTotal',
            totalAbono: '$totalAbono',
            porCobrar: { $subtract: [{ $add: ['$costoTotal', { $ifNull: ['$totalNotaDebito', 0] }] }, { $add: ['$totalAbono', '$totalNotaCredito', '$totalRetIva', '$totalDevolucion'] }] },
            totalAbonoPrincipal: 'totalAbonoPrincipal',
            totalAbonoSecundario: 'totalAbonoSecundario',
            fechaVencimiento: '$fechaVencimiento',
            monedaSecundaria: '$monedaSecundaria',
            totalSecundaria: '$totalSecundaria',
            totalPrincipal: '$totalPrincipal',
            creditoTotal: {
              $subtract: [
                { $add: ['$costoTotal', { $ifNull: ['$totalNotaDebito', 0] }] },
                { $add: ['$totalNotaCredito', '$totalRetIva', '$totalDevolucion'] }
              ]
            },
            diffFechaVencimiento:
            {
              $dateDiff: { startDate: moment(fechaActual).toDate(), endDate: '$fechaVencimiento', unit: 'day', timezone: timeZone }
            },
            detalleTransacciones: '$detalleTransacciones'
          }
        },
        { $sort: { diffFechaVencimiento: 1 } }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipoMovimiento: 'venta', estado: { $eq: 'pendiente' }, tipoDocumento: { $in: tiposMovimientosUsar }, fecha: { $lte: moment(fechaActual).endOf('day').toDate() } } },
        {
          $group: {
            _id: '$clienteId'
            // count: { $sum: 1 }
          }
        },
        { $count: 'count' }
      ]
    })
    return { data, count }
  } catch (e) {
    console.log(e)
    return e
  }
}
export const getDetalleVentas = async (req, res) => {
  const { clienteId, clienteIdVenta, itemsPorPagina, pagina, fechaActual, timeZone, fechaTasa } = req.body
  console.log(req.body)
  try {
    const tiposMovimientosUsar = [
      tiposDocumentosFiscales.factura,
      tiposDocumentosFiscales.notaDebito,
      tiposDocumentosFiscales.notaEntrega
    ]
    // console.log(moment(fechaActual).endOf('day').toDate())
    let tasa = await getItem({ nameCollection: 'tasas', filters: { fechaUpdate: fechaTasa } })
    if (!tasa) {
      const ultimaTasa = await agreggateCollections({
        nameCollection: 'tasas',
        pipeline: [
          { $sort: { fechaOperacion: -1 } },
          { $limit: 1 }
        ]
      })
      tasa = ultimaTasa[0] ? ultimaTasa[0] : null
    }
    const pagination = []
    if (itemsPorPagina && pagina) {
      pagination.push(
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) }
      )
    }
    const transaccionesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'transacciones' })
    const detalleFacturaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleDocumentosFiscales' })
    const clientesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'clientes' })
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const ventas = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match:
          {
            estado: { $eq: 'pendiente' },
            tipoDocumento: { $in: tiposMovimientosUsar },
            clienteId: new ObjectId(clienteIdVenta),
            fecha: { $lte: moment(fechaActual).endOf('day').toDate() }
          }
        },
        { $sort: { fechaVencimiento: 1 } },
        ...pagination,
        {
          $addFields: {
            tasa: { $objectToArray: tasa }
          }
        },
        { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
        { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
        {
          $addFields: {
            valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
          }
        },
        {
          $lookup: {
            from: transaccionesCollection,
            localField: '_id',
            foreignField: 'documentoId',
            pipeline: [
              { $match: { fechaPago: { $lte: moment(fechaActual).endOf('day').toDate() } } },
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
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaAsociada',
            pipeline: [
              { $match: { tipoDocumento: { $in: [tiposDocumentosFiscales.notaCredito] }, totalCredito: { $gt: 0 } } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
                }
              },
              {
                $group: {
                  _id: 0,
                  totalNotaCredito: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$valor',
                        else: 0
                      }
                    }
                  },
                  totalNotaCreditoPrincipal: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$total',
                        else: 0
                      }
                    }
                  },
                  totalNotaCreditoSecundario: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$totalSecundaria',
                        else: 0
                      }
                    }
                  }
                }
              }
            ],
            as: 'creditoDebito'
          }
        },
        { $unwind: { path: '$creditoDebito', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaAsociada',
            pipeline: [
              { $match: { tipoDocumento: { $in: [tiposDocumentosFiscales.retIva] } } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$totalRetenidoSecundario'] }
                }
              },
              {
                $group: {
                  _id: 0,
                  totalRetIva: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.retIva] },
                        then: '$valor',
                        else: 0
                      }
                    }
                  }
                }
              }
            ],
            as: 'totalRetenciones'
          }
        },
        { $unwind: { path: '$totalRetenciones', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'notaEntregaAsociada',
            pipeline: [
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
                }
              },
              {
                $group: {
                  _id: 0,
                  totalDevolucion: {
                    $sum: '$valor'
                  }
                }
              }
            ],
            as: 'devoluciones'
          }
        },
        { $unwind: { path: '$devoluciones', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: 'facturaAsociada',
            foreignField: '_id',
            as: 'facturaDetalle'
          }
        },
        { $unwind: { path: '$facturaDetalle', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: clientesCollection,
            localField: 'clienteId',
            foreignField: '_id',
            as: 'cliente'
          }
        },
        { $unwind: { path: '$cliente', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: detalleFacturaCollection,
            localField: '_id',
            foreignField: 'facturaId',
            as: 'productosServicios'
          }
        },
        {
          $project: {
            detalleTransacciones: '$detalleTransacciones',
            creditoDebito: '$creditoDebito',
            totalRetenciones: '$totalRetenciones',
            valorTotal: '$valor',
            creditoTotal: {
              $round: [
                {
                  $subtract: [
                    { $add: ['$valor', { $ifNull: ['$creditoDebito.totalNotaDebito', 0] }] },
                    {
                      $add: [{ $ifNull: ['$detalleTransacciones.totalAbono', 0] }, { $ifNull: ['$creditoDebito.totalNotaCredito', 0] },
                        { $ifNull: ['$totalRetenciones.totalRetIva', 0] }, { $ifNull: ['$devoluciones.totalDevolucion', 0] }]
                    }
                  ]
                }, 2]
            },
            totalDevolucion: '$devoluciones.totalDevolucion',
            totalNotaDebito: '$creditoDebito.totalNotaDebito',
            totalNotaDebitoPrincipal: '$creditoDebito.totalNotaDebitoPrincipal',
            totalNotaDebitoSecundario: '$creditoDebito.totalNotaDebitoSecundario',
            totalNotaCredito: '$creditoDebito.totalNotaCredito',
            totalNotaCreditoPrincipal: '$creditoDebito.totalNotaCreditoPrincipal',
            totalNotaCreditoSecundario: '$creditoDebito.totalNotaCreditoSecundario',
            cliente: '$cliente',
            productosServicios: '$productosServicios',
            clienteId: 1,
            numeroFactura: 1,
            totalPrincipal: '$total',
            totalSecundaria: '$totalSecundaria',
            monedaSecundaria: '$monedaSecundaria',
            totalAbono: '$detalleTransacciones.totalAbono',
            porCobrar: {
              $round: [{
                $subtract: [
                  {
                    $add:
                    [
                      '$valor',
                      { $ifNull: ['$creditoDebito.totalNotaDebito', 0] }
                    ]
                  },
                  {
                    $add: [{ $ifNull: ['$detalleTransacciones.totalAbono', 0] }, { $ifNull: ['$creditoDebito.totalNotaCredito', 0] },
                      { $ifNull: ['$totalRetenciones.totalRetIva', 0] }, { $ifNull: ['$devoluciones.totalDevolucion', 0] }]
                  }
                ]
              }, 2]
            },
            fechaVencimiento: 1,
            diffFechaVencimiento:
            {
              $dateDiff: { startDate: moment(fechaActual).toDate(), endDate: '$fechaVencimiento', unit: 'day', timezone: timeZone }
            },
            fecha: 1,
            tipoDocumento: 1,
            numeroControl: 1,
            moneda: 1,
            hasIgtf: 1,
            isAgenteRetencionIva: 1,
            valorRetIva: 1,
            codigoRetIslr: 1,
            nombreRetIslr: 1,
            porcenjateIslr: 1,
            valorBaseImponibleIslr: 1,
            baseImponible: 1,
            iva: 1,
            retIva: 1,
            total: 1,
            baseImponibleSecundaria: 1,
            ivaSecundaria: 1,
            retIvaSecundaria: 1,
            retIslrSecundaria: 1,
            metodoPago: 1,
            formaPago: 1,
            credito: 1,
            duracionCredito: 1,
            tasaDia: 1,
            ordenCompraId: 1,
            facturaAsociada: 1,
            facturaDetalle: 1,
            ordenCompraDetalle: 1,
            totalAbonoSecundario: '$detalleTransacciones.totalAbonoSecundario',
            documentosAdjuntos: 1
          }
        }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match:
          {
            estado: { $eq: 'pendiente' },
            tipoDocumento: { $in: tiposMovimientosUsar },
            clienteId: new ObjectId(clienteIdVenta),
            fecha: { $lte: moment(fechaActual).endOf('day').toDate() }
          }
        },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ ventas, count: count && count[0] ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar el listados de compras del proveedor ' + e.message })
  }
}
export const getCajasSucursalListCobros = async (req, res) => {
  const { clienteId, sucursalId } = req.body
  console.log({ sucursalId })
  try {
    const cajas = await agreggateCollectionsSD({
      nameCollection: 'ventascajas',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { sucursalId: { $eq: new ObjectId(sucursalId) } } }
      ]
    })
    return res.status(200).json({ cajas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener datos de las sucursales' + e.message })
  }
}
export const createPagoOrdenes = async (req, res) => {
  const { clienteId, clienteIdVenta, abonos, tasaDia, fechaPago } = req.body
  // console.log(req.body)
  // console.log({ tasaDia })
  try {
    const datosAbonos = []
    const updateCompraPagada = []
    const createHistorial = []
    const asientosContables = []
    const tieneContabilidad = await hasContabilidad({ clienteId })
    const ajusteVenta = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'ventas' } })
    console.log({ ajusteVenta })
    const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
    let periodo = null
    let comprobante = null
    let cuentaPorCobrar = null
    let terceroCuenta = null
    let cuentaIGTF = null
    if (tieneContabilidad) {
      /* const validContabilidad = await validPagoFacturas({ clienteId, abonos })
      if (validContabilidad && validContabilidad.message) {
        return res.status(500).json({ error: 'Error al momento de validar información contable: ' + validContabilidad.message })
      } */
      periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fechaPago).toDate() }, fechaFin: { $gte: moment(fechaPago).toDate() } } })
      console.log({ periodo })
      if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha del documento')
      const mesPeriodo = moment(fechaPago).format('YYYY/MM')
      comprobante = await getItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: ajusteVenta.codigoComprobanteFacturacion, periodoId: periodo._id, mesPeriodo }
      })
      if (!comprobante) {
        comprobante = await upsertItemSD({
          nameCollection: 'comprobantes',
          enviromentClienteId: clienteId,
          filters: { codigo: ajusteVenta.codigoComprobanteFacturacion, periodoId: periodo._id, mesPeriodo },
          update: {
            $set: {
              nombre: 'Ventas',
              isBloqueado: false,
              fechaCreacion: moment().toDate()
            }
          }
        })
      }
      const cliente = await getItemSD({ nameCollection: 'clientes', enviromentClienteId: clienteId, filters: { _id: new ObjectId(clienteIdVenta) } })
      cuentaPorCobrar = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: ajusteVenta.cuentaPorCobrarClienteId } })
      if (!cuentaPorCobrar) throw new Error('No se encontraron datos de la cuenta por cobrar en los ajustes')

      // console.log({ cuentaPorCobrar })
      terceroCuenta = await getItemSD({
        nameCollection: 'terceros',
        enviromentClienteId: clienteId,
        filters: { cuentaId: new ObjectId(cuentaPorCobrar._id), nombre: cliente?.razonSocial.toUpperCase() }
      })
      if (!terceroCuenta) {
        terceroCuenta = await upsertItemSD({
          nameCollection: 'terceros',
          enviromentClienteId: clienteId,
          filters: { cuentaId: new ObjectId(cuentaPorCobrar._id), nombre: cliente?.razonSocial.toUpperCase() },
          update: {
            $set: {
              nombre: cliente?.razonSocial.toUpperCase(),
              cuentaId: new ObjectId(cuentaPorCobrar._id)
            }
          }
        })
      }
      cuentaIGTF = await getItemSD({
        nameCollection: 'planCuenta',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(ajusteVenta.cuentaIGTFPorPagarId) }
      })
      // console.log({ cuentaIGTF })
      if (!cuentaIGTF) throw new Error('No se encontraron datos de la cuenta IGTF en los ajustes')
    }
    if (abonos[0]) {
      for (const abono of abonos) {
        const asientosVariacionCambiaria = []
        const documento = (await agreggateCollectionsSD({
          nameCollection: 'documentosFiscales',
          enviromentClienteId: clienteId,
          pipeline: [
            { $match: { _id: new ObjectId(abono.documentoId) } }
          ]
        }))[0]
        // console.log({ documento, abono })
        const tasaVerify = documento.tasaAux ? documento.tasaAux : documento.tasaDia
        const totalSecundarioAux = documento.totalSecundarioAux ? documento.totalSecundarioAux : documento.totalSecundaria
        const totalPrincipalAux = documento.totalAux ? documento.totalAux : documento.total
        const totalDivisa = totalSecundarioAux * tasaDia[documento.monedaSecundaria]
        const diferenciaTotal = Number((Number(totalDivisa.toFixed(2)) - Number(totalPrincipalAux.toFixed(2))).toFixed(2))
        // console.log({ totalDivisa, totalPrincipalAux, diferenciaTotal, totalSecundarioAux, tasaVerify })
        if (tasaVerify !== tasaDia[documento.monedaSecundaria]) {
          if (tieneContabilidad) {
            if (diferenciaTotal > 0) {
              const cuentaVariacion = await getItemSD({
                nameCollection: 'planCuenta',
                enviromentClienteId: clienteId,
                filters: { _id: new ObjectId(ajusteVenta.cuentaVariacionCambiaria) }
              })
              console.log({ diferenciaTotal })
              // Registrar la diferencia contable con la cuenta que se encuentra en ajustes por el debe y el por pagar en el haber
              asientosVariacionCambiaria.push({
                cuentaId: new ObjectId(cuentaPorCobrar._id),
                cuentaCodigo: cuentaPorCobrar.codigo,
                cuentaNombre: cuentaPorCobrar.descripcion,
                comprobanteId: new ObjectId(comprobante._id),
                periodoId: new ObjectId(periodo._id),
                descripcion: `AJUSTE VARIACIÓN CAMBIARIA${documento.tipoDocumento}-${documento.numeroFactura}`,
                fecha: moment(fechaPago).toDate(),
                debe: Number(diferenciaTotal.toFixed(2)),
                haber: 0,
                fechaCreacion: moment().toDate(),
                terceroId: new ObjectId(terceroCuenta._id),
                terceroNombre: terceroCuenta.nombre,
                docReferenciaAux: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                documento: {
                  docReferencia: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                  docFecha: moment(fechaPago).toDate()
                }
              }, {
                cuentaId: new ObjectId(cuentaVariacion._id),
                cuentaCodigo: cuentaVariacion.codigo,
                cuentaNombre: cuentaVariacion.descripcion,
                comprobanteId: new ObjectId(comprobante._id),
                periodoId: new ObjectId(periodo._id),
                descripcion: `AJUSTE VARIACIÓN CAMBIARIA${documento.tipoDocumento}-${documento.numeroFactura}`,
                fecha: moment(fechaPago).toDate(),
                debe: 0,
                haber: Number(diferenciaTotal.toFixed(2)),
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                documento: {
                  docReferencia: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                  docFecha: moment(fechaPago).toDate()
                }
              })
              await createManyItemsSD({
                nameCollection: 'detallesComprobantes',
                enviromentClienteId: clienteId,
                items: asientosVariacionCambiaria
              })
            }
            if (diferenciaTotal < 0) {
              const cuentaVariacion = await getItemSD({
                nameCollection: 'planCuenta',
                enviromentClienteId: clienteId,
                filters: { _id: new ObjectId(ajusteVenta.cuentaVariacionCambiariaGastos) }
              })
              // hacer lo contrario de arriba
              asientosVariacionCambiaria.push({
                cuentaId: new ObjectId(cuentaVariacion._id),
                cuentaCodigo: cuentaVariacion.codigo,
                cuentaNombre: cuentaVariacion.descripcion,
                comprobanteId: new ObjectId(comprobante._id),
                periodoId: new ObjectId(periodo._id),
                descripcion: `AJUSTE VARIACIÓN CAMBIARIA${documento.tipoDocumento}-${documento.numeroFactura}`,
                fecha: moment(fechaPago).toDate(),
                debe: Number(diferenciaTotal.toFixed(2)),
                haber: 0,
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                documento: {
                  docReferencia: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                  docFecha: moment(fechaPago).toDate()
                }
              }, {
                cuentaId: new ObjectId(cuentaPorCobrar._id),
                cuentaCodigo: cuentaPorCobrar.codigo,
                cuentaNombre: cuentaPorCobrar.descripcion,
                comprobanteId: new ObjectId(comprobante._id),
                periodoId: new ObjectId(periodo._id),
                descripcion: `AJUSTE VARIACIÓN CAMBIARIA${documento.tipoDocumento}-${documento.numeroFactura}`,
                fecha: moment(fechaPago).toDate(),
                debe: 0,
                haber: Number(diferenciaTotal.toFixed(2)),
                fechaCreacion: moment().toDate(),
                terceroId: new ObjectId(terceroCuenta._id),
                terceroNombre: terceroCuenta.nombre,
                docReferenciaAux: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                documento: {
                  docReferencia: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                  docFecha: moment(fechaPago).toDate()
                }
              })
              await createManyItemsSD({
                nameCollection: 'detallesComprobantes',
                enviromentClienteId: clienteId,
                items: asientosVariacionCambiaria
              })
            }
          }
        }
        await updateItemSD({
          nameCollection: 'documentosFiscales',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(abono.documentoId) },
          update: {
            $set: {
              totalPrincipalAux: totalDivisa - abono.abono,
              totalSecundarioAux: totalSecundarioAux - abono.abonoSecundario,
              tasaAux: tasaDia[documento.monedaSecundaria]
            }
          }
        })
        if (Number(abono.porPagar.toFixed(2)) <= Number(abono.abono.toFixed(2))) {
          updateCompraPagada.push({
            updateOne: {
              filter: { _id: new ObjectId(abono.documentoId) },
              update: {
                $set: {
                  estado: 'pagada',
                  fechaUltimoPago: moment().toDate(),
                  fechaPago: moment(abono.fechaPago).toDate(),
                  pagadoPor: new ObjectId(req.uid)
                }
              }
            }
          })
        } else {
          updateCompraPagada.push({
            updateOne: {
              filter: { _id: new ObjectId(abono.documentoId) },
              update: {
                $set: {
                  fechaUltimoPago: moment().toDate()
                }
              }
            }
          })
        }
        datosAbonos.push({
          documentoId: new ObjectId(abono.documentoId),
          clienteId: new ObjectId(clienteIdVenta),
          pago: Number(abono.abono.toFixed(2)),
          fechaPago: moment(abono.fechaPago).toDate(),
          referencia: abono.referencia ? abono.referencia : null,
          banco: abono.banco?._id ? new ObjectId(abono.banco._id) : null,
          caja: abono.caja?._id ? new ObjectId(abono.caja._id) : null,
          sucursal: abono.sucursal?._id ? new ObjectId(abono.sucursal._id) : null,
          porcentajeIgtf: Number(abono?.porcentajeIgtf || 0),
          pagoIgtf: abono?.igtfPorPagar ? Number(abono?.igtfPorPagar.toFixed(2)) : null,
          pagoSecundario: abono?.abonoSecundario ? Number(abono?.abonoSecundario.toFixed(2)) : null,
          pagoIgtfSecundario: abono?.igtfPorPagarSecundario ? Number(abono?.igtfPorPagarSecundario.toFixed(2)) : null,
          moneda: abono.moneda,
          monedaSecundaria: abono.monedaSecundaria,
          tasa: abono.tasa,
          tipo: 'venta',
          isCobro: true,
          creadoPor: new ObjectId(req.uid)
        })
        createHistorial.push({
          idMovimiento: new ObjectId(abono.documentoId),
          categoria: 'creado',
          tipo: 'Pago',
          fecha: moment().toDate(),
          descripcion: abono.porPagar === abono.abono ? 'Factura pagada' : 'Abonó ' + abono.abono?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          creadoPor: new ObjectId(req.uid)
        })
        if (tieneContabilidad) {
          if (abono.banco) {
            const cuentaBanco = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(abono.banco.cuentaId) }
            })
            if (!cuentaBanco) throw new Error('No se encontraron datos de la cuenta del banco')
            asientosContables.push({
              cuentaId: new ObjectId(cuentaBanco._id),
              cuentaCodigo: cuentaBanco.codigo,
              cuentaNombre: cuentaBanco.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `ABONO ${documento.tipoDocumento}-${documento.numeroFactura}`,
              fecha: moment(fechaPago).toDate(),
              debe: Number(abono.totalPagar.toFixed(2)),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${abono.referencia}`,
              documento: {
                docReferencia: `${abono.referencia}`,
                docFecha: moment(fechaPago).toDate()
              },
              fechaDolar: abono.monedaSecundaria !== abono.moneda ? tasaDia.fechaUpdate : null,
              cantidad: abono.monedaSecundaria !== abono.moneda ? Number(abono?.totalPagarSecundario.toFixed(2)) : null,
              monedasUsar: abono.monedaSecundaria !== abono.moneda ? abono.monedaSecundaria : null,
              tasa: abono.monedaSecundaria !== abono.moneda ? tasaDia[abono.monedaSecundaria] : null,
              monedaPrincipal: abono.monedaSecundaria !== abono.moneda ? abono.moneda : null
            })
          }
          if (abono.caja) {
            const [cuentaCaja] = await agreggateCollectionsSD({
              nameCollection: 'ventascajas',
              enviromentClienteId: clienteId,
              pipeline: [
                { $match: { _id: new ObjectId(abono.caja._id) } },
                {
                  $lookup: {
                    from: planCuentaCollection,
                    localField: 'cuentaId',
                    foreignField: '_id',
                    as: 'detalleCuenta'
                  }
                },
                { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: false } },
                {
                  $project: {
                    nombre: '$nombre',
                    descripcion: '$descripcion',
                    tipo: '$tipo',
                    cuentaId: '$cuentaId',
                    cuentaCodigo: '$detalleCuenta.codigo',
                    cuentaNombre: '$detalleCuenta.descripcion'
                  }
                }
              ]
            })
            asientosContables.push({
              cuentaId: new ObjectId(cuentaCaja._id),
              cuentaCodigo: cuentaCaja.codigo,
              cuentaNombre: cuentaCaja.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `ABONO ${documento.tipoDocumento}-${documento.numeroFactura}`,
              fecha: moment(fechaPago).toDate(),
              debe: Number(abono.totalPagar.toFixed(2)),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: 'EFECTIVO',
              documento: {
                docReferencia: 'EFECTIVO',
                docFecha: moment(fechaPago).toDate()
              },
              fechaDolar: abono.monedaSecundaria !== abono.moneda ? tasaDia.fechaUpdate : null,
              cantidad: abono.monedaSecundaria !== abono.moneda ? Number(abono?.totalPagarSecundario.toFixed(2)) : null,
              monedasUsar: abono.monedaSecundaria !== abono.moneda ? abono.monedaSecundaria : null,
              tasa: abono.monedaSecundaria !== abono.moneda ? tasaDia[abono.monedaSecundaria] : null,
              monedaPrincipal: abono.monedaSecundaria !== abono.moneda ? abono.moneda : null
            })
          }
          asientosContables.push({
            cuentaId: new ObjectId(cuentaPorCobrar._id),
            cuentaCodigo: cuentaPorCobrar.codigo,
            cuentaNombre: cuentaPorCobrar.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `ABONO ${documento.tipoDocumento}-${documento.numeroFactura}`,
            fecha: moment(fechaPago).toDate(),
            debe: 0,
            haber: Number(abono.abono.toFixed(2)),
            fechaCreacion: moment().toDate(),
            terceroId: new ObjectId(terceroCuenta._id),
            terceroNombre: terceroCuenta.nombre,
            docReferenciaAux: `${documento.tipoDocumento}-${documento.numeroFactura}`,
            documento: {
              docReferencia: `${documento.tipoDocumento}-${documento.numeroFactura}`,
              docFecha: moment(fechaPago).toDate()
            },
            fechaDolar: abono.monedaSecundaria !== abono.moneda ? tasaDia.fechaUpdate : null,
            cantidad: abono.monedaSecundaria !== abono.moneda ? Number(abono?.abonoSecundario.toFixed(2)) : null,
            monedasUsar: abono.monedaSecundaria !== abono.moneda ? abono.monedaSecundaria : null,
            tasa: abono.monedaSecundaria !== abono.moneda ? tasaDia[abono.monedaSecundaria] : null,
            monedaPrincipal: abono.moneda
          })
          if (abono.igtfPorPagar) {
            asientosContables.push({
              cuentaId: new ObjectId(cuentaIGTF._id),
              cuentaCodigo: cuentaIGTF.codigo,
              cuentaNombre: cuentaIGTF.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `ABONO ${documento.tipoDocumento}-${documento.numeroFactura}`,
              fecha: moment(fechaPago).toDate(),
              debe: 0,
              haber: Number(abono.igtfPorPagar.toFixed(2)),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${documento.tipoDocumento}-${documento.numeroFactura}`,
              documento: {
                docReferencia: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                docFecha: moment(fechaPago).toDate()
              }
            })
          }
          const diferenciaPago = Number(abono.abono.toFixed(2)) - Number(abono.porPagar.toFixed(2))
          if (diferenciaPago > 0) {
            const cuentaDiferenciaPago = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteVenta.cuentaDiferenciaVentasId) }
            })
            asientosContables.push({
              cuentaId: new ObjectId(cuentaDiferenciaPago._id),
              cuentaCodigo: cuentaDiferenciaPago.codigo,
              cuentaNombre: cuentaDiferenciaPago.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `DIFERENCIA EN PAGO ${documento.tipoDocumento}-${documento.numeroFactura}`,
              fecha: moment(fechaPago).toDate(),
              debe: 0,
              haber: Number(diferenciaPago.toFixed(2)),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${documento.tipoDocumento}-${documento.numeroFactura}`,
              documento: {
                docReferencia: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                docFecha: moment(fechaPago).toDate()
              }
            })
          }
        }
      }
    }
    if (updateCompraPagada[0]) {
      await bulkWriteSD({ nameCollection: 'documentosFiscales', enviromentClienteId: clienteId, pipeline: updateCompraPagada })
    }
    if (asientosContables[0]) {
      createManyItemsSD({
        nameCollection: 'detallesComprobantes',
        enviromentClienteId: clienteId,
        items: asientosContables
      })
    }
    if (createHistorial[0]) {
      createManyItemsSD({
        nameCollection: 'historial',
        enviromentClienteId: clienteId,
        items: createHistorial
      })
    }
    if (datosAbonos[0]) {
      createManyItemsSD({
        nameCollection: 'transacciones',
        enviromentClienteId: clienteId,
        items: datosAbonos
      })
    }
    return res.status(200).json({ status: 'Pago de ordenes de compra creados exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de realizar el pago de compras ' + e.message })
  }
}
