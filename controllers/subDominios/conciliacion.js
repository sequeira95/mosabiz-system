import moment from 'moment'
import { agreggateCollectionsSD, bulkWriteSD, deleteManyItemsSD, formatCollectionName, getItemSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'
import { subDominioName } from '../../constants.js'

export const getListCuentas = async (req, res) => {
  const { clienteId, tipoCuenta } = req.body
  const tercerosCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'terceros' })
  try {
    const cuentas = await agreggateCollectionsSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            conciliacion: tipoCuenta
          }
        },
        {
          $lookup:
            {
              from: `${tercerosCollectionName}`,
              localField: '_id',
              foreignField: 'cuentaId',
              as: 'terceros'
            }
        }
      ]
    })
    return res.status(200).json({ cuentas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de buscar la lista de ${tipoCuenta} ${e.message}` })
  }
}
export const movimientosBancos = async (req, res) => {
  const { clienteId, cuentaId, fecha } = req.body
  try {
    const movimientosBancariosCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'estadoBancarios' })
    const movimientoEstadosSinConciliar = await agreggateCollectionsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            cuentaId: new ObjectId(cuentaId),
            fecha: { $gte: moment(fecha, 'MM/YYYY').startOf('month').toDate(), $lte: moment(fecha, 'MM/YYYY').endOf('month').toDate() }
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
            movimientosBancarios: { $lte: 0 }
          }
        }
      ]
    })
    const detalleComprobantesCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
    const movimientosBancariosSinConciliar = await agreggateCollectionsSD({
      nameCollection: 'estadoBancarios',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            cuentaId: new ObjectId(cuentaId),
            periodoMensual: fecha // { $gte: moment(fecha, 'MM/YYYY').startOf('month').toDate(), $lte: moment(fecha, 'MM/YYYY').endOf('month').toDate() }
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
          $match: {
            movimientosEstado: { $lte: 0 }
          }
        }
      ]
    })
    return res.status(200).json({ movimientosBancariosSinConciliar, movimientoEstadosSinConciliar })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de buscar los movimientos bancarios y del estado financiero${e.message}` })
  }
}
export const movimientosCP = async (req, res) => {
  const { clienteId, cuentaId, periodo, tercero } = req.body
  console.log({ body: req.body })
  let match = {}
  if (tercero && tercero[0]?._id === 'todos') {
    match = {
      cuentaId: new ObjectId(cuentaId),
      periodoId: new ObjectId(periodo)
    }
  } else if (tercero && tercero[0]?._id === 'sinAsignar' && !tercero[1]) {
    match = {
      cuentaId: new ObjectId(cuentaId),
      periodoId: new ObjectId(periodo),
      terceroId: { $in: ['', null, undefined] }
    }
  } else {
    const indexSinAsignar = tercero.findIndex(e => e._id === 'sinAsignar')
    const matchTerceros =
    indexSinAsignar >= 0 ? { $or: [{ terceroId: { $in: tercero.filter(i => i._id !== 'sinAsignar').map(e => new ObjectId(e._id)) } }, { terceroId: { $in: ['', null, undefined] } }] } : { terceroId: { $in: tercero.filter(i => i._id !== 'sinAsignar').map(e => new ObjectId(e._id)) } }
    match = {
      cuentaId: new ObjectId(cuentaId),
      periodoId: new ObjectId(periodo),
      ...matchTerceros
      // terceroId: { $in: tercero.filter(i => i._id !== 'sinAsignar').map(e => new ObjectId(e._id)) }
    }
  }
  if (tercero && tercero[0]) {
    try {
      /* const fechaInit = moment(fecha, 'MM/YYYY').startOf('month').toDate()
      const fechaEnd = moment(fecha, 'MM/YYYY').endOf('month').toDate() */
      const movimientosEstado = await agreggateCollectionsSD({
        nameCollection: 'detallesComprobantes',
        enviromentClienteId: clienteId,
        pipeline: [
          {
            $match: { ...match, isPreCierre: { $ne: true } }
          },
          {
            $group: {
              _id: {
                cuentaId: '$cuentaId',
                terceroId: '$terceroId'
              },
              debe: { $sum: '$debe' },
              haber: { $sum: '$haber' },
              ultimoMovimiento: { $last: '$fecha' },
              tercero: { $first: '$terceroNombre' }
            }
          },
          {
            $project:
            {
              _id: {
                cuentaId: '$_id.cuentaId',
                terceroId: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ['$_id.terceroId', ''] },
                        { $ne: ['$_id.terceroId', null] },
                        { $ne: ['$_id.terceroId', undefined] }
                      ]
                    },
                    then: '$_id.terceroId',
                    else: 'sinAsignar'
                  }
                }
              },
              monto: { $subtract: ['$debe', '$haber'] },
              ultimoMovimiento: '$ultimoMovimiento',
              tercero: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ['$_id.terceroId', ''] },
                      { $ne: ['$_id.terceroId', null] },
                      { $ne: ['$_id.terceroId', undefined] }
                    ]
                  },
                  then: '$tercero',
                  else: 'Sin asignar'
                }
              },
              debe: '$debe',
              haber: '$haber'
            }
          },
          {
            $match: { monto: { $lt: 0 } }
          }
        ]
      })
      const saldosIniciales = await getItemSD({
        nameCollection: 'detallesComprobantes',
        enviromentClienteId: clienteId,
        filters: { cuentaId: new ObjectId(cuentaId), isPreCierre: true, periodoId: new ObjectId(periodo) }
      })
      console.log({ saldosIniciales })
      if (saldosIniciales) {
        const indexMovimientos = movimientosEstado.findIndex(e => e.tercero === 'Sin asignar')
        if (indexMovimientos >= 0) {
          if (saldosIniciales.debe > 0) {
            movimientosEstado[indexMovimientos].debe += saldosIniciales.debe
            movimientosEstado[indexMovimientos].haber += saldosIniciales.haber
            movimientosEstado[indexMovimientos].monto += saldosIniciales.debe > 0 ? saldosIniciales.debe * (-1) : saldosIniciales.haber
          }
        } else {
          if (saldosIniciales.debe > 0) {
            movimientosEstado.push({
              _id: { cuentaId: saldosIniciales.cuentaId, terceroId: 'sinAsignar' },
              monto: saldosIniciales.debe > 0 ? saldosIniciales.debe * (-1) : saldosIniciales.haber,
              debe: saldosIniciales.debe,
              haber: saldosIniciales.haber,
              tercero: 'Sin asignar',
              ultimoMovimiento: saldosIniciales.fecha
            })
          }
        }
      }
      console.log({ movimientosEstado })
      return res.status(200).json({ movimientosEstado })
    } catch (e) {
      console.log(e)
      return res.status(500).json({ error: `Error de servidor al momento de buscar los movimientos bancarios y del estado financiero${e.message}` })
    }
  }
  /* try {
    const fechaInit = moment(fecha, 'MM/YYYY').startOf('month').toDate()
    const fechaEnd = moment(fecha, 'MM/YYYY').endOf('month').toDate()
    const movimientosEstado = await agreggateCollectionsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            cuentaId: new ObjectId(cuentaId),
            fecha: { $gte: fechaInit, $lte: fechaEnd }
          }
        },
        {
          $group: {
            _id: { cuentaId: '$cuentaId' },
            debe: { $sum: '$debe' },
            haber: { $sum: '$haber' },
            ultimoMovimiento: { $last: '$fecha' },
            cantTerceros: {
              $sum:
              {
                $cond:
                {
                  if:
                  {
                    $and:
                    [
                      { $ne: ['$terceroId', null] },
                      { $ne: ['$terceroId', ''] },
                      { $ne: ['$terceroId', undefined] }
                    ]
                  },
                  then: 1,
                  else: 0
                }
              }
            },
            tercero: { $first: '$terceroNombre' }
          }
        },
        {
          $project:
          {
            monto: { $subtract: ['$debe', '$haber'] },
            ultimoMovimiento: '$ultimoMovimiento',
            cantTerceros: '$cantTerceros',
            tercero: '$tercero',
            debe: '$debe',
            haber: '$haber'
          }
        },
        {
          $match: { monto: { $lt: 0 } }
        }
      ]
    })
    return res.status(200).json({ movimientosEstado })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de buscar los movimientos bancarios y del estado financiero${e.message}` })
  } */
}
export const movimientosCC = async (req, res) => {
  const { clienteId, cuentaId, periodo, tercero } = req.body
  let match = {}
  if (tercero && tercero[0]?._id === 'todos') {
    match = {
      cuentaId: new ObjectId(cuentaId),
      periodoId: new ObjectId(periodo)
    }
  } else if (tercero && tercero[0]?._id === 'sinAsignar' && !tercero[1]) {
    match = {
      cuentaId: new ObjectId(cuentaId),
      periodoId: new ObjectId(periodo),
      terceroId: { $in: ['', null, undefined] }
    }
  } else {
    const indexSinAsignar = tercero.findIndex(e => e._id === 'sinAsignar')
    const matchTerceros =
    indexSinAsignar >= 0 ? { $or: [{ terceroId: { $in: tercero.filter(i => i._id !== 'sinAsignar').map(e => new ObjectId(e._id)) } }, { terceroId: { $in: ['', null, undefined] } }] } : { terceroId: { $in: tercero.filter(i => i._id !== 'sinAsignar').map(e => new ObjectId(e._id)) } }
    match = {
      cuentaId: new ObjectId(cuentaId),
      periodoId: new ObjectId(periodo),
      ...matchTerceros
    }
  }
  if (tercero && tercero[0]) {
    try {
      const movimientosEstado = await agreggateCollectionsSD({
        nameCollection: 'detallesComprobantes',
        enviromentClienteId: clienteId,
        pipeline: [
          {
            $match: { ...match, isPreCierre: { $ne: true } }
          },
          {
            $group: {
              _id: {
                cuentaId: '$cuentaId',
                terceroId: '$terceroId'
              },
              debe: { $sum: '$debe' },
              haber: { $sum: '$haber' },
              ultimoMovimiento: { $last: '$fecha' },
              tercero: { $first: '$terceroNombre' }
            }
          },
          {
            $project:
            {
              _id: {
                cuentaId: '$_id.cuentaId',
                terceroId: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ['$_id.terceroId', ''] },
                        { $ne: ['$_id.terceroId', null] },
                        { $ne: ['$_id.terceroId', undefined] }
                      ]
                    },
                    then: '$_id.terceroId',
                    else: 'sinAsignar'
                  }
                }
              },
              monto: { $subtract: ['$debe', '$haber'] },
              ultimoMovimiento: '$ultimoMovimiento',
              tercero: {
                $cond: {
                  if: {
                    $and: [
                      { $ne: ['$_id.terceroId', ''] },
                      { $ne: ['$_id.terceroId', null] },
                      { $ne: ['$_id.terceroId', undefined] }
                    ]
                  },
                  then: '$tercero',
                  else: 'Sin asignar'
                }
              },
              debe: '$debe',
              haber: '$haber'
            }
          },
          {
            $match: { monto: { $gt: 0 } }
          }
        ]
      })
      const saldosIniciales = await getItemSD({
        nameCollection: 'detallesComprobantes',
        enviromentClienteId: clienteId,
        filters: { cuentaId: new ObjectId(cuentaId), isPreCierre: true, periodoId: new ObjectId(periodo) }
      })
      console.log({ saldosIniciales })
      if (saldosIniciales) {
        const indexMovimientos = movimientosEstado.findIndex(e => e.tercero === 'Sin asignar')
        if (indexMovimientos >= 0) {
          if (saldosIniciales.haber > 0) {
            movimientosEstado[indexMovimientos].debe += saldosIniciales.debe
            movimientosEstado[indexMovimientos].haber += saldosIniciales.haber
            movimientosEstado[indexMovimientos].monto += saldosIniciales.haber > 0 ? saldosIniciales.haber : saldosIniciales.debe
          }
        } else {
          if (saldosIniciales.haber > 0) {
            movimientosEstado.push({
              _id: { cuentaId: saldosIniciales.cuentaId, terceroId: 'sinAsignar' },
              monto: saldosIniciales.haber > 0 ? saldosIniciales.haber : saldosIniciales.debe,
              debe: saldosIniciales.debe,
              haber: saldosIniciales.haber,
              tercero: 'Sin asignar',
              ultimoMovimiento: saldosIniciales.fecha
            })
          }
        }
      }
      return res.status(200).json({ movimientosEstado })
    } catch (e) {
      console.log(e)
      return res.status(500).json({ error: `Error de servidor al momento de buscar los movimientos bancarios y del estado financiero ${e.message}` })
    }
  }
}

