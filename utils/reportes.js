import moment from 'moment'
import { agreggateCollectionsSD, formatCollectionName } from './dataBaseConfing.js'
import { subDominioName } from '../constants.js'
import { ObjectId } from 'mongodb'

export async function mayorAnaliticosSinAgrupar ({ fechaDesde, fechaHasta, order, clienteId, periodoId, cuentaSinMovimientos, ajusteFecha }) {
  const fechaInit = moment(fechaDesde, ajusteFecha || 'YYYY/MM/DD').startOf('day').toDate()
  const fechaEnd = moment(fechaHasta, ajusteFecha || 'YYYY/MM/DD').endOf('day').toDate()
  const sort = order === 'documento' ? { $sort: { documento: 1 } } : { $sort: { fecha: 1 } }
  const detalleComprobanteCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
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
                  fecha: { $gte: fechaInit, $lte: fechaEnd }
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
                  fecha: { $lt: fechaInit }
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
          $project: {
            cuentaNombre: '$descripcion',
            cuentaCodigo: '$codigo',
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
export async function mayorAnaliticosAgrupado ({ fechaDesde, fechaHasta, order, clienteId, periodoId, cuentaSinMovimientos, ajusteFecha }) {
  const fechaInit = moment(fechaDesde, ajusteFecha || 'YYYY/MM/DD').startOf('day').toDate()
  const fechaEnd = moment(fechaHasta, ajusteFecha || 'YYYY/MM/DD').endOf('day').toDate()
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
                  fecha: { $gte: fechaInit, $lte: fechaEnd }
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
                        fecha: { $lte: fechaInit }
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
                $project: {
                  tercero: 1,
                  debe: 1,
                  haber: 1,
                  saldo: { $subtract: ['$debe', '$haber'] },
                  dataCuenta: 1,
                  saldoAnteriorTercero: { $subtract: ['$saldoAnteriorTercero.debe', '$saldoAnteriorTercero.haber'] }
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
                  fecha: { $lt: fechaInit }
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
          $project: {
            cuentaNombre: '$descripcion',
            cuentaCodigo: '$codigo',
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
  const fechaInit = moment(fecha, 'YYYY/MM').startOf('month').toDate()
  const fechaEnd = moment(fecha, 'YYYY/MM').endOf('month').toDate()
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
            saldoAnterior: { $sum: { $cond: { if: { $eq: ['$nivelCuenta', nivel] }, then: '$saldoAnterior.saldo', else: 0 } } },
            debe: { $sum: { $cond: { if: { $eq: ['$nivelCuenta', nivel] }, then: '$detalleComprobantes.debe', else: 0 } } },
            haber: { $sum: { $cond: { if: { $eq: ['$nivelCuenta', nivel] }, then: '$detalleComprobantes.haber', else: 0 } } },
            saldo: { $sum: { $cond: { if: { $eq: ['$nivelCuenta', nivel] }, then: '$detalleComprobantes.saldo', else: 0 } } }
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
            saldo: { $subtract: ['$saldoAnterior', '$saldo'] },
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
export async function dataComprobantes () {
}
