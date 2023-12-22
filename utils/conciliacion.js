import { ObjectId } from 'mongodb'
import { subDominioName } from '../constants.js'
import { agreggateCollectionsSD, formatCollectionName } from './dataBaseConfing.js'
import moment from 'moment'

export const conciliacionBancosContabilidad = async ({ clienteId, fecha, cuentaId, itemsPorPagina, pagina }) => {
  const movimientosBancariosCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'estadoBancarios' })
  const movimientoEstadosSinConciliar = await agreggateCollectionsSD({
    nameCollection: 'detallesComprobantes',
    enviromentClienteId: clienteId,
    pipeline: [
      {
        $match: {
          cuentaId: new ObjectId(cuentaId),
          fecha: { $gte: moment(fecha, 'YYYY/MM').startOf('month').toDate(), $lte: moment(fecha, 'YYYY/MM').endOf('month').toDate() }
        }
      },
      {
        $project: {
          cuentaId: '$cuentaId',
          docReferenciaAux: '$docReferenciaAux',
          descripcion: '$descripcion',
          fecha: '$fecha',
          debe: '$debe',
          haber: '$haber',
          monto: { $cond: { if: { $gt: ['$debe', 0] }, then: '$debe', else: '$haber' } }
        }
      },
      {
        $lookup:
          {
            from: `${movimientosBancariosCollectionName}`,
            localField: 'cuentaId',
            foreignField: 'cuentaId',
            let:
              { ref: '$docReferenciaAux', descripcion: '$descripcion', monto: '$monto' },
            pipeline: [
              {
                $match:
                  {
                    $expr:
                    {
                      $and:
                        [
                          { $eq: ['$ref', '$$ref'] },
                          { $eq: [{ $abs: '$monto' }, { $abs: '$$monto' }] }
                        ]
                    }
                  }
              },
              {
                $project: {
                  ref: '$ref',
                  descripcion: '$descripcion',
                  fecha: '$fecha',
                  monto: '$monto',
                  cuentaId: '$cuentaId'
                }
              }
            ],
            as: 'movimientosBancarios'
          }
      },
      {
        $project: {
          cuentaId: '$cuentaId',
          ref: '$docReferenciaAux',
          descripcion: '$descripcion',
          fecha: '$fecha',
          monto: '$monto',
          debe: '$debe',
          haber: '$haber',
          movimientosBancarios: { $size: '$movimientosBancarios' }
        }
      },
      {
        $sort:
        {
          fecha: 1
        }
      },
      {
        $match: {
          movimientosBancarios: { $lte: 0 }
        }
      },
      { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
      { $limit: Number(itemsPorPagina) }
    ]
  })
  const cantidadMovimientosEstados = await agreggateCollectionsSD({
    nameCollection: 'detallesComprobantes',
    enviromentClienteId: clienteId,
    pipeline: [
      {
        $match: {
          cuentaId: new ObjectId(cuentaId),
          fecha: { $gte: moment(fecha, 'YYYY/MM').startOf('month').toDate(), $lte: moment(fecha, 'YYYY/MM').endOf('month').toDate() }
        }
      },
      {
        $project: {
          cuentaId: '$cuentaId',
          docReferenciaAux: '$docReferenciaAux',
          descripcion: '$descripcion',
          fecha: '$fecha',
          debe: '$debe',
          haber: '$haber',
          monto: { $cond: { if: { $gt: ['$debe', 0] }, then: '$debe', else: '$haber' } }
        }
      },
      {
        $lookup:
          {
            from: `${movimientosBancariosCollectionName}`,
            localField: 'cuentaId',
            foreignField: 'cuentaId',
            let:
              { ref: '$docReferenciaAux', descripcion: '$descripcion', monto: '$monto' },
            pipeline: [
              {
                $match:
                  {
                    $expr:
                    {
                      $and:
                        [
                          { $eq: ['$ref', '$$ref'] },
                          { $eq: [{ $abs: '$monto' }, { $abs: '$$monto' }] }
                        ]
                    }
                  }
              },
              {
                $project: {
                  ref: '$ref',
                  descripcion: '$descripcion',
                  fecha: '$fecha',
                  monto: '$monto',
                  cuentaId: '$cuentaId'
                }
              }
            ],
            as: 'movimientosBancarios'
          }
      },
      {
        $project: {
          cuentaId: '$cuentaId',
          ref: '$docReferenciaAux',
          descripcion: '$descripcion',
          fecha: '$fecha',
          monto: '$monto',
          debe: '$debe',
          haber: '$haber',
          movimientosBancarios: { $size: '$movimientosBancarios' }
        }
      },
      {
        $match: {
          movimientosBancarios: { $lte: 0 }
        }
      },
      {
        $count: 'cantidad'
      }
    ]
  })
  return {
    movimientoEstadosSinConciliar,
    cantidadMovimientosEstados: cantidadMovimientosEstados[0]?.cantidad
  }
}
export const conciliacionBancosEstadosBancarios = async ({ clienteId, fecha, cuentaId, itemsPorPagina, pagina }) => {
  const detalleComprobantesCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
  const movimientosBancariosSinConciliar = await agreggateCollectionsSD({
    nameCollection: 'estadoBancarios',
    enviromentClienteId: clienteId,
    pipeline: [
      {
        $match: {
          cuentaId: new ObjectId(cuentaId),
          fecha: { $gte: moment(fecha, 'YYYY/MM').startOf('month').toDate(), $lte: moment(fecha, 'YYYY/MM').endOf('month').toDate() }
        }
      },
      {
        $lookup:
          {
            from: `${detalleComprobantesCollectionName}`,
            localField: 'cuentaId',
            foreignField: 'cuentaId',
            let:
              { ref: '$ref', descripcion: '$descripcion', monto: '$monto' },
            pipeline: [
              {
                $match:
                  {
                    $expr:
                    {
                      $and:
                        [
                          { $eq: ['$descripcion', '$$descripcion'] },
                          { $eq: ['$docReferenciaAux', '$$ref'] }
                        ]
                    }
                  }
              },
              {
                $project: {
                  ref: '$docReferenciaAux',
                  descripcion: '$descripcion',
                  fecha: '$fecha',
                  monto: { $cond: { if: { $gt: ['$debe', 0] }, then: '$debe', else: '$haber' } },
                  cuentaId: '$cuentaId'
                }
              },
              {
                $match:
                  {
                    $expr:
                    {
                      $and:
                        [
                          { $eq: [{ $abs: '$monto' }, { $abs: '$$monto' }] }
                        ]
                    }
                  }
              }
            ],
            as: 'movimientosEstado'
          }
      },
      {
        $project: {
          cuentaId: '$cuentaId',
          ref: '$ref',
          descripcion: '$descripcion',
          periodoMensual: '$periodoMensual',
          fecha: '$fecha',
          monto: '$monto',
          movimientosEstado: { $size: '$movimientosEstado' }
        }
      },
      {
        $sort:
        {
          fecha: 1
        }
      },
      {
        $match: {
          movimientosEstado: { $lte: 0 }
        }
      },
      { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
      { $limit: Number(itemsPorPagina) }
    ]
  })
  const cantidadBancos = await agreggateCollectionsSD({
    nameCollection: 'estadoBancarios',
    enviromentClienteId: clienteId,
    pipeline: [
      {
        $match: {
          cuentaId: new ObjectId(cuentaId),
          fecha: { $gte: moment(fecha, 'YYYY/MM').startOf('month').toDate(), $lte: moment(fecha, 'YYYY/MM').endOf('month').toDate() }
        }
      },
      {
        $lookup:
          {
            from: `${detalleComprobantesCollectionName}`,
            localField: 'cuentaId',
            foreignField: 'cuentaId',
            let:
              { ref: '$ref', descripcion: '$descripcion', monto: '$monto' },
            pipeline: [
              {
                $match:
                  {
                    $expr:
                    {
                      $and:
                        [
                          { $eq: ['$descripcion', '$$descripcion'] },
                          { $eq: ['$docReferenciaAux', '$$ref'] }
                        ]
                    }
                  }
              },
              {
                $project: {
                  ref: '$docReferenciaAux',
                  descripcion: '$descripcion',
                  fecha: '$fecha',
                  monto: { $cond: { if: { $gt: ['$debe', 0] }, then: '$debe', else: '$haber' } },
                  cuentaId: '$cuentaId'
                }
              },
              {
                $match:
                  {
                    $expr:
                    {
                      $and:
                        [
                          { $eq: [{ $abs: '$monto' }, { $abs: '$$monto' }] }
                        ]
                    }
                  }
              }
            ],
            as: 'movimientosEstado'
          }
      },
      {
        $project: {
          cuentaId: '$cuentaId',
          ref: '$ref',
          descripcion: '$descripcion',
          periodoMensual: '$periodoMensual',
          fecha: '$fecha',
          monto: '$monto',
          movimientosEstado: { $size: '$movimientosEstado' }
        }
      },
      {
        $sort:
        {
          fecha: 1
        }
      },
      {
        $match: {
          movimientosEstado: { $lte: 0 }
        }
      },
      { $count: 'cantidad' }
    ]
  })
  return {
    movimientosBancariosSinConciliar,
    cantidadBancos: cantidadBancos[0]?.cantidad
  }
}
export const conciliacionBancosDatosConciliados = async ({ clienteId, fecha, cuentaId, itemsPorPagina, pagina }) => {
  const movimientosBancariosCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'estadoBancarios' })
  const movimientoEstadosConciliados = await agreggateCollectionsSD({
    nameCollection: 'detallesComprobantes',
    enviromentClienteId: clienteId,
    pipeline: [
      {
        $match: {
          cuentaId: new ObjectId(cuentaId),
          fecha: { $gte: moment(fecha, 'YYYY/MM').startOf('month').toDate(), $lte: moment(fecha, 'YYYY/MM').endOf('month').toDate() }
        }
      },
      {
        $project: {
          cuentaId: '$cuentaId',
          docReferenciaAux: '$docReferenciaAux',
          descripcion: '$descripcion',
          fecha: '$fecha',
          monto: { $cond: { if: { $gt: ['$debe', 0] }, then: '$debe', else: '$haber' } }
        }
      },
      {
        $lookup:
          {
            from: `${movimientosBancariosCollectionName}`,
            localField: 'cuentaId',
            foreignField: 'cuentaId',
            let:
              { ref: '$docReferenciaAux', descripcion: '$descripcion', monto: '$monto' },
            pipeline: [
              {
                $match:
                  {
                    $expr:
                    {
                      $and:
                        [
                          { $eq: ['$ref', '$$ref'] },
                          { $eq: [{ $abs: '$monto' }, { $abs: '$$monto' }] }
                        ]
                    }
                  }
              },
              {
                $project: {
                  ref: '$ref',
                  descripcion: '$descripcion',
                  fecha: '$fecha',
                  monto: '$monto',
                  cuentaId: '$cuentaId'
                }
              }
            ],
            as: 'movimientosBancarios'
          }
      },
      {
        $project: {
          cuentaId: '$cuentaId',
          ref: '$docReferenciaAux',
          descripcion: '$descripcion',
          fecha: '$fecha',
          monto: '$monto',
          movimientosBancarios: { $size: '$movimientosBancarios' }
        }
      },
      {
        $match: {
          movimientosBancarios: { $gt: 0 }
        }
      },
      { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
      { $limit: Number(itemsPorPagina) }
    ]
  })
  const cantidadConciliados = await agreggateCollectionsSD({
    nameCollection: 'detallesComprobantes',
    enviromentClienteId: clienteId,
    pipeline: [
      {
        $match: {
          cuentaId: new ObjectId(cuentaId),
          fecha: { $gte: moment(fecha, 'YYYY/MM').startOf('month').toDate(), $lte: moment(fecha, 'YYYY/MM').endOf('month').toDate() }
        }
      },
      {
        $project: {
          cuentaId: '$cuentaId',
          docReferenciaAux: '$docReferenciaAux',
          descripcion: '$descripcion',
          fecha: '$fecha',
          monto: { $cond: { if: { $gt: ['$debe', 0] }, then: '$debe', else: '$haber' } }
        }
      },
      {
        $lookup:
          {
            from: `${movimientosBancariosCollectionName}`,
            localField: 'cuentaId',
            foreignField: 'cuentaId',
            let:
              { ref: '$docReferenciaAux', descripcion: '$descripcion', monto: '$monto' },
            pipeline: [
              {
                $match:
                  {
                    $expr:
                    {
                      $and:
                        [
                          { $eq: ['$ref', '$$ref'] },
                          { $eq: [{ $abs: '$monto' }, { $abs: '$$monto' }] }
                        ]
                    }
                  }
              },
              {
                $project: {
                  ref: '$ref',
                  descripcion: '$descripcion',
                  fecha: '$fecha',
                  monto: '$monto',
                  cuentaId: '$cuentaId'
                }
              }
            ],
            as: 'movimientosBancarios'
          }
      },
      {
        $project: {
          cuentaId: '$cuentaId',
          ref: '$docReferenciaAux',
          descripcion: '$descripcion',
          fecha: '$fecha',
          monto: '$monto',
          movimientosBancarios: { $size: '$movimientosBancarios' }
        }
      },
      {
        $match: {
          movimientosBancarios: { $gt: 0 }
        }
      },
      { $count: 'cantidad' }
    ]
  })
  return { movimientoEstadosConciliados, cantidadConciliados: cantidadConciliados[0]?.cantidad }
}
