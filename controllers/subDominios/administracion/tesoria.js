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
                      { $ne: ['caja', undefined] },
                      { $ne: ['caja', null] },
                      { $ne: ['caja', ''] }
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
                      { $ne: ['banco', undefined] },
                      { $ne: ['banco', null] },
                      { $ne: ['banco', ''] }
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
                      { $ne: ['caja', undefined] },
                      { $ne: ['caja', null] },
                      { $ne: ['caja', ''] }
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
                      { $ne: ['banco', undefined] },
                      { $ne: ['banco', null] },
                      { $ne: ['banco', ''] }
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
                      { $ne: ['caja', undefined] },
                      { $ne: ['caja', null] },
                      { $ne: ['caja', ''] }
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
                      { $ne: ['banco', undefined] },
                      { $ne: ['banco', null] },
                      { $ne: ['banco', ''] }
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
                      { $ne: ['caja', undefined] },
                      { $ne: ['caja', null] },
                      { $ne: ['caja', ''] }
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
                      { $ne: ['banco', undefined] },
                      { $ne: ['banco', null] },
                      { $ne: ['banco', ''] }
                    ]
                  },
                  then: '$valor',
                  else: 0
                }
              }
            }
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
