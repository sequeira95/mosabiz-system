import { ObjectId } from 'mongodb'
import { subDominioName, tiposDocumentosFiscales } from '../../../constants.js'
import { agreggateCollections, agreggateCollectionsSD, createItemSD, formatCollectionName, getItem, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import moment from 'moment-timezone'

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
                            { $eq: ['$tipo', 'compra'] }
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
export const getListTiposcuentas = async (req, res) => {
  try {
    const { clienteId, tipoCuenta } = req.body
    const tipoBusqueda = tipoCuenta?.tipoBusqueda
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
    const listCuentas = await agreggateCollectionsSD({
      nameCollection: 'bancos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: tiposBusqueda }
      ]
    })
    return res.status(200).json({ listCuentas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar información sobre la lista de cuentas ' + e.message })
  }
}
export const getDetalleCuenta = async (req, res) => {
  try {
    const { clienteId, mes, monedaPrincipal, cuenta, fechaTasa, year, desde, hasta } = req.body
    console.log({ clienteId, mes, monedaPrincipal, cuenta, year, desde, hasta })
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
    let conciliacionTesoreria = await getItemSD({
      nameCollection: 'conciliacionTesoreria',
      enviromentClienteId: clienteId,
      filters: { year: Number(year), mes: mes.value + 1 }
    })
    let [detalle] = await agreggateCollectionsSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fechaPago: { $gte: moment(desde).toDate(), $lte: moment(hasta).toDate() },
            $or: [
              { caja: new ObjectId(cuenta._id) },
              { banco: new ObjectId(cuenta._id) }
            ]
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
                      {
                        $or: [
                          { $eq: ['$tipo', 'venta'] },
                          { $eq: ['$tipo', 'ingreso'] },
                          { $eq: ['$tipo', 'cierre'] },
                        ],
                      },
                      { $ne: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                      { $ne: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] },
                    ]
                  },
                  then: '$valor',
                  else: 0
                }
              }
            },
            egresos: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      {
                        $or: [
                          { $eq: ['$tipo', 'compra'] },
                          { $eq: ['$tipo', 'egreso'] },
                          {
                            $and: [
                              { $eq: ['$tipo', 'venta'] },
                              { $or: [{ $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] }] }
                            ]
                          }
                        ]
                      }
                    ]
                  },
                  then: '$valor',
                  else: 0
                }
              }
            },
            detalle: { $push: '$$ROOT' }
          }
        },
      ]
    })
    console.log({ detalle })
    if (!detalle) detalle = {}
    if (!conciliacionTesoreria) {
      const [saldosIniciales] = await agreggateCollectionsSD({
        nameCollection: 'transacciones',
        enviromentClienteId: clienteId,
        pipeline: [
          {
            $match: {
              fechaPago: { $lt: moment(desde).toDate() },
              $or: [
                { caja: new ObjectId(cuenta._id) },
                { banco: new ObjectId(cuenta._id) }
              ]
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
                        {
                          $or: [
                            { $eq: ['$tipo', 'venta'] },
                            { $eq: ['$tipo', 'ingreso'] },
                            { $eq: ['$tipo', 'cierre'] },
                          ],
                        },
                        { $ne: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                        { $ne: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] },
                      ]
                    },
                    then: '$valor',
                    else: 0
                  }
                }
              },
              egresos: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$tipo', 'compra'] },
                            { $eq: ['$tipo', 'egreso'] },
                            {
                              $and: [
                                { $eq: ['$tipo', 'venta'] },
                                { $or: [{ $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] }] }
                              ]
                            }
                          ]
                        }
                      ]
                    },
                    then: '$valor',
                    else: 0
                  }
                }
              },
            }
          },
          {
            $project: {
              _id: 0,
              ingresos: 1,
              egresos: 1,
              saldo: { $subtract: ['$ingresos', '$egresos'] }
            }
          }
        ]
      })
      console.log({ saldosIniciales })
      const saldoFinal = Number(((saldosIniciales?.saldo || 0) + (detalle?.ingresos || 0) - (detalle?.egresos || 0)).toFixed(2))
      conciliacionTesoreria = await upsertItemSD({
        nameCollection: 'conciliacionTesoreria',
        enviromentClienteId: clienteId,
        filters: { year: Number(year), mes: mes.value + 1, cajaBancoId: new ObjectId(cuenta._id) },
        update: {
          $set: {
            // year,
            // mes: mes.value + 1,
            ingresos: Number((detalle?.ingresos || 0)?.toFixed(2)),
            egresos: Number((detalle?.egresos || 0)?.toFixed(2)),
            saldoInicial: Number((saldosIniciales?.saldo || 0)?.toFixed(2)),
            saldoFinal,
            ingresosReal: 0,
            egresosReal: 0,
            saldoInicialReal: 0,
            saldoFinalReal: 0,
            estado: 'noConciliado'
          }
        }
      })
      detalle.saldoInicial = conciliacionTesoreria?.saldoInicial || 0
      detalle.saldoFinal = Number(((conciliacionTesoreria?.saldoInicial || 0) + (detalle?.ingresos || 0) - (detalle?.egresos || 0)).toFixed(2))
      createItemSD({
        nameCollection: 'conciliacionTesoreria',
        enviromentClienteId: clienteId,
        item: {
          saldoInicial: saldoFinal,
          year: mes + 2 === 13 ? Number(year) + 1 : Number(year),
          mes: mes.value + 2 === 13 ? 1 : mes.value + 2,
          cajaBancoId: new ObjectId(cuenta._id)
        }
      })
    } else {
      detalle.saldoInicial = conciliacionTesoreria?.saldoInicial || 0
      detalle.saldoFinal = Number(((conciliacionTesoreria?.saldoInicial || 0) + (detalle?.ingresos || 0) - (detalle?.egresos || 0)).toFixed(2))
      if (conciliacionTesoreria.saldoFinalReal !== detalle.saldoFinal) {
        updateItemSD({
          nameCollection: 'conciliacionTesoreria',
          enviromentClienteId: clienteId,
          filters: { year: Number(year), mes: mes.value + 1, cajaBancoId: new ObjectId(cuenta._id) },
          update: {
            $set: {
              ingresos: Number((detalle?.ingresos || 0)?.toFixed(2)),
              egresos: Number((detalle?.egresos || 0)?.toFixed(2)),
              saldoInicial: Number((detalle?.saldoInicial || 0)?.toFixed(2)),
              saldoFinal: Number((detalle?.saldoFinal || 0)?.toFixed(2)),
              estado: 'noConciliado',
              ingresosReal: 0,
              egresosReal: 0,
              saldoInicialReal: 0,
              saldoFinalReal: 0,
            }
          }
        })
        updateItemSD({
          nameCollection: 'conciliacionTesoreria',
          enviromentClienteId: clienteId,
          filters: { year: mes + 2 === 13 ? Number(year) + 1 : Number(year), mes: mes.value + 2 === 13 ? 1 : mes.value + 2, cajaBancoId: new ObjectId(cuenta._id) },
          update: {
            $set: {
              saldoInicial: Number((detalle?.saldoFinal || 0)?.toFixed(2)),
            }
          }
        })
      }
    }
    console.log({ detalle })
    return res.status(200).json({ detalle })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar información sobre el detalle de la cuenta ' + e.message })
  }
}
