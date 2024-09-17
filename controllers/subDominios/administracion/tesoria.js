import { tiposDocumentosFiscales } from '../../../constants.js'
import { agreggateCollections, agreggateCollectionsSD, getItem } from '../../../utils/dataBaseConfing.js'

export const getTotalesTransaciones = async (req, res) => {
  const { clienteId, fechaTasa, monedaPrincipal, fecha } = req.body
  try {
    console.log(req.body)
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
    const totales = await agreggateCollectionsSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
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
            valor: { $multiply: ['$tasa.v', '$pagoSecundario'] }
          }
        },
        {
          $group: {
            _id: null,
            ingresosVentasEfectivoNacional: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipo', 'venta'] },
                      { $eq: ['$monedaSecundaria', monedaPrincipal] },
                      { $ne: [{ $type: '$banco' }, 'objectId'] },
                      { $eq: [{ $type: '$caja' }, 'objectId'] },
                      { $ne: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                      { $ne: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] }
                    ]
                  },
                  then: '$valor',
                  else: 0
                }
              }
            },
            egresosVentasEfectivoNacional: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $eq: ['$monedaSecundaria', monedaPrincipal] },
                          { $ne: [{ $type: '$banco' }, 'objectId'] },
                          { $eq: [{ $type: '$caja' }, 'objectId'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $eq: ['$monedaSecundaria', monedaPrincipal] },
                          { $ne: [{ $type: '$banco' }, 'objectId'] },
                          { $eq: [{ $type: '$caja' }, 'objectId'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] }
                        ]
                      }
                    ]
                  },
                  then: '$valor',
                  else: 0
                }
              }
            },
            ingresosVentasBancoNacional: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipo', 'venta'] },
                      { $eq: ['$monedaSecundaria', monedaPrincipal] },
                      { $eq: [{ $type: '$banco' }, 'objectId'] },
                      { $ne: [{ $type: '$caja' }, 'objectId'] },
                      { $ne: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                      { $ne: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] }
                    ]
                  },
                  then: '$valor',
                  else: 0
                }
              }
            },
            egresosVentasBancoNacional: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $eq: ['$monedaSecundaria', monedaPrincipal] },
                          { $eq: [{ $type: '$banco' }, 'objectId'] },
                          { $ne: [{ $type: '$caja' }, 'objectId'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $eq: ['$monedaSecundaria', monedaPrincipal] },
                          { $eq: [{ $type: '$banco' }, 'objectId'] },
                          { $ne: [{ $type: '$caja' }, 'objectId'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] }
                        ]
                      }
                    ]
                  },
                  then: '$valor',
                  else: 0
                }
              }
            },
            ingresosVentasEfectivoDivisas: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipo', 'venta'] },
                      { $ne: ['$monedaSecundaria', monedaPrincipal] },
                      { $ne: [{ $type: '$banco' }, 'objectId'] },
                      { $eq: [{ $type: '$caja' }, 'objectId'] }
                    ]
                  },
                  then: '$valor',
                  else: 0
                }
              }
            },
            egresosVentasEfectivoDivisas: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $ne: ['$monedaSecundaria', monedaPrincipal] },
                          { $ne: [{ $type: '$banco' }, 'objectId'] },
                          { $eq: [{ $type: '$caja' }, 'objectId'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $ne: ['$monedaSecundaria', monedaPrincipal] },
                          { $ne: [{ $type: '$banco' }, 'objectId'] },
                          { $eq: [{ $type: '$caja' }, 'objectId'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] }
                        ]
                      }
                    ]
                  },
                  then: '$valor',
                  else: 0
                }
              }
            },
            ingresosVentasBancoDivisas: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipo', 'venta'] },
                      { $ne: ['$monedaSecundaria', monedaPrincipal] },
                      { $eq: [{ $type: '$banco' }, 'objectId'] },
                      { $ne: [{ $type: '$caja' }, 'objectId'] }
                    ]
                  },
                  then: '$valor',
                  else: 0
                }
              }
            },
            egresosVentasBancoDivisas: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $ne: ['$monedaSecundaria', monedaPrincipal] },
                          { $eq: [{ $type: '$banco' }, 'objectId'] },
                          { $ne: [{ $type: '$caja' }, 'objectId'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $ne: ['$monedaSecundaria', monedaPrincipal] },
                          { $eq: [{ $type: '$banco' }, 'objectId'] },
                          { $ne: [{ $type: '$caja' }, 'objectId'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] }
                        ]
                      }
                    ]
                  },
                  then: '$valor',
                  else: 0
                }
              }
            },
            egresosComprasEfectivoNacional: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipo', 'compra'] },
                      { $eq: ['$monedaSecundaria', monedaPrincipal] },
                      { $ne: [{ $type: '$banco' }, 'objectId'] },
                      { $eq: [{ $type: '$caja' }, 'objectId'] }
                    ]
                  },
                  then: '$valor',
                  else: 0
                }
              }
            },
            egresosComprasBancoNacional: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipo', 'compra'] },
                      { $eq: ['$monedaSecundaria', monedaPrincipal] },
                      { $eq: [{ $type: '$banco' }, 'objectId'] },
                      { $ne: [{ $type: '$caja' }, 'objectId'] }
                    ]
                  },
                  then: '$valor',
                  else: 0
                }
              }
            },
            egresosComprasEfectivoDivisas: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipo', 'compra'] },
                      { $ne: ['$monedaSecundaria', monedaPrincipal] },
                      { $ne: [{ $type: '$banco' }, 'objectId'] },
                      { $eq: [{ $type: '$caja' }, 'objectId'] }
                    ]
                  },
                  then: '$valor',
                  else: 0
                }
              }
            },
            egresosComprasBancoDivisas: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipo', 'compra'] },
                      { $ne: ['$monedaSecundaria', monedaPrincipal] },
                      { $eq: [{ $type: '$banco' }, 'objectId'] },
                      { $ne: [{ $type: '$caja' }, 'objectId'] }
                    ]
                  },
                  then: '$valor',
                  else: 0
                }
              }
            }
          }
        },
        {
          $project: {
            efectivoPrincipal: { $subtract: ['$ingresosVentasEfectivoNacional', { $add: ['$egresosComprasEfectivoNacional', '$egresosVentasEfectivoNacional'] }] },
            efectivoDivisas: { $subtract: ['$ingresosVentasEfectivoDivisas', { $add: ['$egresosComprasEfectivoDivisas', '$egresosVentasEfectivoDivisas'] }] },
            bancoPrincipal: { $subtract: ['$ingresosVentasBancoNacional', { $add: ['$egresosComprasBancoNacional', '$egresosVentasBancoNacional'] }] },
            bancoDivisas: { $subtract: ['$ingresosVentasBancoDivisas', { $add: ['$egresosComprasBancoDivisas', '$egresosVentasBancoDivisas'] }] }
          }
        }
      ]

    })
    return res.status(200).json({ tasa, totales })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar información sobre las transacciones ' + e.message })
  }
}
