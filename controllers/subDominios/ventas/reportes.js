import moment from 'moment-timezone'
import { agreggateCollections, agreggateCollectionsSD, formatCollectionName, getItem } from '../../../utils/dataBaseConfing.js'
import { subDominioName, tiposDocumentosFiscales } from '../../../constants.js'

export const dataReportePorCobrar = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina, fechaActual, timeZone, fechaTasa } = req.body
  try {
    const tiposMovimientosUsar = [
      tiposDocumentosFiscales.factura,
      tiposDocumentosFiscales.notaDebito,
      tiposDocumentosFiscales.notaEntrega
    ]
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match:
          {
            tipoMovimiento: 'venta',
            estado: { $eq: 'pendiente' },
            tipoDocumento: { $in: tiposMovimientosUsar },
            fecha: { $lte: moment(fechaActual).endOf('day').toDate() }
          }
        },
        { $count: 'total' }
      ]
    })
    if (itemsPorPagina && pagina) {
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
      const transaccionesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'transacciones' })
      const clientesColletions = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'clientes' })
      const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
      const ventasPorCliente = await agreggateCollectionsSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        pipeline: [
          {
            $match:
            {
              tipoMovimiento: 'venta',
              estado: { $eq: 'pendiente' },
              tipoDocumento: { $in: tiposMovimientosUsar },
              fecha: { $lte: moment(fechaActual).endOf('day').toDate() }
            }
          },
          { $sort: { fechaVencimiento: 1 } },
          { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
          { $limit: Number(itemsPorPagina) },
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
            $lookup: {
              from: clientesColletions,
              localField: 'clienteId',
              foreignField: '_id',
              as: 'cliente'
            }
          },
          { $unwind: { path: '$cliente', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              // costoTotal: { $add: ['$valor', { $ifNull: ['$detalleNotaDebito.totalNotaDebito', 0] }] },
              costoTotal: {
                $subtract: [
                  { $add: ['$valor', { $ifNull: ['$creditoDebito.totalNotaDebito', 0] }] },
                  { $add: [{ $ifNull: ['$creditoDebito.totalNotaCredito', 0] }, { $ifNull: ['$totalRetenciones.totalRetIva', 0] }, { $ifNull: ['$devoluciones.totalDevolucion', 0] }] }
                ]
              },
              totalNotaDebito: '$creditoDebito.totalNotaDebito',
              totalNotaDebitoPrincipal: '$creditoDebito.totalNotaDebitoPrincipal',
              totalNotaDebitoSecundario: '$creditoDebito.totalNotaDebitoSecundario',
              totalNotaCredito: '$creditoDebito.totalNotaCredito',
              totalNotaCreditoPrincipal: '$creditoDebito.totalNotaCreditoPrincipal',
              totalNotaCreditoSecundario: '$creditoDebito.totalNotaCreditoSecundario',
              totalDevoluciones: '$devoluciones.totalDevolucion',
              totalRetIva: '$totalRetenciones.totalRetIva',
              cliente: '$cliente',
              clienteId: 1,
              numeroFactura: 1,
              totalPrincipal: '$total',
              totalSecundaria: '$totalSecundaria',
              monedaSecundaria: '$monedaSecundaria',
              totalAbono: '$detalleTransacciones.totalAbono',
              // porPagar: { $subtract: [{ $add: ['$valor', { $ifNull: ['$detalleNotaDebito.totalNotaDebito', 0] }] }, '$detalleTransacciones.totalAbono'] },
              porCobrar: {
                $subtract: [
                  { $add: ['$valor', { $ifNull: ['$totalNotaDebito', 0] }] },
                  { $add: [{ $ifNull: ['$detalleTransacciones.totalAbono', 0] }, { $ifNull: ['$creditoDebito.totalNotaCredito', 0] }, { $ifNull: ['$totalRetenciones.totalRetIva', 0] }, { $ifNull: ['$devoluciones.totalDevolucion', 0] }] }
                ]
              },
              fechaVencimiento: 1,
              // detalleTransacciones: '$detalleTransacciones',
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
              retISLR: 1,
              valorRetIva: 1,
              codigoRetIslr: 1,
              nombreRetIslr: 1,
              porcenjateIslr: 1,
              valorBaseImponibleIslr: 1,
              baseImponible: 1,
              iva: 1,
              retIva: 1,
              retIslr: 1,
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
      // console.log(productsList)
      return res.status(200).json({ ventasPorCliente })
    }
    return res.status(200).json({ count: count[0] ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las retenciones de ISLR ' + e.message })
  }
}
