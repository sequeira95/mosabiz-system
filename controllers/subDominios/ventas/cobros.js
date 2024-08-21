import moment from 'moment-timezone'
import { subDominioName, tiposDocumentosFiscales } from '../../../constants.js'
import { agreggateCollections, agreggateCollectionsSD, formatCollectionName, getItem } from '../../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'

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
      tiposDocumentosFiscales.notaDebito
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
        { $match: { tipoMovimiento: 'venta', estado: { $eq: 'pendiente' }, tipoDocumento: { $in: tiposMovimientosUsar }, fecha: { $lte: moment(fechaActual).endOf('day').toDate() } } },
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
              { $match: { tipoDocumento: { $in: [tiposDocumentosFiscales.notaCredito] } } },
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
                    { $ifNull: ['$totalRetenciones.totalRetIslr', 0] },
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
      tiposDocumentosFiscales.notaDebito
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
              { $match: { tipoDocumento: { $in: [tiposDocumentosFiscales.notaCredito] } } },
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
            totalRetIva: { $sum: '$totalRetenciones.totalRetIva' }
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
            porCobrar: { $subtract: [{ $add: ['$costoTotal', { $ifNull: ['$totalNotaDebito', 0] }] }, { $add: ['$totalAbono', '$totalNotaCredito', '$totalRetIva'] }] },
            totalAbonoPrincipal: 'totalAbonoPrincipal',
            totalAbonoSecundario: 'totalAbonoSecundario',
            fechaVencimiento: '$fechaVencimiento',
            monedaSecundaria: '$monedaSecundaria',
            totalSecundaria: '$totalSecundaria',
            totalPrincipal: '$totalPrincipal',
            creditoTotal: {
              $subtract: [
                { $add: ['$costoTotal', { $ifNull: ['$totalNotaDebito', 0] }] },
                { $add: ['$totalNotaCredito', '$totalRetIva'] }
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
      tiposDocumentosFiscales.notaDebito
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
              { $match: { tipoDocumento: { $in: [tiposDocumentosFiscales.notaCredito] } } },
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
                        { $ifNull: ['$totalRetenciones.totalRetIva', 0] }]
                    }
                  ]
                }, 2]
            },
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
                      { $ifNull: ['$totalRetenciones.totalRetIva', 0] }]
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
