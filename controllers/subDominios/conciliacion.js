import moment from 'moment'
import { agreggateCollectionsSD, bulkWriteSD, deleteManyItemsSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'

export const getListCuentas = async (req, res) => {
  const { clienteId, tipoCuenta } = req.body
  try {
    const cuentas = await agreggateCollectionsSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            conciliacion: tipoCuenta
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
