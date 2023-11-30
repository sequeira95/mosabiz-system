import moment from 'moment'
import { agreggateCollectionsSD, bulkWriteSD, deleteManyItemsSD, formatCollectionName } from '../../utils/dataBaseConfing.js'
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
          $project:
          {
            ref: '$docReferenciaAux',
            descripcion: '$descripcion',
            fecha: '$fecha',
            monto: { $cond: { if: { $gt: ['$debe', 0] }, then: '$debe', else: '$haber' } },
            cuentaId: '$cuentaId'
          }
        }
      ]
    })
    const movimientosBancarios = await agreggateCollectionsSD({
      nameCollection: 'estadoBancarios',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            cuentaId: new ObjectId(cuentaId),
            fecha: { $gte: fechaInit, $lte: fechaEnd }
          }
        }
      ]
    })
    const movimientosConciliados = []
    const movimientosNoConciliados = []
    if (movimientosBancarios[0] && movimientosEstado[0]) {
      for (const movimiento of movimientosBancarios) {
        const movimientoBancario = movimientosEstado.find(e => e.ref === movimiento.ref && e.monto === movimiento.monto && e.descripcion === movimiento.descripcion)
        if (movimientoBancario) {
          movimientosConciliados.push(movimiento)
        } else {
          movimientosNoConciliados.push(movimiento)
        }
      }
    }
    return res.status(200).json({ movimientosEstado, movimientosBancarios, movimientosConciliados, movimientosNoConciliados })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de buscar los movimientos bancarios y del estado financiero${e.message}` })
  }
}
export const movimientosCP = async (req, res) => {
  const { clienteId, cuentaId, fecha } = req.body
  try {
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
          $project:
          {
            ref: '$docReferenciaAux',
            descripcion: '$descripcion',
            fecha: '$fecha',
            terceroId: '$terceroId',
            terceroNombre: '$terceroNombre',
            monto: { $cond: { if: { $gt: ['$debe', 0] }, then: '$debe', else: '$haber' } },
            cuentaId: '$cuentaId'
          }
        }
      ]
    })
    return res.status(200).json({ movimientosEstado })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de buscar los movimientos bancarios y del estado financiero${e.message}` })
  }
}
export const gastosBancariosSinConciliar = async (req, res) => {
  const { clienteId, cuentaId, fecha } = req.body
  const detalleComprobantesCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
  try {
    const movimientosSinConciliar = await agreggateCollectionsSD({
      nameCollection: 'estadoBancarios',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            cuentaId: new ObjectId(cuentaId),
            fecha: { $gte: moment(fecha, 'MM/YYYY').startOf('month').toDate(), $lte: moment(fecha, 'MM/YYYY').endOf('month').toDate() }
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
                            { $eq: ['$monto', '$$monto'] }
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
    return res.status(200).json({ movimientosSinConciliar })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de buscar los movimientos bancarios y del estado financiero${e.message}` })
  }
}
export const saveToExcelMocimientosBancarios = async (req, res) => {
  const { clienteId, movimientos } = req.body
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
          filter: { periodoMensual: e.periodoMensual, ref: String(e.ref), descripcion: String(e.descripcion) },
          update: {
            $set: {
              cuentaId: new ObjectId(e.cuentaId),
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
