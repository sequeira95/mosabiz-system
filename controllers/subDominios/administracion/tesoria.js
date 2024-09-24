import { subDominioName, tiposDocumentosFiscales } from '../../../constants.js'
import { agreggateCollections, agreggateCollectionsSD, formatCollectionName, getItem } from '../../../utils/dataBaseConfing.js'

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
    const transaccionesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'transacciones' })
    const dataTransacciones = await agreggateCollectionsSD({
      nameCollection: 'bancos',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $lookup: {
            from: transaccionesCollection,
            let: { cajaBancoId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ['$caja', '$$cajaBancoId'] },
                      { $eq: ['$banco', '$$cajaBancoId'] }
                    ]
                  }
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
                  valor: { $multiply: ['$tasa.v', '$pagoSecundario'] }
                }
              },
              {
                $group: {
                  _id: null,
                  ingresosVentasBanco: {
                    $sum: {
                      $cond: {
                        if: {
                          $and: [
                            { $eq: ['$tipo', 'venta'] },
                            { $eq: [{ $type: '$banco' }, 'objectId'] },
                            // { $ne: [{ $type: '$caja' }, 'objectId'] },
                            { $ne: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                            { $ne: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] }
                          ]
                        },
                        then: '$valor',
                        else: 0
                      }
                    }
                  },
                  egresosVentasBanco: {
                    $sum: {
                      $cond: {
                        if: {
                          $or: [
                            {
                              $and: [
                                { $eq: ['$tipo', 'venta'] },
                                { $eq: [{ $type: '$banco' }, 'objectId'] },
                                // { $ne: [{ $type: '$caja' }, 'objectId'] },
                                { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] }
                              ]
                            },
                            {
                              $and: [
                                { $eq: ['$tipo', 'venta'] },
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
                  egresosComprasEfectivo: {
                    $sum: {
                      $cond: {
                        if: {
                          $and: [
                            { $eq: ['$tipo', 'compra'] },
                            { $ne: [{ $type: '$banco' }, 'objectId'] },
                            { $eq: [{ $type: '$caja' }, 'objectId'] }
                          ]
                        },
                        then: '$valor',
                        else: 0
                      }
                    }
                  },
                  egresosComprasBanco: {
                    $sum: {
                      $cond: {
                        if: {
                          $and: [
                            { $eq: ['$tipo', 'compra'] },
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
                  _id: 0,
                  bancos: { $subtract: ['$ingresosVentasBanco', { $add: ['$egresosVentasBanco', '$egresosComprasBanco'] }] },
                  efectivo: '$egresosComprasEfectivo'
                }
              }
            ],
            as: 'detalleTransacciones'
          }
        },
        { $unwind: { path: '$detalleTransacciones', preserveNullAndEmptyArrays: true } }
      ]
    })
    const totales = dataTransacciones.reduce((acumulado, banco) => {
      const tipo = banco.tipo
      const tipoBanco = banco.tipoBanco
      const isNacionalDivisas = banco.isNacionalDivisas
      const detalleTotales = banco.detalleTransacciones
      if (tipo === 'Nacional' && (tipoBanco === 'cajaChica' || tipoBanco === 'cajaPrincipal') && !isNacionalDivisas) {
        acumulado[0].total += detalleTotales?.efectivo || 0
      } else if (((tipo === 'Nacional' && isNacionalDivisas) || tipo === 'Internacional') && (tipoBanco === 'cajaChica' || tipoBanco === 'cajaPrincipal')) {
        acumulado[1].total += detalleTotales?.efectivo || 0
      } else if (tipo === 'Nacional' && tipoBanco === 'banco' && !isNacionalDivisas) {
        acumulado[2].total += detalleTotales?.bancos || 0
      } else if (tipo === 'Nacional' && tipoBanco === 'banco' && isNacionalDivisas) {
        acumulado[3].total += detalleTotales?.bancos || 0
      } else if (tipo === 'Internacional' && tipoBanco === 'banco') {
        acumulado[4].total += detalleTotales?.bancos || 0
      }
      return acumulado
    }, [
      {
        tipo: 'Efectivo ' + monedaPrincipal,
        total: 0,
        tipoBusqueda: 'EN' // EFECTIVO NACIONAL
      },
      {
        tipo: 'Efectivo Divisas',
        total: 0,
        tipoBusqueda: 'ED' // EFECTIVO EN DIVISAS
      },
      {
        tipo: 'Bancos Nacionales ' + monedaPrincipal,
        total: 0,
        tipoBusqueda: 'BN' // BANCOS NACIONALES
      },
      {
        tipo: 'Bancos Nacionales Divisas',
        total: 0,
        tipoBusqueda: 'BND' // BANCOS NACIONALES EN DIVISAS
      },
      {
        tipo: 'Bancos Internacionales Divisas',
        total: 0,
        tipoBusqueda: 'BI' // BANCOS INTERNACIONALES
      }
    ])
    console.log({ totales })
    return res.status(200).json({ tasa, totales })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar información sobre las transacciones ' + e.message })
  }
}
export const getDetalleTransacciones = async (req, res) => {
  const { clienteId, tipoBusqueda, fechaTasa, fecha, monedaPrincipal } = req.body
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
    const transaccionesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'transacciones' })
    let tiposBusqueda = { }
    if (tipoBusqueda === 'EN') {
      tiposBusqueda = {
        tipo: 'Nacional',
        isNacionalDivisas: { $ne: true },
        $or: [
          { tipoBanco: 'cajaChica' },
          { tipoBanco: 'cajaPrincipal' }
        ]
      }
    }
    if (tipoBusqueda === 'ED') {
      tiposBusqueda = {
        $or: [
          {
            tipo: 'Nacional',
            tipoBanco: 'cajaChica',
            isNacionalDivisas: true
          },
          {
            tipo: 'Nacional',
            tipoBanco: 'cajaPrincipal',
            isNacionalDivisas: true
          },
          {
            tipo: 'Internacional',
            tipoBanco: 'cajaPrincipal'
          },
          {
            tipo: 'Internacional',
            tipoBanco: 'cajaChica'
          }
        ]
      }
    }
    if (tipoBusqueda === 'BN') {
      tiposBusqueda = {
        tipo: 'Nacional',
        tipoBanco: 'banco',
        isNacionalDivisas: { $ne: true }
      }
    }
    if (tipoBusqueda === 'BND') {
      tiposBusqueda = {
        tipo: 'Nacional',
        tipoBanco: 'banco',
        isNacionalDivisas: true
      }
    }
    if (tipoBusqueda === 'BI') {
      tiposBusqueda = {
        tipo: 'Internacional',
        tipoBanco: 'banco'
      }
    }
    const detalle = await agreggateCollectionsSD({
      nameCollection: 'bancos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: tiposBusqueda },
        {
          $lookup: {
            from: transaccionesCollection,
            let: { cajaBancoId: '$_id' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $or: [
                      { $eq: ['$caja', '$$cajaBancoId'] },
                      { $eq: ['$banco', '$$cajaBancoId'] }
                    ]
                  }
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
                  valor: { $multiply: ['$tasa.v', '$pagoSecundario'] }
                }
              },
              {
                $group: {
                  _id: null,
                  ingresos: {
                    $sum: {
                      $cond: {
                        if: {
                          $and: [
                            { $eq: ['$tipo', 'venta'] },
                            { $ne: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                            { $ne: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] }
                          ]
                        },
                        then: '$valor',
                        else: 0
                      }
                    }
                  },
                  egresosVentas: {
                    $sum: {
                      $cond: {
                        if: {
                          $or: [
                            {
                              $and: [
                                { $eq: ['$tipo', 'venta'] },
                                { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] }
                              ]
                            },
                            {
                              $and: [
                                { $eq: ['$tipo', 'venta'] },
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
                  egresosCompras: {
                    $sum: {
                      $cond: {
                        if: {
                          $and: [
                            { $eq: ['$tipo', 'compra'] },
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
                  _id: 0,
                  ingresos: 1,
                  egresos: { $add: ['$egresosVentas', '$egresosCompras'] },
                  saldo: { $subtract: ['$ingresos', { $add: ['$egresosVentas', '$egresosCompras'] }] }
                }
              }
            ],
            as: 'detalleTransacciones'
          }
        },
        { $unwind: { path: '$detalleTransacciones', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            nombre: 1,
            descripcion: 1,
            ingresos: '$detalleTransacciones.ingresos',
            egresos: '$detalleTransacciones.egresos',
            saldo: '$detalleTransacciones.saldo'
          }
        }
      ]
    })
    return res.status(200).json({ detalle })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar información sobre las transacciones ' + e.message })
  }
}
