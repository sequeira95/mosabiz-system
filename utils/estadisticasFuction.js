import moment from 'moment-timezone'
import { agreggateCollectionsSD, formatCollectionName, getItemSD } from './dataBaseConfing.js'
import { subDominioName, tiposDocumentosFiscales } from '../constants.js'

export const getDataEstadisticasComprasVentas = async ({ clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone }) => {
  try {
    const dataCompraVentaMonths = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fecha: { $gte: moment(dateInitYear).toDate(), $lte: moment(dataEnd).toDate() },
            tipoMovimiento: { $eq: 'venta' }
          }
        },
        {
          $group: {
            _id: { $month: '$fecha' },
            costoVentas: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoMovimiento', 'venta'] },
                  then: '$costoVentas',
                  else: 0
                }
              }
            },
            nccostoVentas: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipoMovimiento', 'venta'] },
                      { $eq: ['$tipoDocumentoFiscal', tiposDocumentosFiscales.notaCredito] }
                    ]
                  },
                  then: '$costoVentas',
                  else: 0
                }
              }
            },
            ndcostoVentas: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipoMovimiento', 'venta'] },
                      { $eq: ['$tipoDocumentoFiscal', tiposDocumentosFiscales.notaDebito] }
                    ]
                  },
                  then: '$costoVentas',
                  else: 0
                }
              }
            },
            ventas: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoMovimiento', 'venta'] },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            ncVentas: {
              $sum: {
                $cond: {
                  if: { $and: [{ $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumentoFiscal', tiposDocumentosFiscales.notaCredito] }] },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            ndVentas: {
              $sum: {
                $cond: {
                  if: { $and: [{ $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumentoFiscal', tiposDocumentosFiscales.notaDebito] }] },
                  then: '$baseImponible',
                  else: 0
                }
              }
            }
          }
        },
        {
          $project: {
            costoVentas: { $subtract: [{ $add: ['$costoVentas', '$ndcostoVentas'] }, '$nccostoVentas'] },
            ventas: { $subtract: [{ $add: ['$ventas', '$ndVentas'] }, '$ncVentas'] },
            utilidad: {
              $subtract: [
                { $subtract: [{ $add: ['$ventas', '$ndVentas'] }, '$ncVentas'] },
                { $subtract: [{ $add: ['$costoVentas', '$ndcostoVentas'] }, '$nccostoVentas'] }
              ]
            }
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]
    })
    const dataCompraVentaTotalYear = [] /* await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fecha: { $gte: moment(dateInitYear).toDate(), $lte: moment(dataEnd).toDate() },
            tipoMovimiento: { $in: ['compra', 'venta'] }
          }
        },
        {
          $group: {
            _id: null,
            compras: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoMovimiento', 'compra'] },
                  then: '$total',
                  else: 0
                }
              }
            },
            ventas: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoMovimiento', 'venta'] },
                  then: '$total',
                  else: 0
                }
              }
            }
          }
        },
        {
          $project: {
            compras: '$compras',
            ventas: '$ventas'
          }
        },
        {
          $sort: { compras: 1 }
        }
      ]
    }) */
    return { dataCompraVentaMonths, dataCompraVentaTotalYear }
  } catch (e) {
    return e
  }
}
export const getDataEstadisticasTransacciones = async ({ clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone }) => {
  try {
    const dataTransaccionesMonths = await agreggateCollectionsSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fechaPago: { $gte: moment(dateInitYear).toDate(), $lte: moment(dataEnd).toDate() },
            tipo: { $in: ['Ingreso', 'Egreso'] }
          }
        },
        {
          $group: {
            _id: { $month: '$fechaPago' },
            ingresos: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      { $eq: ['$tipo', 'Ingreso'] },
                      // { $eq: ['$tipo', 'venta'] }
                    ]
                  },
                  then: '$pago',
                  else: 0
                }
              }
            },
            egresos: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      /* {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] }
                        ]
                      }, */
                      { $eq: ['$tipo', 'Egreso'] },
                      // { $eq: ['$tipo', 'compra'] }
                    ]
                  },
                  then: '$pago',
                  else: 0
                }
              }
            }
          }
        },
        {
          $project: {
            ingresos: '$ingresos',
            egresos: '$egresos'
          }
        },
        {
          $sort: { _id: 1 }
        }
      ]
    })
    const dataTransaccionesTotalYear = []/* await agreggateCollectionsSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fechaPago: { $gte: moment(dateInitYear).toDate(), $lte: moment(dataEnd).toDate() },
            // tipo: { $in: ['compra', 'venta', 'Ingreso', 'Egreso'] }
          }
        },
        {
          $group: {
            _id: null,
            ingresos: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      { $eq: ['$tipo', 'Ingreso'] },
                      { $eq: ['$tipo', 'venta'] }
                    ]
                  },
                  then: '$pago',
                  else: 0
                }
              }
            },
            egresos: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.devolucion] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipo', 'venta'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] }
                        ]
                      },
                      { $eq: ['$tipo', 'Egreso'] },
                      { $eq: ['$tipo', 'compra'] }
                    ]
                  },
                  then: '$pago',
                  else: 0
                }
              }
            }
          }
        },
        {
          $project: {
            ingresos: '$ingresos',
            egresos: '$egresos'
          }
        },
        {
          $sort: { ingresos: 1 }
        }
      ]
    }) */
    return { dataTransaccionesMonths, dataTransaccionesTotalYear }
  } catch (e) {
    return e
  }
}
export const getDataEstadisticasPosicionMonetaria = async ({ clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone, fechaACtual }) => {
  try {
    const tiposMovimientosUsar = [
      tiposDocumentosFiscales.factura,
      tiposDocumentosFiscales.notaDebito,
      'Nota de entrega'
    ]
    const ajusteCompras = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'compras' } })
    const ajusteVentas = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'ventas' } })
    const rangos = validarRangos(ajusteCompras?.rangoFechaVencimiento, ajusteVentas?.rangoFechaVencimiento)
    // console.log({ rangos })
    const groupRangos = {}
    const projectRangos = {}
    const rangosLength = rangos.length
    // console.log({ rangosLength })
    const rangosEjexString = []
    if (rangos && rangos[0]) {
      for (const index in rangos) {
        // console.log(index, rangos[index])
        const indexNumber = Number(index)
        projectRangos[`rango${indexNumber}`] = 1
        if (indexNumber === 0) {
          rangosEjexString.push(`< ${rangos[index]}`)
          // console.log('entramos')
          groupRangos[`rango${indexNumber}`] = {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $lt: ['$diasDiferencia', rangos[indexNumber]] }
                  ]
                },
                then: {
                  $subtract: [
                    '$total',
                    {
                      $add: [
                        { $ifNull: ['$detalleTransacciones.totalAbono', 0] }, { $ifNull: ['$documentosAsociados.totalNotaCredito', 0] },
                        { $ifNull: ['$documentosAsociados.totalIva', 0] }, { $ifNull: ['$devoluciones.totalDevolucion', 0] }, { $ifNull: ['$documentosAsociados.totalIslr', 0] }
                      ]
                    }
                  ]
                },
                else: 0
              }
            }
          }
          continue
        }
        if (indexNumber === rangosLength - 1) {
          rangosEjexString.push(`${rangos[index]} >`)
          groupRangos[`rango${indexNumber}`] = {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $gte: ['$diasDiferencia', rangos[indexNumber]] }
                  ]
                },
                then: {
                  $subtract: [
                    '$total',
                    {
                      $add: [
                        { $ifNull: ['$detalleTransacciones.totalAbono', 0] }, { $ifNull: ['$documentosAsociados.totalNotaCredito', 0] },
                        { $ifNull: ['$documentosAsociados.totalIva', 0] }, { $ifNull: ['$devoluciones.totalDevolucion', 0] }, { $ifNull: ['$documentosAsociados.totalIslr', 0] }
                      ]
                    }
                  ]
                },
                else: 0
              }
            }
          }
          continue
        }
        rangosEjexString.push(`< ${rangos[index]}`)
        groupRangos[`rango${indexNumber}`] = {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $gte: ['$diasDiferencia', rangos[indexNumber]] },
                  { $lt: ['$diasDiferencia', rangos[indexNumber + 1]] }
                ]
              },
              then: {
                $subtract: [
                  '$total',
                  {
                    $add: [
                      { $ifNull: ['$detalleTransacciones.totalAbono', 0] }, { $ifNull: ['$documentosAsociados.totalNotaCredito', 0] },
                      { $ifNull: ['$documentosAsociados.totalIva', 0] }, { $ifNull: ['$devoluciones.totalDevolucion', 0] }, { $ifNull: ['$documentosAsociados.totalIslr', 0] }
                    ]
                  }
                ]
              },
              else: 0
            }
          }
        }
      }
    }
    // console.log({ 0: groupRangos.rango0.$sum.$cond.if.$and[1], 1: groupRangos.rango1.$sum.$cond.if.$and[1], 2: groupRangos.rango2.$sum.$cond.if.$and[1], 3: groupRangos.rango3.$sum.$cond.if.$and[1], 4: groupRangos.rango4.$sum.$cond.if.$and[1] })
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const transaccionesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'transacciones' })
    const dataDocumentos = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fecha: { $lte: moment(dataEnd).toDate() },
            estado: { $ne: 'pagada' },
            tipoMovimiento: { $in: ['compra', 'venta'] },
            tipoDocumento: { $in: tiposMovimientosUsar }
            // tipo: { $in: ['compra', 'venta', 'Ingreso', 'Egreso'] }
          }
        },
        {
          $addFields: {
            diasDiferencia: {
              $dateDiff: {
                startDate: { $dateFromString: { dateString: moment(fechaACtual).format('YYYY-MM-DD') } },
                endDate: { $dateFromString: { dateString: { $dateToString: { format: '%Y-%m-%d', date: '$fechaVencimiento' } } } },
                unit: 'day'
              }
            }
          }
        },
        { $sort: { fechaVencimiento: 1 } },
        {
          $lookup: {
            from: transaccionesCollection,
            localField: '_id',
            foreignField: 'documentoId',
            pipeline: [
              { $match: { fechaPago: { $lte: moment(dataEnd).endOf('day').toDate() } } },
              {
                $group: {
                  _id: '$documentoId',
                  totalAbono: { $sum: '$pago' },
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
              { $match: { tipoDocumento: { $nin: tiposMovimientosUsar } } },
              {
                $group: {
                  _id: 0,
                  totalNotaCredito: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                        then: '$toda',
                        else: 0
                      }
                    }
                  },
                  totalIslr: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.retIslr] },
                        then: '$totalRetenido',
                        else: 0
                      }
                    }
                  },
                  totalIva: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.retIva] },
                        then: '$totalRetenido',
                        else: 0
                      }
                    }
                  }
                }
              }
            ],
            as: 'documentosAsociados'
          }
        },
        { $unwind: { path: '$documentosAsociados', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'notaEntregaAsociada',
            pipeline: [
              {
                $group: {
                  _id: 0,
                  totalDevolucion: {
                    $sum: '$total'
                  }
                }
              }
            ],
            as: 'devoluciones'
          }
        },
        { $unwind: { path: '$devoluciones', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$tipoMovimiento',
            total: { $sum: '$total' },
            totalAbono: { $sum: '$detalleTransacciones.totalAbono' },
            totalNotaCredito: { $sum: '$documentosAsociados.totalNotaCredito' },
            totalIslr: { $sum: '$documentosAsociados.totalIslr' },
            totalIva: { $sum: '$documentosAsociados.totalIva' },
            totalDevolucion: { $sum: '$devoluciones.totalDevolucion' },
            ...groupRangos
          }
        },
        {
          $project: {
            saldo: {
              $subtract: [
                '$total',
                {
                  $add: ['$totalAbono', '$totalNotaCredito', '$totalIva', '$totalDevolucion', '$totalIslr']
                }
              ]
            },
            ...projectRangos
          }
        },
      ]
    })
    const year = moment(dataEnd).year()
    const mees = moment(dataEnd).month()
    const conciliacionTesoreria = await agreggateCollectionsSD({
      nameCollection: 'conciliacionTesoreria',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            year: Number(year),
            mes: mees + 1
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$saldoFinal' }
          }
        }
      ]
    })
    if (conciliacionTesoreria[0]) {
      dataDocumentos.push({
        _id: 'disponible',
        saldo: conciliacionTesoreria[0].total
      })
    }
    return { dataDocumentos, rangosEjexString }
  } catch (e) {
    return e
  }
}
function validarRangos (rango1, rango2) {
  if (!rango1 && !rango2) { throw new Error('Por favor seleccione un rango en los ajustes de compra o venta') }
  const arrayRango1 = rango1 ? [rango1, rango1 * 2, rango1 * 3] : []
  const arrayRango2 = rango2 ? [rango2, rango2 * 2, rango2 * 3] : []
  if (!rango1) return arrayRango2
  if (!rango2) return arrayRango1
  const sonIguales = rango1 === rango2
  if (sonIguales) return [rango1, rango1 * 2, rango1 * 3]
  const menorRango = rango1 < rango2 ? arrayRango1 : arrayRango2
  const mayorRango = rango1 < rango2 ? arrayRango2 : arrayRango1
  const umbralProximidad = 1
  return [...menorRango, ...mayorRango].filter((val, index, arr) => (index === 0 || val - arr[index - 1] > umbralProximidad)).sort((a, b) => a - b)
}
export const getDataAntiguedadCuentas = async ({ clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone, fechaACtual }) => {
  try {
    const tiposMovimientosUsar = [
      tiposDocumentosFiscales.factura,
      tiposDocumentosFiscales.notaDebito,
      'Nota de entrega'
    ]
    const caluclosRango2 = { $add: ['$menorDiferencia', { $floor: { $divide: [{ $subtract: ['$mayorDiferencia', '$menorDiferencia'] }, 3] } }] }
    const caluclosRango3 = { $add: ['$menorDiferencia', { $floor: { $multiply: [{ $divide: [{ $subtract: ['$mayorDiferencia', '$menorDiferencia'] }, 3] }, 2] } }] }
    const dataDocumentos = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fecha: { $lte: moment(dataEnd).toDate() },
            estado: { $ne: 'pagada' },
            tipoMovimiento: { $in: ['compra', 'venta'] },
            tipoDocumento: { $in: tiposMovimientosUsar }
          }
        },
        {
          $project: {
            tipoMovimiento: 1,
            diasDiferencia: {
              $dateDiff: {
                startDate: { $dateFromString: { dateString: moment(fechaACtual).format('YYYY-MM-DD') } },
                endDate: { $dateFromString: { dateString: { $dateToString: { format: '%Y-%m-%d', date: '$fechaVencimiento' } } } },
                unit: 'day'
              }
            }
          }
        },
        {
          $setWindowFields: {
            partitionBy: null,
            sortBy: { diasDiferencia: 1 },
            output: { menorDiferencia: { $min: '$diasDiferencia' }, mayorDiferencia: { $max: '$diasDiferencia' } }
          }
        },
        {
          $project: {
            tipoMovimiento: 1,
            diasDiferencia: 1,
            menorDiferencia: 1,
            mayorDiferencia: 1,
            rango2: caluclosRango2,
            rango3: caluclosRango3
          }
        },
        {
          $group: {
            _id: '$tipoMovimiento',
            menorDiferencia: { $first: '$menorDiferencia' },
            mayorDiferencia: { $first: '$mayorDiferencia' },
            dataRango2: { $first: '$rango2' },
            dataRango3: { $first: '$rango3' },
            rango1: {
              $sum: {
                $cond: {
                  if: { $lt: ['$diasDiferencia', '$menorDiferencia'] },
                  then: 1,
                  else: 0
                }
              }
            },
            rango2: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ['$diasDiferencia', '$menorDiferencia'] },
                      { $lt: ['$diasDiferencia', '$rango2'] }
                    ]
                  },
                  then: 1,
                  else: 0
                }
              }
            },
            rango3: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $gte: ['$diasDiferencia', '$rango2'] },
                      { $lt: ['$diasDiferencia', '$rango3'] }
                    ]
                  },
                  then: 1,
                  else: 0
                }
              }
            },
            rango4: {
              $sum: {
                $cond: {
                  if: { $gte: ['$diasDiferencia', '$rango3'] },
                  then: 1,
                  else: 0
                }
              }
            }
          }
        }
        /* {
          $group: {
            _id: null,
            menorDiferencia: { $min: '$diasDiferencia' },
            mayorDiferencia: { $max: '$diasDiferencia' }
          }
        } */
      ]
    })
    /* const menorDiferencia = dataDocumentos[0].menorDiferencia || 0
    const mayorDiferencia = dataDocumentos[0].mayorDiferencia || 0
    const rango2 = menorDiferencia + Math.floor((mayorDiferencia - menorDiferencia) / 3)
    const rango3 = menorDiferencia + Math.floor(2 * (mayorDiferencia - menorDiferencia) / 3)
    console.log({ menorDiferencia, mayorDiferencia, rango2, rango3 })
    const dataVencimientos = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fecha: { $lte: moment(dataEnd).toDate() },
            estado: { $ne: 'pagada' },
            tipoMovimiento: { $in: ['compra', 'venta'] },
            tipoDocumento: { $in: tiposMovimientosUsar }
          }
        },
        {
          $project: {
            _id: 0,
            tipoMovimiento: 1,
            diasDiferencia: {
              $dateDiff: {
                startDate: { $dateFromString: { dateString: moment(fechaACtual).format('YYYY-MM-DD') } },
                endDate: { $dateFromString: { dateString: { $dateToString: { format: '%Y-%m-%d', date: '$fechaVencimiento' } } } },
                unit: 'day'
              }
            }
          }
        },
        {
          $group: {
            _id: '$tipoMovimiento',
            menorDiferencia: { $min: '$diasDiferencia' },
            mayorDiferencia: { $max: '$diasDiferencia' },
            rango1: {
              $push: {
                $cond: {
                  if: { $lte: ['$diasDiferencia', menorDiferencia] },
                  then: '$$ROOT',
                  else: '$$REMOVE'
                }
              }
            },
            rango2: {
              $push: {
                $cond: {
                  if: { $and: [{ $gte: ['$diasDiferencia', menorDiferencia] }, { $lte: ['$diasDiferencia', rango2] }] },
                  then: '$$ROOT',
                  else: '$$REMOVE'
                }
              }
            },
            rango3: {
              $push: {
                $cond: {
                  if: { $and: [{ $gte: ['$diasDiferencia', rango2] }, { $lte: ['$diasDiferencia', rango3] }] },
                  then: '$$ROOT',
                  else: '$$REMOVE'
                }
              }
            },
            rango4: {
              $push: {
                $cond: {
                  if: { $and: [{ $gte: ['$diasDiferencia', rango3] }, { $lte: ['$diasDiferencia', mayorDiferencia] }] },
                  then: '$$ROOT',
                  else: '$$REMOVE'
                }
              }
            }
          }
        }
        }
      ]
    })
    console.log({ dataVencimientos }) */
    return { dataDocumentos }
  } catch (e) {
    return e
  }
}
