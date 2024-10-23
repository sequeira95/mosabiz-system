import moment from 'moment-timezone'
import { agreggateCollections, agreggateCollectionsSD, formatCollectionName, getItem } from '../../../utils/dataBaseConfing.js'
import { subDominioName } from '../../../constants.js'

export const dataReportePorPagar = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina, fechaActual, timeZone, fechaTasa } = req.body
  try {
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match:
          {
            tipoMovimiento: 'compra',
            estado: { $ne: 'pagada' },
            tipoDocumento: { $in: ['Factura', 'Nota de entrega'] },
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
      const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
      const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
      const comprasPorProveedor = await agreggateCollectionsSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        pipeline: [
          {
            $match:
            {
              tipoMovimiento: 'compra',
              estado: { $ne: 'pagada' },
              tipoDocumento: { $in: ['Factura', 'Nota de entrega'] },
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
                // { $match: { tipoDocumento: 'Nota de débito' } },
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
                    totalNotaDebito: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$tipoDocumento', 'Nota de débito'] },
                          then: '$valor',
                          else: 0
                        }
                      }
                    }, // { $sum: '$valor' },
                    totalNotaDebitoPrincipal: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$tipoDocumento', 'Nota de débito'] },
                          then: '$total',
                          else: 0
                        }
                      }
                    }, // { $sum: '$total' },
                    totalNotaDebitoSecundario: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$tipoDocumento', 'Nota de débito'] },
                          then: '$totalSecundaria',
                          else: 0
                        }
                      }
                    }, // { $sum: '$totalSecundaria' }
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
              from: proveedoresCollection,
              localField: 'proveedorId',
              foreignField: '_id',
              as: 'proveedor'
            }
          },
          { $unwind: { path: '$proveedor', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              // costoTotal: { $add: ['$valor', { $ifNull: ['$detalleNotaDebito.totalNotaDebito', 0] }] },
              costoTotal: { $subtract: [{ $add: ['$valor', { $ifNull: ['$creditoDebito.totalNotaDebito', 0] }] }, { $ifNull: ['$creditoDebito.totalNotaCredito', 0] }] },
              totalNotaDebito: '$creditoDebito.totalNotaDebito',
              totalNotaDebitoPrincipal: '$creditoDebito.totalNotaDebitoPrincipal',
              totalNotaDebitoSecundario: '$creditoDebito.totalNotaDebitoSecundario',
              totalNotaCredito: '$creditoDebito.totalNotaCredito',
              totalNotaCreditoPrincipal: '$creditoDebito.totalNotaCreditoPrincipal',
              totalNotaCreditoSecundario: '$creditoDebito.totalNotaCreditoSecundario',
              proveedor: '$proveedor',
              proveedorId: 1,
              numeroFactura: 1,
              totalPrincipal: '$total',
              totalSecundaria: '$totalSecundaria',
              monedaSecundaria: '$monedaSecundaria',
              totalAbono: '$detalleTransacciones.totalAbono',
              // porPagar: { $subtract: [{ $add: ['$valor', { $ifNull: ['$detalleNotaDebito.totalNotaDebito', 0] }] }, '$detalleTransacciones.totalAbono'] },
              porPagar: {
                $subtract: [
                  {
                    $add:
                    [
                      '$valor',
                      { $ifNull: ['$creditoDebito.totalNotaDebito', 0] }
                    ]
                  },
                  {
                    $add: ['$detalleTransacciones.totalAbono', { $ifNull: ['$creditoDebito.totalNotaCredito', 0] }]
                  }
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
      return res.status(200).json({ comprasPorProveedor })
    }
    return res.status(200).json({ count: count[0] ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las retenciones de ISLR ' + e.message })
  }
}
export const listadoCompras = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina, desde, hasta } = req.body
  try {
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match:
          {
            tipoMovimiento: 'compra',
            fecha: { $gte: moment(desde).toDate(), $lte: moment(hasta).toDate() }
          }
        },
        { $count: 'total' }
      ]
    })
    if (itemsPorPagina && pagina) {
      const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
      const comprasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'compras' })
      const listadoCompras = await agreggateCollectionsSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        pipeline: [
          {
            $match:
            {
              tipoMovimiento: 'compra',
              fecha: { $gte: moment(desde).toDate(), $lte: moment(hasta).toDate() }
            }
          },
          { $sort: { fecha: 1 } },
          { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
          { $limit: Number(itemsPorPagina) },
          {
            $lookup: {
              from: comprasCollection,
              localField: 'ordenCompraId',
              foreignField: '_id',
              as: 'ordenCompraDetalle'
            }
          },
          { $unwind: { path: '$ordenCompraDetalle', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: proveedoresCollection,
              localField: 'proveedorId',
              foreignField: '_id',
              as: 'proveedor'
            }
          },
          { $unwind: { path: '$proveedor', preserveNullAndEmptyArrays: true } }
        ]
      })
      // console.log(productsList)
      return res.status(200).json({ listadoCompras })
    }
    return res.status(200).json({ count: count[0] ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las retenciones de ISLR ' + e.message })
  }
}
export const listadoComprasDetallada = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina, desde, hasta } = req.body
  try {
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match:
          {
            tipoMovimiento: 'compra',
            fecha: { $gte: moment(desde).toDate(), $lte: moment(hasta).toDate() }
          }
        },
        { $count: 'total' }
      ]
    })
    if (itemsPorPagina && pagina) {
      const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
      const comprasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'compras' })
      const detalleDocumentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleDocumentosFiscales' })
      const listadoCompras = await agreggateCollectionsSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        pipeline: [
          {
            $match:
            {
              tipoMovimiento: 'compra',
              fecha: { $gte: moment(desde).toDate(), $lte: moment(hasta).toDate() }
            }
          },
          { $sort: { fecha: 1 } },
          { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
          { $limit: Number(itemsPorPagina) },
          {
            $lookup: {
              from: comprasCollection,
              localField: 'ordenCompraId',
              foreignField: '_id',
              as: 'ordenCompraDetalle'
            }
          },
          { $unwind: { path: '$ordenCompraDetalle', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: proveedoresCollection,
              localField: 'proveedorId',
              foreignField: '_id',
              as: 'proveedor'
            }
          },
          { $unwind: { path: '$proveedor', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: detalleDocumentosFiscalesCollection,
              localField: '_id',
              foreignField: 'facturaId',
              as: 'detalleDocumento'
            }
          },
          { $unwind: { path: '$detalleDocumento', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              proveedoRazonSocial: '$proveedor.razonSocial',
              proveedorDocumento: { $concat: ['$proveedor.tipoDocumento', '-', '$proveedor.documentoIdentidad'] },
              numeroOrden: '$ordenCompraDetalle.numeroOrden',
              fechaOrden: '$ordenCompraDetalle.fecha',
              fecha: 1,
              numeroFactura: 1,
              codigoProducto: '$detalleDocumento.codigo',
              nombreProducto: '$detalleDocumento.nombre',
              costoUnitario: '$detalleDocumento.costoUnitario',
              cantidad: '$detalleDocumento.cantidad',
              baseImponible: '$detalleDocumento.baseImponible',
              montoIva: '$detalleDocumento.montoIva',
              iva: '$detalleDocumento.iva',
              costoTotal: '$detalleDocumento.costoTotal',
            }
          }
        ]
      })
      // console.log(productsList)
      return res.status(200).json({ listadoCompras })
    }
    return res.status(200).json({ count: count[0] ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las retenciones de ISLR ' + e.message })
  }
}