export const gastosBancariosSinConciliar = async (req, res) => {
  const { clienteId, cuentas, periodo, tipoCuenta } = req.body
  const detalleComprobantesCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
  try {
    const match = cuentas && cuentas[0]?._id === 'todos' ? { periodoId: new ObjectId(periodo) } : { cuentaId: { $in: cuentas.map(e => new ObjectId(e._id)) }, periodoId: new ObjectId(periodo) }
    let matchTipoCuenta = {}
    if (tipoCuenta === 'cp') matchTipoCuenta = { monto: { $lt: 0 } }
    if (tipoCuenta === 'cc') matchTipoCuenta = { monto: { $gt: 0 } }
    const movimientosSinConciliar = await agreggateCollectionsSD({
      nameCollection: 'estadoBancarios',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: { ...match, ...matchTipoCuenta }
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
            cuentaNombre: '$cuentaNombre',
            ref: '$ref',
            descripcion: '$descripcion',
            periodoMensual: '$periodoMensual',
            fecha: '$fecha',
            monto: { $abs: '$monto' },
            movimientosEstado: { $size: '$movimientosEstado' }
          }
        },
        {
          $match: {
            movimientosEstado: { $lte: 0 }
          }
        }
      ]
    })
    return res.status(200).json({ movimientosSinConciliar })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de buscar los movimientos bancarios y del estado financiero${e.message}` })
  }
}
export const movimientosBancariosConciliados = async (req, res) => {
  const { clienteId, cuentaId, fecha } = req.body
  try {
    const movimientosBancariosCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'estadoBancarios' })
    const movimientoEstadosConciliados = await agreggateCollectionsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            cuentaId: new ObjectId(cuentaId),
            fecha: { $gte: moment(fecha, 'MM/YYYY').startOf('month').toDate(), $lte: moment(fecha, 'MM/YYYY').endOf('month').toDate() }
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
        }
      ]
    })
    return res.status(200).json({ movimientoEstadosConciliados })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de buscar los movimientos bancarios y del estado financiero${e.message}` })
  }
}
export const saveToExcelMocimientosBancarios = async (req, res) => {
  const { clienteId, movimientos } = req.body
  if (!movimientos || (Array.isArray(movimientos) && !movimientos[0])) return res.status(500).json({ error: 'Error de servidor al momento de guardar la lista de movimientos bancarios' })
  try {
    const movimientosFormat = movimientos.map(e => {
      /* return {
        monto: Number(e.monto),
        descripcion: String(e.descripcion),
        fecha: moment(e.fecha, 'YYYY/MM/DD').toDate(),
        ref: String(e.ref),
        cuentaId: new ObjectId(e.cuentaId),
        periodoMensual: e.periodoMensual
      } */
      return {
        updateOne: {
          filter: { periodoMensual: e.periodoMensual, ref: String(e.ref), descripcion: String(e.descripcion), periodoId: new ObjectId(e.periodoId) },
          update: {
            $set: {
              cuentaId: new ObjectId(e.cuentaId),
              cuentaNombre: e.cuentaNombre,
              monto: Number(e.monto),
              fecha: moment(e.fecha, 'YYYY/MM/DD').toDate()
            }
          },
          upsert: true
        }
      }
    })
    await bulkWriteSD({ nameCollection: 'estadoBancarios', enviromentClienteId: clienteId, pipeline: movimientosFormat })
    // await createManyItemsSD({ nameCollection: 'estadoBancarios', enviromentClienteId: clienteId, items: movimientosFormat })
    return res.status(200).json({ message: 'Lista de movimientos bancarios guardada correctamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de guardar la lista de movimientos bancarios ${e.message}` })
  }
}

export const deleteMovimientoBancario = async (req, res) => {
  const { periodoMensual, cuentaId, clienteId } = req.body
  try {
    await deleteManyItemsSD({ nameCollection: 'estadoBancarios', enviromentClienteId: clienteId, filters: { periodoMensual, cuentaId: new ObjectId(cuentaId) } })
    return res.status(200).json({ message: 'Lista de movimientos bancarios eliminada correctamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de eliminar la lista de movimientos bancarios ${e.message}` })
  }
}
export const detalleMovimientos = async (req, res) => {
  const { clienteId, detalleMovimiento } = req.body
  const match = detalleMovimiento._id?.terceroId !== 'sinAsignar' ? { terceroId: new ObjectId(detalleMovimiento._id.terceroId) } : { cuentaId: new ObjectId(detalleMovimiento._id.cuentaId), terceroId: { $in: ['', null, undefined] } }
  try {
    const comprobantesCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'comprobantes' })
    const movimientos = await agreggateCollectionsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: match },
        {
          $lookup:
            {
              from: `${comprobantesCollectionName}`,
              localField: 'comprobanteId',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    nombreComprobante: { $concat: ['$mesPeriodo', '-', '$codigo', ' ', '$nombre'] }
                  }
                }
              ],
              as: 'comprobante'
            }
        },
        { $unwind: { path: '$comprobante', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            cantidad: '$cantidad',
            comprobanteId: '$comprobanteId',
            cuentaCodigo: '$cuentaCodigo',
            cuentaId: '$cuentaId',
            cuentaNombre: '$cuentaNombre',
            debe: '$debe',
            descripcion: '$descripcion',
            docReferenciaAux: '$docReferenciaAux',
            fecha: '$fecha',
            fechaDolar: '$fechaDolar',
            haber: '$haber',
            monedaPrincipal: '$monedaPrincipal',
            monedasUsar: '$monedasUsar',
            periodoId: '$periodoId',
            tasa: '$tasa',
            terceroId: '$terceroId',
            terceroNombre: '$terceroNombre',
            nombreComprobante: '$comprobante.nombreComprobante'
          }
        }
      ]
    })
    return res.status(200).json({ movimientos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de buscar los movimientos del estado financiero${e.message}` })
  }
}
