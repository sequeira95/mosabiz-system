import { ObjectId } from 'mongodb'
import { subDominioName, tiposDocumentosFiscales } from '../../../constants.js'
import { agreggateCollections, agreggateCollectionsSD, deleteItemSD, formatCollectionName, getItem, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import moment from 'moment-timezone'

export const getTotalesTransaciones = async (req, res) => {
  const { clienteId, fechaTasa, monedaPrincipal, mes, year } = req.body
  try {
    // console.log(req.body)
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
    const conciliacionTesoreriaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'conciliacionTesoreria' })
    const dataTransacciones = await agreggateCollectionsSD({
      nameCollection: 'bancos',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $lookup: {
            from: conciliacionTesoreriaCollection,
            localField: '_id',
            foreignField: 'cajaBancoId',
            pipeline: [
              { $match: { year: Number(year), mes: mes.value + 1 } },
            ],
            as: 'detalleConciliacion'
          }
        },
        { $unwind: { path: '$detalleConciliacion', preserveNullAndEmptyArrays: true } }
      ]
    })
    console.log({ dataTransacciones })
    const totales = dataTransacciones.reduce((acumulado, banco) => {
      const tipo = banco.tipo
      const tipoBanco = banco.tipoBanco
      const isNacionalDivisas = banco.isNacionalDivisas
      const detalleTotales = banco.detalleConciliacion
      if (tipo === 'Nacional' && (tipoBanco === 'cajaChica' || tipoBanco === 'cajaPrincipal') && !isNacionalDivisas) {
        acumulado[0].total += detalleTotales?.saldoFinal || 0
      } else if (((tipo === 'Nacional' && isNacionalDivisas) || tipo === 'Internacional') && (tipoBanco === 'cajaChica' || tipoBanco === 'cajaPrincipal')) {
        acumulado[1].total += detalleTotales?.saldoFinal || 0
      } else if (tipo === 'Nacional' && tipoBanco === 'banco' && !isNacionalDivisas) {
        acumulado[2].total += detalleTotales?.saldoFinal || 0
      } else if (tipo === 'Nacional' && tipoBanco === 'banco' && isNacionalDivisas) {
        acumulado[3].total += detalleTotales?.saldoFinal || 0
      } else if (tipo === 'Internacional' && tipoBanco === 'banco') {
        acumulado[4].total += detalleTotales?.saldoFinal || 0
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
  const { clienteId, tipoBusqueda, fechaTasa, year, mes, monedaPrincipal } = req.body
  console.log(req.body)
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
    const conciliacionTesoreriaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'conciliacionTesoreria' })
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
            from: conciliacionTesoreriaCollection,
            localField: '_id',
            foreignField: 'cajaBancoId',
            pipeline: [
              { $match: { year: Number(year), mes: mes.value + 1 } },
            ],
            as: 'detalleConciliacion'
          }
        },
        { $unwind: { path: '$detalleConciliacion', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            nombre: 1,
            descripcion: 1,
            estado: '$detalleConciliacion.estado',
            ingresos: '$detalleConciliacion.ingresos',
            egresos: '$detalleConciliacion.egresos',
            saldoInicial: '$detalleConciliacion.saldoInicial',
            saldoFinal: '$detalleConciliacion.saldoFinal',
            saldoInicialReal: '$detalleConciliacion.saldoInicialReal',
            saldoFinalReal: '$detalleConciliacion.saldoFinalReal',
            ingresosReal: '$detalleConciliacion.ingresosReal',
            egresosReal: '$detalleConciliacion.egresosReal',
            year: '$detalleConciliacion.year',
            mes: '$detalleConciliacion.mes',
            conciliacionId: '$detalleConciliacion._id'
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
export const getTotalesCuenta = async (req, res) => {
  try {
    const { clienteId, mes, monedaPrincipal, cuenta, fechaTasa, year, desde, hasta } = req.body
    // console.log({ clienteId, mes, monedaPrincipal, cuenta, year, desde, hasta })
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
      filters: { year: Number(year), mes: mes.value + 1, cajaBancoId: new ObjectId(cuenta._id) }
    })
    let [totales] = await agreggateCollectionsSD({
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
                          { $eq: ['$tipo', 'Ingreso'] },
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
                          { $eq: ['$tipo', 'Egreso'] },
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
            // count: { $sum: 1 }
          }
        },
      ]
    })
    if (!totales) totales = {}
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
                            { $eq: ['$tipo', 'Ingreso'] },
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
                            { $eq: ['$tipo', 'Egreso'] },
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
      const saldoFinal = Number(((saldosIniciales?.saldo || 0) + (totales?.ingresos || 0) - (totales?.egresos || 0)).toFixed(2))
      conciliacionTesoreria = await upsertItemSD({
        nameCollection: 'conciliacionTesoreria',
        enviromentClienteId: clienteId,
        filters: { year: Number(year), mes: mes.value + 1, cajaBancoId: new ObjectId(cuenta._id) },
        update: {
          $set: {
            // year,
            // mes: mes.value + 1,
            ingresos: Number((totales?.ingresos || 0)?.toFixed(2)),
            egresos: Number((totales?.egresos || 0)?.toFixed(2)),
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
      totales.saldoInicial = conciliacionTesoreria?.saldoInicial || 0
      totales.saldoFinal = Number(((conciliacionTesoreria?.saldoInicial || 0) + (totales?.ingresos || 0) - (totales?.egresos || 0)).toFixed(2))
      upsertItemSD({
        nameCollection: 'conciliacionTesoreria',
        enviromentClienteId: clienteId,
        filters: { year: mes + 2 === 13 ? Number(year) + 1 : Number(year), mes: mes.value + 2 === 13 ? 1 : mes.value + 2, cajaBancoId: new ObjectId(cuenta._id) },
        update: {
          $set: {
            saldoInicial: saldoFinal
          }
        }
      })
    } else {
      totales.saldoInicial = conciliacionTesoreria?.saldoInicial || 0
      totales.saldoFinal = Number(((conciliacionTesoreria?.saldoInicial || 0) + (totales?.ingresos || 0) - (totales?.egresos || 0)).toFixed(2))
      console.log({ saldoFinal: totales.saldoFinal })
      updateItemSD({
        nameCollection: 'conciliacionTesoreria',
        enviromentClienteId: clienteId,
        filters: { year: Number(year), mes: mes.value + 1, cajaBancoId: new ObjectId(cuenta._id) },
        update: {
          $set: {
            ingresos: Number((totales?.ingresos || 0)?.toFixed(2)),
            egresos: Number((totales?.egresos || 0)?.toFixed(2)),
            saldoInicial: Number((totales?.saldoInicial || 0)?.toFixed(2)),
            saldoFinal: Number((totales?.saldoFinal || 0)?.toFixed(2)),
            estado: conciliacionTesoreria.saldoFinalReal !== totales.saldoFinal ? 'noConciliado' : 'conciliado',
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
            saldoInicial: Number((totales?.saldoFinal || 0)?.toFixed(2)),
          }
        }
      })
    }
    console.log({ totales })
    return res.status(200).json({ totales })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar información sobre el detalle de la cuenta ' + e.message })
  }
}
export const getDetalleCuenta = async (req, res) => {
  try {
    const { clienteId, monedaPrincipal, cuenta, fechaTasa, desde, hasta, pagina, itemsPorPagina } = req.body
    // console.log({ clienteId, mes, monedaPrincipal, cuenta, year, desde, hasta })
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
    const detalle = await agreggateCollectionsSD({
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
        { $sort: { fechaPago: -1 } },
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
            valor: { $multiply: ['$tasa.v', '$pagoSecundario'] }
          }
        },
      ]
    })
    const [count] = await agreggateCollectionsSD({
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
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ detalle, count: count?.total || 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar información sobre el detalle de la cuenta ' + e.message })
  }
}
export const saveTransaccion = async (req, res) => {
  try {
    const { clienteId, fechaPago, tipo, referencia, pago, cuenta, year, mes, monedaPrincipal, _id } = req.body
    console.log(req.body)
    const transaccion = await upsertItemSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          pago: Number(pago.toFixed(2)),
          fechaPago: moment(fechaPago).toDate(),
          referencia,
          banco: cuenta?.tipoBanco === 'banco' ? new ObjectId(cuenta._id) : null,
          caja: cuenta?.tipoBanco !== 'banco' ? new ObjectId(cuenta._id) : null,
          pagoSecundario: Number(pago.toFixed(2)),
          moneda: monedaPrincipal,
          monedaSecundaria: monedaPrincipal,
          tasa: 1,
          tipo,
          creadoPor: new ObjectId(req.uid),
          fechaCreacion: moment().toDate()
        }
      }
    })
    const conciliacionTesoreria = await getItemSD({
      nameCollection: 'conciliacionTesoreria',
      enviromentClienteId: clienteId,
      filters: { year: Number(year), mes: mes.value + 1, cajaBancoId: new ObjectId(cuenta._id) }
    })
    const ingresos = tipo === 'Ingreso' ? (conciliacionTesoreria?.ingresos || 0) + (pago) || 0 : (conciliacionTesoreria?.ingresos || 0)
    const egresos = tipo === 'Egreso' ? (conciliacionTesoreria?.egresos || 0) + (pago) || 0 : (conciliacionTesoreria?.egresos || 0)
    const saldoFinal = ((conciliacionTesoreria?.saldoInicial || 0) + ingresos) - egresos
    upsertItemSD({
      nameCollection: 'conciliacionTesoreria',
      enviromentClienteId: clienteId,
      filters: { year: Number(year), mes: mes.value + 1, cajaBancoId: new ObjectId(cuenta._id) },
      update: {
        $set: {
          ingresos: Number(ingresos?.toFixed(2)),
          egresos: Number(egresos?.toFixed(2)),
          saldoFinal: Number(saldoFinal?.toFixed(2)),
          estado: (saldoFinal > 0 || saldoFinal < 0) && saldoFinal !== conciliacionTesoreria?.saldoFinalReal ? 'noConciliado' : 'conciliado',
        }
      }
    })
    upsertItemSD({
      nameCollection: 'conciliacionTesoreria',
      enviromentClienteId: clienteId,
      filters: { year: mes + 2 === 13 ? Number(year) + 1 : Number(year), mes: mes.value + 2 === 13 ? 1 : mes.value + 2, cajaBancoId: new ObjectId(cuenta._id) },
      update: {
        $set: {
          saldoInicial: Number(saldoFinal?.toFixed(2)),
        }
      }
    })
    return res.status(200).json({ transaccion })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la transaccion ' + e.message })
  }
}
export const deleteTransaccion = async (req, res) => {
  try {
    const { clienteId, tipo, pago, cuenta, year, mes, _id } = req.body
    console.log(req.body)
    const transaccion = await deleteItemSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
    })
    const conciliacionTesoreria = await getItemSD({
      nameCollection: 'conciliacionTesoreria',
      enviromentClienteId: clienteId,
      filters: { year: Number(year), mes: mes.value + 1, cajaBancoId: new ObjectId(cuenta._id) }
    })
    const ingresos = tipo === 'Ingreso' ? (conciliacionTesoreria?.ingresos || 0) - (pago) || 0 : (conciliacionTesoreria?.ingresos || 0)
    const egresos = tipo === 'Egreso' ? (conciliacionTesoreria?.egresos || 0) - (pago) || 0 : (conciliacionTesoreria?.egresos || 0)
    const saldoFinal = ((conciliacionTesoreria?.saldoInicial || 0) + ingresos) - egresos
    upsertItemSD({
      nameCollection: 'conciliacionTesoreria',
      enviromentClienteId: clienteId,
      filters: { year: Number(year), mes: mes.value + 1, cajaBancoId: new ObjectId(cuenta._id) },
      update: {
        $set: {
          ingresos: Number(ingresos?.toFixed(2)),
          egresos: Number(egresos?.toFixed(2)),
          saldoFinal: Number(saldoFinal?.toFixed(2)),
          estado: (saldoFinal > 0 || saldoFinal < 0) && saldoFinal !== conciliacionTesoreria?.saldoFinalReal ? 'noConciliado' : 'conciliado',
        }
      }
    })
    upsertItemSD({
      nameCollection: 'conciliacionTesoreria',
      enviromentClienteId: clienteId,
      filters: { year: mes + 2 === 13 ? Number(year) + 1 : Number(year), mes: mes.value + 2 === 13 ? 1 : mes.value + 2, cajaBancoId: new ObjectId(cuenta._id) },
      update: {
        $set: {
          saldoInicial: Number(saldoFinal?.toFixed(2)),
        }
      }
    })
    return res.status(200).json({ transaccion })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar la transaccion ' + e.message })
  }
}
export const saveConciliacion = async (req, res) => {
  try {
    const {
      clienteId,
      saldoInicialReal,
      saldoFinalReal,
      ingresosReal,
      egresosReal,
      conciliacionId,
      ingresos,
      egresos,
      saldoInicial,
      saldoFinal
    } = req.body
    console.log(req.body)
    let estado = 'noConciliado'
    if (ingresos !== 0 && ingresos === ingresosReal &&
      egresos !== 0 && egresos === egresosReal &&
      saldoInicial !== 0 && saldoInicial === saldoInicialReal &&
      saldoFinal !== 0 && saldoFinal === saldoFinalReal) {
      estado = 'conciliado'
    }
    const conciliacion = await updateItemSD({
      nameCollection: 'conciliacionTesoreria',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(conciliacionId) },
      update: {
        $set: {
          ingresosReal: Number(ingresosReal?.toFixed(2)),
          egresosReal: Number(egresosReal?.toFixed(2)),
          saldoInicialReal: Number(saldoInicialReal?.toFixed(2)),
          saldoFinalReal: Number(saldoFinalReal?.toFixed(2)),
          estado
        }
      }
    })
    console.log({ conciliacion })
    return res.status(200).json({ conciliacion })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar la transaccion ' + e.message })
  }
}
