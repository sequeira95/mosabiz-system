import moment from 'moment'
import { agreggateCollectionsSD, formatCollectionName, getItemSD, getCollectionSD } from './dataBaseConfing.js'
import { subDominioName, getParentCode } from '../constants.js'
import { ObjectId } from 'mongodb'

export async function mayorAnaliticosSinAgrupar ({ fechaDesde, fechaHasta, order, clienteId, periodoId, cuentaSinMovimientos, ajusteFecha, cuentaDesde, cuentaHasta }) {
  const fechaInit = moment(fechaDesde).startOf('day').toDate()
  const fechaEnd = moment(fechaHasta).endOf('day').toDate()
  const sort = order === 'documento' ? { $sort: { documento: 1 } } : { $sort: { fecha: 1 } }
  const detalleComprobanteCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
  const addFieldCondition = { $addFields: { codigoToInt: { $convert: { input: '$codigo', to: 'double' } } } }
  let matchCondition = []
  if (cuentaDesde && !cuentaHasta) {
    matchCondition = [
      addFieldCondition,
      { $match: { codigoToInt: { $eq: Number(cuentaDesde) } } }
    ]
  }
  if (!cuentaDesde && cuentaHasta) {
    matchCondition = [
      addFieldCondition,
      { $match: { codigoToInt: { $lte: Number(cuentaHasta) } } }
    ]
  }
  if (cuentaDesde && cuentaHasta) {
    matchCondition = [
      addFieldCondition,
      { $match: { codigoToInt: { $gte: Number(cuentaDesde), $lte: Number(cuentaHasta) } } }
    ]
  }
  try {
    const dataCuentas = await agreggateCollectionsSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipo: 'Movimiento'
          }
        },
        ...matchCondition,
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'cuentaId',
            pipeline: [
              {
                $match: {
                  periodoId: new ObjectId(periodoId),
                  fecha: { $gte: fechaInit, $lte: fechaEnd },
                  isPreCierre: { $ne: true },
                  isCierre: { $ne: true }
                }
              },
              sort,
              {
                $group: {
                  _id: '$cuentaId',
                  // cuentaNombre: { $first: '$cuentaNombre' },
                  // cuentaCodigo: { $first: '$cuentaCodigo' },
                  dataCuenta: {
                    $push: {
                      periodoId: '$periodoId',
                      cuentaId: '$cuentaId',
                      fecha: '$fecha',
                      comprobanteId: '$comprobanteId',
                      documento: '$docReferenciaAux',
                      descripcion: '$descripcion',
                      debe: '$debe',
                      haber: '$haber',
                      terceroId: '$terceroId',
                      terceroNombre: '$terceroNombre'
                    }
                  }
                }
              }
            ],
            as: 'detalleComprobantes'
          }
        },
        { $unwind: { path: '$detalleComprobantes', preserveNullAndEmptyArrays: cuentaSinMovimientos } },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'cuentaId',
            pipeline: [
              {
                $match: {
                  periodoId: new ObjectId(periodoId),
                  fecha: { $lt: fechaInit },
                  isPreCierre: { $ne: true },
                  isCierre: { $ne: true }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' },
                  fecha: { $first: '$fecha' }
                }
              }
            ],
            as: 'detalle'
          }
        },
        { $unwind: { path: '$detalle', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'cuentaId',
            pipeline: [
              {
                $match: {
                  periodoId: new ObjectId(periodoId),
                  isPreCierre: { $eq: true }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              }
            ],
            as: 'saldosIniciales'
          }
        },
        { $unwind: { path: '$saldosIniciales', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            cuentaNombre: '$descripcion',
            cuentaCodigo: '$codigo',
            saldoInit: { $subtract: ['$saldosIniciales.debe', '$saldosIniciales.haber'] },
            saldo: { $subtract: ['$detalle.debe', '$detalle.haber'] },
            dataCuenta: '$detalleComprobantes.dataCuenta'
          }
        },
        { $sort: { cuentaCodigo: 1 } }
      ]
    })
    return { dataCuentas }
  } catch (e) {
    console.log(e)
    return e
  }
}
export async function mayorAnaliticosAgrupado ({ fechaDesde, fechaHasta, order, clienteId, periodoId, cuentaSinMovimientos, ajusteFecha, cuentaDesde, cuentaHasta }) {
  const fechaInit = moment(fechaDesde).startOf('day').toDate()
  const fechaEnd = moment(fechaHasta).endOf('day').toDate()
  const sort = order === 'documento' ? { $sort: { documento: 1 } } : { $sort: { fecha: 1 } }
  const detalleComprobanteCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
  const matchCuentasMovimientos = cuentaSinMovimientos ? {} : { $match: { dataCuentaSize: { $gt: 0 } } }
  try {
    const dataCuentas = await agreggateCollectionsSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipo: 'Movimiento'
          }
        },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'cuentaId',
            pipeline: [
              {
                $match: {
                  periodoId: new ObjectId(periodoId),
                  fecha: { $gte: fechaInit, $lte: fechaEnd },
                  isPreCierre: { $ne: true },
                  isCierre: { $ne: true }
                }
              },
              sort,
              {
                $group: {
                  _id: '$terceroId',
                  tercero: { $first: '$terceroNombre' },
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' },
                  dataCuenta: {
                    $push: {
                      periodoId: '$periodoId',
                      cuentaId: '$cuentaId',
                      fecha: '$fecha',
                      comprobanteId: '$comprobanteId',
                      documento: '$docReferenciaAux',
                      descripcion: '$descripcion',
                      debe: '$debe',
                      haber: '$haber'
                    }
                  }
                }
              },
              {
                $lookup: {
                  from: detalleComprobanteCollectionName,
                  localField: '_id',
                  foreignField: 'terceroId',
                  pipeline: [
                    {
                      $match: {
                        periodoId: new ObjectId(periodoId),
                        fecha: { $lte: fechaInit },
                        isPreCierre: { $ne: true },
                        isCierre: { $ne: true }
                      }
                    },
                    sort,
                    {
                      $group: {
                        _id: '$terceroId',
                        debe: { $sum: '$debe' },
                        haber: { $sum: '$haber' }
                      }
                    }
                  ],
                  as: 'saldoAnteriorTercero'
                }
              },
              { $unwind: { path: '$saldoAnteriorTercero', preserveNullAndEmptyArrays: true } },
              {
                $lookup: {
                  from: detalleComprobanteCollectionName,
                  localField: '_id',
                  foreignField: 'terceroId',
                  pipeline: [
                    {
                      $match: {
                        periodoId: new ObjectId(periodoId),
                        isPreCierre: { $eq: true }
                      }
                    },
                    sort,
                    {
                      $group: {
                        _id: '$terceroId',
                        debe: { $sum: '$debe' },
                        haber: { $sum: '$haber' }
                      }
                    }
                  ],
                  as: 'saldosInicialesTercero'
                }
              },
              { $unwind: { path: '$saldosInicialesTercero', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  tercero: 1,
                  debe: 1,
                  haber: 1,
                  saldo: { $subtract: ['$debe', '$haber'] },
                  dataCuenta: 1,
                  saldoAnteriorTercero: { $subtract: ['$saldoAnteriorTercero.debe', '$saldoAnteriorTercero.haber'] },
                  saldosInicialesTercero: { $subtract: ['$saldosInicialesTercero.debe', '$saldosInicialesTercero.haber'] }
                }
              }
            ],
            as: 'detalleComprobantes'
          }
        },
        // { $unwind: { path: '$detalleComprobantes', preserveNullAndEmptyArrays: false } },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'cuentaId',
            pipeline: [
              {
                $match: {
                  periodoId: new ObjectId(periodoId),
                  fecha: { $lt: fechaInit },
                  isPreCierre: { $ne: true }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' },
                  fecha: { $first: '$fecha' }
                }
              }
            ],
            as: 'detalle'
          }
        },
        { $unwind: { path: '$detalle', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'cuentaId',
            pipeline: [
              {
                $match: {
                  periodoId: new ObjectId(periodoId),
                  isPreCierre: { $eq: true }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              }
            ],
            as: 'saldosIniciales'
          }
        },
        { $unwind: { path: '$saldosIniciales', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            cuentaNombre: '$descripcion',
            cuentaCodigo: '$codigo',
            saldoInit: { $subtract: ['$saldosIniciales.debe', '$saldosIniciales.haber'] },
            saldo: { $subtract: ['$detalle.debe', '$detalle.haber'] },
            dataCuenta: '$detalleComprobantes',
            dataCuentaSize: { $size: '$detalleComprobantes' }
          }
        },
        matchCuentasMovimientos,
        { $sort: { cuentaCodigo: 1 } }
      ]
    })
    return { dataCuentas }
  } catch (e) {
    console.log(e)
    return e
  }
}
export async function dataBalanceComprobacion ({ clienteId, periodoId, fecha, nivel, cuentaSinMovimientos }) {
  const fechaInit = moment(fecha).startOf('month').toDate()
  const fechaEnd = moment(fecha).endOf('month').toDate()
  const detalleComprobanteCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
  // const matchSinMovimientos = cuentaSinMovimientos ? {} : { $match: { debe: { $gt: 0 }, haber: { $gt: 0 } } }
  try {
    const dataCuentas = await agreggateCollectionsSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { nivelCuenta: { $lte: nivel } } },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            let: { cuentaCodigo: { $concat: ['^', '$codigo', '.*$'] }, nivelCuenta: '$nivelCuenta' },
            pipeline: [
              {
                $match: {
                  // periodoId: new ObjectId(periodoId),
                  // fecha: { $gte: fechaInit, $lte: fechaEnd },
                  $expr:
                    {
                      $and:
                      [
                        { $eq: ['$periodoId', new ObjectId(periodoId)] },
                        { $gte: ['$fecha', fechaInit] },
                        { $lte: ['$fecha', fechaEnd] },
                        { $ne: ['$isPreCierre', true] },
                        { $ne: ['$isCierre', true] },
                        {
                          $regexMatch:
                          {
                            input: '$cuentaCodigo',
                            regex: '$$cuentaCodigo',
                            options: 'm'
                          }
                        }
                      ]
                    }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              },
              {
                $project: {
                  debe: '$debe',
                  haber: '$haber',
                  saldo: { $subtract: ['$debe', '$haber'] }
                }
              }
            ],
            as: 'detalleComprobantes'
          }
        },
        { $unwind: { path: '$detalleComprobantes', preserveNullAndEmptyArrays: cuentaSinMovimientos } },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            let: { cuentaCodigo: { $concat: ['^', '$codigo', '.*$'] }, nivelCuenta: '$nivelCuenta' },
            pipeline: [
              {
                $match: {
                  // periodoId: new ObjectId(periodoId),
                  // fecha: { $gte: fechaInit, $lte: fechaEnd },
                  $expr:
                    {
                      $and:
                      [
                        { $eq: ['$periodoId', new ObjectId(periodoId)] },
                        { $lte: ['$fecha', fechaInit] },
                        { $ne: ['$isPreCierre', true] },
                        { $ne: ['$isCierre', true] },
                        {
                          $regexMatch:
                          {
                            input: '$cuentaCodigo',
                            regex: '$$cuentaCodigo',
                            options: 'm'
                          }
                        }
                      ]
                    }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              },
              {
                $project: {
                  debe: '$debe',
                  haber: '$haber',
                  saldo: { $subtract: ['$debe', '$haber'] }
                }
              }
            ],
            as: 'saldoAnterior'
          }
        },
        { $unwind: { path: '$saldoAnterior', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            let: { cuentaCodigo: { $concat: ['^', '$codigo', '.*$'] }, nivelCuenta: '$nivelCuenta' },
            pipeline: [
              {
                $match: {
                  // periodoId: new ObjectId(periodoId),
                  // fecha: { $gte: fechaInit, $lte: fechaEnd },
                  $expr:
                    {
                      $and:
                      [
                        { $eq: ['$periodoId', new ObjectId(periodoId)] },
                        { $eq: ['$isPreCierre', true] },
                        {
                          $regexMatch:
                          {
                            input: '$cuentaCodigo',
                            regex: '$$cuentaCodigo',
                            options: 'm'
                          }
                        }
                      ]
                    }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              },
              {
                $project: {
                  debe: '$debe',
                  haber: '$haber',
                  saldo: { $subtract: ['$debe', '$haber'] }
                }
              }
            ],
            as: 'saldosIniciales'
          }
        },
        { $unwind: { path: '$saldosIniciales', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$_id',
            codigo: { $first: '$codigo' },
            descripcion: { $first: '$descripcion' },
            nivelCuenta: { $first: '$nivelCuenta' },
            saldoAnterior: { $sum: { $cond: { if: { $eq: ['$nivelCuenta', nivel] }, then: '$saldoAnterior.saldo', else: 0 } } },
            debe: { $sum: { $cond: { if: { $eq: ['$nivelCuenta', nivel] }, then: '$detalleComprobantes.debe', else: 0 } } },
            haber: { $sum: { $cond: { if: { $eq: ['$nivelCuenta', nivel] }, then: '$detalleComprobantes.haber', else: 0 } } },
            saldo: { $sum: { $cond: { if: { $eq: ['$nivelCuenta', nivel] }, then: '$detalleComprobantes.saldo', else: 0 } } },
            saldosIniciales: { $sum: { $cond: { if: { $eq: ['$nivelCuenta', nivel] }, then: '$saldosIniciales.saldo', else: 0 } } }
          }
        },
        {
          $project: {
            codigo: 1,
            descripcion: 1,
            nivelCuenta: 1,
            saldoAnterior: 1,
            debe: 1,
            haber: 1,
            saldo: { $sum: ['$saldoAnterior', '$saldosIniciales', '$saldo'] },
            preSaldo: '$saldo'
          }
        },
        { $sort: { codigo: 1 } }
      ]
    })
    return { dataCuentas }
  } catch (e) {
    console.log(e)
    return e
  }
}
export async function dataComprobantes ({ clienteId, periodoId, order, comprobanteDesde, comprobanteHasta }) {
  try {
    let matchLimitComprobantes = []
    const fechaInit = moment(comprobanteDesde?.mesPeriodo, 'YYYY/MM').startOf('month').toDate()
    const fechaEnd = moment(comprobanteHasta?.mesPeriodo, 'YYYY/MM').endOf('month').toDate()
    if (comprobanteDesde && !comprobanteHasta) {
      console.log(1)
      matchLimitComprobantes =
        {
          codigoToInt: { $gte: Number(comprobanteDesde.codigo) },
          periodoMes: { $gte: fechaInit }
        }
    } else if (!comprobanteDesde && comprobanteHasta) {
      console.log(2)
      matchLimitComprobantes =
        {
          codigoToInt: { $lte: Number(comprobanteHasta.codigo) },
          periodoMes: { $lte: fechaEnd }
        }
    } else if (comprobanteDesde && comprobanteHasta) {
      const [menor, mayor] = [comprobanteDesde.codigo, comprobanteHasta.codigo].sort((a, b) => Number(a) - Number(b))

      matchLimitComprobantes =
        {
          codigoToInt: { $gte: Number(menor), $lte: Number(mayor) },
          periodoMes: { $gte: fechaInit, $lte: fechaEnd }
        }
    }
    const sort = order === 'documento' ? { $sort: { documento: 1 } } : { $sort: { fecha: 1 } }
    const detalleComprobanteCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
    const comprobantes = await agreggateCollectionsSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match:
          {
            periodoId: new ObjectId(periodoId)
          }
        },
        {
          $addFields: {
            codigoToInt: { $toInt: '$codigo' },
            periodoMes: {
              $dateFromString:
              { dateString: { $concat: [{ $replaceAll: { input: '$mesPeriodo', find: '/', replacement: '-' } }, '-05'] } }
            }

          }
        },
        { $match: { ...matchLimitComprobantes } },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'comprobanteId',
            pipeline: [
              sort,
              {
                $group: {
                  _id: '$comprobanteId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' },
                  dataCuenta: {
                    $push: {
                      periodoId: '$periodoId',
                      cuentaId: '$cuentaId',
                      cuentaCodigo: '$cuentaCodigo',
                      cuentaNombre: '$cuentaNombre',
                      fecha: '$fecha',
                      documento: '$docReferenciaAux',
                      descripcion: '$descripcion',
                      debe: '$debe',
                      haber: '$haber',
                      tercero: '$terceroNombre'
                    }
                  }
                }
              }
            ],
            as: 'detalleComprobantes'
          }
        },
        { $unwind: { path: '$detalleComprobantes', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            codigo: 1,
            codigoToInt: 1,
            mesPeriodo: 1,
            nombre: 1,
            periodoMes: 1,
            debe: '$detalleComprobantes.debe',
            haber: '$detalleComprobantes.haber',
            detalleComprobantes: '$detalleComprobantes.dataCuenta'
          }
        }
      ]
    })
    console.log({matchLimitComprobantes})
    return ({ comprobantes })
  } catch (e) {
    console.log(e)
    return e
  }
}
export async function dataLibroDiario ({ clienteId, periodoId, fecha, nivel, cuentaSinMovimientos }) {
  const fechaInit = moment(fecha).startOf('month').toDate()
  const fechaEnd = moment(fecha).endOf('month').toDate()
  const detalleComprobanteCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
  // const matchSinMovimientos = cuentaSinMovimientos ? {} : { $match: { debe: { $gt: 0 }, haber: { $gt: 0 } } }
  try {
    const dataCuentas = await agreggateCollectionsSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { nivelCuenta: { $lte: nivel } } },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            let: { cuentaCodigo: { $concat: ['^', '$codigo', '.*'] }, nivelCuenta: '$nivelCuenta' },
            pipeline: [
              {
                $match: {
                  // periodoId: new ObjectId(periodoId),
                  // fecha: { $gte: fechaInit, $lte: fechaEnd },
                  $expr:
                    {
                      $and:
                      [
                        { $eq: ['$periodoId', new ObjectId(periodoId)] },
                        { $gte: ['$fecha', fechaInit] },
                        { $lte: ['$fecha', fechaEnd] },
                        {
                          $regexMatch:
                          {
                            input: '$cuentaCodigo',
                            regex: '$$cuentaCodigo',
                            options: 'm'
                          }
                        }
                      ]
                    }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              },
              {
                $project: {
                  debe: '$debe',
                  haber: '$haber',
                  saldo: { $subtract: ['$debe', '$haber'] }
                }
              }
            ],
            as: 'detalleComprobantes'
          }
        },
        { $unwind: { path: '$detalleComprobantes', preserveNullAndEmptyArrays: cuentaSinMovimientos } },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'cuentaId',
            let: { cuentaCodigo: { $concat: ['^', '$codigo', '.*'] }, nivelCuenta: '$nivelCuenta' },
            pipeline: [
              {
                $match: {
                  // periodoId: new ObjectId(periodoId),
                  // fecha: { $gte: fechaInit, $lte: fechaEnd },
                  $expr:
                    {
                      $and:
                      [
                        { $eq: ['$periodoId', new ObjectId(periodoId)] },
                        { $lte: ['$fecha', fechaInit] },
                        {
                          $regexMatch:
                          {
                            input: '$cuentaCodigo',
                            regex: '$$cuentaCodigo',
                            options: 'm'
                          }
                        }
                      ]
                    }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              },
              {
                $project: {
                  debe: '$debe',
                  haber: '$haber',
                  saldo: { $subtract: ['$debe', '$haber'] }
                }
              }
            ],
            as: 'saldoAnterior'
          }
        },
        { $unwind: { path: '$saldoAnterior', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$_id',
            codigo: { $first: '$codigo' },
            descripcion: { $first: '$descripcion' },
            nivelCuenta: { $first: '$nivelCuenta' },
            saldoAnterior: { $sum: '$saldoAnterior.saldo' },
            debe: { $sum: '$detalleComprobantes.debe' },
            haber: { $sum: '$detalleComprobantes.haber' },
            saldo: { $sum: '$detalleComprobantes.saldo' }
          }
        },
        {
          $project: {
            codigo: 1,
            descripcion: 1,
            nivelCuenta: 1,
            saldoAnterior: 1,
            debe: 1,
            haber: 1,
            saldo: '$saldo',
            preSaldo: '$saldo'
          }
        },
        { $sort: { codigo: 1 } }
      ]
    })
    return { dataCuentas }
  } catch (e) {
    console.log(e)
    return e
  }
}
export async function dataLibroMayor ({ clienteId, periodoId, fecha, nivel, cuentaSinMovimientos }) {
  const fechaInit = moment(fecha).startOf('month').toDate()
  const fechaEnd = moment(fecha).endOf('month').toDate()
  const detalleComprobanteCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
  // const matchSinMovimientos = cuentaSinMovimientos ? {} : { $match: { debe: { $gt: 0 }, haber: { $gt: 0 } } }
  try {
    const dataCuentas = await agreggateCollectionsSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { nivelCuenta: { $lte: nivel } } },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            let: { cuentaCodigo: { $concat: ['^', '$codigo', '.*'] }, nivelCuenta: '$nivelCuenta' },
            pipeline: [
              {
                $match: {
                  // periodoId: new ObjectId(periodoId),
                  // fecha: { $gte: fechaInit, $lte: fechaEnd },
                  $expr:
                    {
                      $and:
                      [
                        { $eq: ['$periodoId', new ObjectId(periodoId)] },
                        { $gte: ['$fecha', fechaInit] },
                        { $lte: ['$fecha', fechaEnd] },
                        { $ne: ['$isPreCierre', true] },
                        { $ne: ['$isCierre', true] },
                        {
                          $regexMatch:
                          {
                            input: '$cuentaCodigo',
                            regex: '$$cuentaCodigo',
                            options: 'm'
                          }
                        }
                      ]
                    }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              },
              {
                $project: {
                  debe: '$debe',
                  haber: '$haber',
                  saldo: { $subtract: ['$debe', '$haber'] }
                }
              }
            ],
            as: 'detalleComprobantes'
          }
        },
        { $unwind: { path: '$detalleComprobantes', preserveNullAndEmptyArrays: cuentaSinMovimientos } },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'cuentaId',
            let: { cuentaCodigo: { $concat: ['^', '$codigo', '.*'] }, nivelCuenta: '$nivelCuenta' },
            pipeline: [
              {
                $match: {
                  // periodoId: new ObjectId(periodoId),
                  // fecha: { $gte: fechaInit, $lte: fechaEnd },
                  $expr:
                    {
                      $and:
                      [
                        { $eq: ['$periodoId', new ObjectId(periodoId)] },
                        { $lte: ['$fecha', fechaInit] },
                        { $ne: ['$isPreCierre', true] },
                        { $ne: ['$isCierre', true] },
                        {
                          $regexMatch:
                          {
                            input: '$cuentaCodigo',
                            regex: '$$cuentaCodigo',
                            options: 'm'
                          }
                        }
                      ]
                    }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              },
              {
                $project: {
                  debe: '$debe',
                  haber: '$haber',
                  saldo: { $subtract: ['$debe', '$haber'] }
                }
              }
            ],
            as: 'saldoAnterior'
          }
        },
        { $unwind: { path: '$saldoAnterior', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'cuentaId',
            let: { cuentaCodigo: { $concat: ['^', '$codigo', '.*'] }, nivelCuenta: '$nivelCuenta' },
            pipeline: [
              {
                $match: {
                  // periodoId: new ObjectId(periodoId),
                  // fecha: { $gte: fechaInit, $lte: fechaEnd },
                  $expr:
                    {
                      $and:
                      [
                        { $eq: ['$periodoId', new ObjectId(periodoId)] },
                        { $eq: ['$isPreCierre', true] },
                        {
                          $regexMatch:
                          {
                            input: '$cuentaCodigo',
                            regex: '$$cuentaCodigo',
                            options: 'm'
                          }
                        }
                      ]
                    }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              },
              {
                $project: {
                  debe: '$debe',
                  haber: '$haber',
                  saldo: { $subtract: ['$debe', '$haber'] }
                }
              }
            ],
            as: 'saldosIniciales'
          }
        },
        { $unwind: { path: '$saldosIniciales', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$_id',
            codigo: { $first: '$codigo' },
            descripcion: { $first: '$descripcion' },
            nivelCuenta: { $first: '$nivelCuenta' },
            saldoAnterior: { $sum: '$saldoAnterior.saldo' },
            debe: { $sum: '$detalleComprobantes.debe' },
            haber: { $sum: '$detalleComprobantes.haber' },
            saldo: { $sum: '$detalleComprobantes.saldo' },
            saldosIniciales: { $sum: '$saldosIniciales.saldo' }
          }
        },
        {
          $project: {
            codigo: 1,
            descripcion: 1,
            nivelCuenta: 1,
            saldoAnterior: 1,
            debe: 1,
            haber: 1,
            saldo: { $sum: ['$saldoAnterior', '$saldosIniciales', '$saldo'] },
            preSaldo: '$saldo'
          }
        },
        { $sort: { codigo: 1 } }
      ]
    })
    return { dataCuentas }
  } catch (e) {
    console.log(e)
    return e
  }
}
export async function datosESF ({ clienteId, periodoId, fecha, nivel, cuentaSinMovimientos }) {
  const ajustesContables = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'contable' } })
  const cuentaISLR = ajustesContables?.cuentaISLR || ''
  const cuentaIdEjercicioActual = ajustesContables?.cuentaSuperAvitOperdidaActual || ''
  const regexOr = '^(1|2|3)'
  const fechaEnd = moment(fecha).endOf('month').toDate()
  const detalleComprobanteCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
  // const matchSinMovimientos = cuentaSinMovimientos ? {} : { $match: { debe: { $gt: 0 }, haber: { $gt: 0 } } }
  try {
    const dataCuentas = await agreggateCollectionsSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match:
          { nivelCuenta: { $lte: nivel }, codigo: { $regex: regexOr, $options: 'i' } }
        },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            let: { cuentaCodigo: { $concat: ['^', '$codigo', '.*'] } },
            pipeline: [
              {
                $match: {
                  // periodoId: new ObjectId(periodoId),
                  // fecha: { $gte: fechaInit, $lte: fechaEnd },
                  $expr:
                    {
                      $and:
                      [
                        { $eq: ['$periodoId', new ObjectId(periodoId)] },
                        // { $gte: ['$fecha', fechaInit] },
                        { $lte: ['$fecha', fechaEnd] },
                        {
                          $regexMatch:
                          {
                            input: '$cuentaCodigo',
                            regex: '$$cuentaCodigo',
                            options: 'm'
                          }
                        }
                      ]
                    }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              },
              {
                $project: {
                  debe: '$debe',
                  haber: '$haber',
                  saldo: { $subtract: ['$debe', '$haber'] }
                }
              }
            ],
            as: 'detalleComprobantes'
          }
        },
        { $unwind: { path: '$detalleComprobantes', preserveNullAndEmptyArrays: cuentaSinMovimientos } },
        {
          $group: {
            _id: '$_id',
            codigo: { $first: '$codigo' },
            descripcion: { $first: '$descripcion' },
            nivelCuenta: { $first: '$nivelCuenta' },
            debe: { $sum: '$detalleComprobantes.debe' },
            haber: { $sum: '$detalleComprobantes.haber' },
            saldo: { $sum: '$detalleComprobantes.saldo' }
          }
        },
        { $sort: { codigo: 1 } }
      ]
    })
    if (!cuentaIdEjercicioActual) return { dataCuentas }
    const regexEjercicoActual = '^(4|5|6|7)'
    const dataEjercicoActual = await agreggateCollectionsSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            nivelCuenta: { $eq: nivel },
            $or: [
              { codigo: { $regex: regexEjercicoActual, $options: 'i' } },
              { _id: new ObjectId(cuentaISLR) }
            ]
          }
        },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'cuentaId',
            let: { cuentaCodigo: { $concat: ['^', '$codigo', '.*'] } },
            pipeline: [
              {
                $match: {
                  periodoId: new ObjectId(periodoId),
                  fecha: { $lte: fechaEnd }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              },
              {
                $project: {
                  debe: '$debe',
                  haber: '$haber',
                  saldo: { $subtract: ['$debe', '$haber'] }
                }
              }
            ],
            as: 'detalleComprobantes'
          }
        },
        { $unwind: { path: '$detalleComprobantes' } },
        {
          $group: {
            _id: 0,
            saldo: {
              $sum: '$detalleComprobantes.saldo'
            }
          }
        }
      ]
    })
    const cuentaEjercicioActual = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(cuentaIdEjercicioActual) } })
    cuentaEjercicioActual.saldo = dataEjercicoActual[0]?.saldo || 0
    // buscar cuentas grupos de la cuenta del ejercicio
    const grupos = []
    let grupoActual = cuentaEjercicioActual.codigo
    let i = 0
    while (grupoActual.length > 1) {
      const padre = getParentCode(grupoActual)
      grupoActual = padre
      grupos.push(padre)
      i++
      if (i > 10) break
    }
    const cuentasPadreEjercicioActual = await getCollectionSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { codigo: { $in: grupos } } })
    const noExisten = []
    const dataCuentasbyCodigo = dataCuentas.reduce((acc, cur) => {
      acc[cur.codigo] = cur
      return acc
    }, {})
    for (const cuenta of cuentasPadreEjercicioActual) {
      const existeCuenta = dataCuentasbyCodigo[cuenta.codigo]
      if (existeCuenta) existeCuenta.saldo += cuentaEjercicioActual.saldo
      else noExisten.push({ ...cuenta, saldo: cuentaEjercicioActual.saldo })
    }
    const existeCuenta = dataCuentasbyCodigo[cuentaEjercicioActual.codigo]
    if (existeCuenta) existeCuenta.saldo += cuentaEjercicioActual.saldo
    else noExisten.push(cuentaEjercicioActual)
    if (noExisten.length > 0) {
      dataCuentas.push(...noExisten)
      dataCuentas.sort((a, b) => a.codigo.localeCompare(b.codigo))
    }
    return { dataCuentas }
  } catch (e) {
    console.log(e)
    return e
  }
}
export async function datosER ({ clienteId, periodoId, fechaDesde, fechaHasta, nivel, cuentaSinMovimientos, ajusteFecha }) {
  const cuentasNoValidas = (await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'contable' } })).grupoESF
  const arrayGroupESF = ['1', '2', '3', '4', '5', '6', '7', '8', '9'].filter(e => !cuentasNoValidas.includes(e))
  const regexOr = `^(${arrayGroupESF.join('|')})`
  const fechaInit = moment(fechaDesde).startOf('month').toDate()
  const fechaEnd = moment(fechaHasta).endOf('month').toDate()
  const detalleComprobanteCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
  // const matchSinMovimientos = cuentaSinMovimientos ? {} : { $match: { debe: { $gt: 0 }, haber: { $gt: 0 } } }
  try {
    const dataCuentas = await agreggateCollectionsSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match:
          { nivelCuenta: { $lte: nivel }, codigo: { $regex: regexOr, $options: 'i' } }
        },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            let: { cuentaCodigo: { $concat: ['^', '$codigo', '.*'] }, nivelCuenta: '$nivelCuenta' },
            pipeline: [
              {
                $match: {
                  // periodoId: new ObjectId(periodoId),
                  // fecha: { $gte: fechaInit, $lte: fechaEnd },
                  $expr:
                    {
                      $and:
                      [
                        { $eq: ['$periodoId', new ObjectId(periodoId)] },
                        { $gte: ['$fecha', fechaInit] },
                        { $lte: ['$fecha', fechaEnd] },
                        {
                          $regexMatch:
                          {
                            input: '$cuentaCodigo',
                            regex: '$$cuentaCodigo',
                            options: 'm'
                          }
                        }
                      ]
                    }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                  // data: { $push: '$$ROOT' }
                }
              },
              {
                $project: {
                  debe: '$debe',
                  haber: '$haber',
                  saldo: { $subtract: ['$debe', '$haber'] }
                }
              }
            ],
            as: 'detalleComprobantes'
          }
        },
        { $unwind: { path: '$detalleComprobantes', preserveNullAndEmptyArrays: cuentaSinMovimientos } },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'cuentaId',
            let: { cuentaCodigo: { $concat: ['^', '$codigo', '.*'] }, nivelCuenta: '$nivelCuenta' },
            pipeline: [
              {
                $match: {
                  // periodoId: new ObjectId(periodoId),
                  // fecha: { $gte: fechaInit, $lte: fechaEnd },
                  $expr:
                    {
                      $and:
                      [
                        { $eq: ['$periodoId', new ObjectId(periodoId)] },
                        { $lte: ['$fecha', fechaInit] },
                        {
                          $regexMatch:
                          {
                            input: '$cuentaCodigo',
                            regex: '$$cuentaCodigo',
                            options: 'm'
                          }
                        }
                      ]
                    }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              },
              {
                $project: {
                  debe: '$debe',
                  haber: '$haber',
                  saldo: { $subtract: ['$debe', '$haber'] }
                }
              }
            ],
            as: 'saldoAnterior'
          }
        },
        { $unwind: { path: '$saldoAnterior', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$_id',
            codigo: { $first: '$codigo' },
            descripcion: { $first: '$descripcion' },
            nivelCuenta: { $first: '$nivelCuenta' },
            saldoAnterior: { $sum: '$saldoAnterior.saldo' },
            debe: { $sum: '$detalleComprobantes.debe' },
            haber: { $sum: '$detalleComprobantes.haber' },
            saldo: { $sum: '$detalleComprobantes.saldo' }
            // data: { $first: '$detalleComprobantes.data' }
          }
        },
        {
          $project: {
            codigo: 1,
            descripcion: 1,
            nivelCuenta: 1,
            saldoAnterior: 1,
            debe: 1,
            haber: 1,
            // data: 1,
            // saldo: { $subtract: ['$saldoAnterior', '$saldo'] },
            saldo: '$saldo'
          }
        },
        { $sort: { codigo: 1 } }
      ]
    })
    return { dataCuentas }
  } catch (e) {
    console.log(e)
    return e
  }
}
