import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, deleteManyItemsSD, getCollectionSD } from './dataBaseConfing.js'

export const updateManyDetalleComprobante = async ({ clienteId, plancuentas = [] }) => {
  // buscamos los periodos activos para poder actualizar solo los detalles de los periodos activos
  const periodosActivos = await agreggateCollectionsSD({
    nameCollection: 'periodos',
    enviromentClienteId: clienteId,
    pipeline: [
      { $match: { activo: true } }
    ]
  })
  const periodosId = periodosActivos.map(e => new ObjectId(e._id))
  const filters = plancuentas[0] ? { _id: { $in: plancuentas.map(e => new ObjectId(e._id)) } } : {}
  const cuentas = await getCollectionSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters })
  const bulkWrite = cuentas.map(e => {
    return {
      updateMany: {
        filter: {
          periodoId: { $in: periodosId },
          cuentaId: new ObjectId(e._id)
        },
        update: {
          $set: {
            cuentaCodigo: e.cuentaCodigo,
            cuentaNombre: e.cuentaNombre
          }
        }
      }
    }
  })
  await bulkWriteSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, pipeline: bulkWrite })
}

export const deleteCuentasForChangeLevel = async ({ clienteId, plancuentas = [] }) => {
  const cuentasErrors = []
  try {
    const periodosActivos = await getCollectionSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { activo: true } }).map(e => e._id)
    for (const cuenta of plancuentas) {
      const detallesComprobantes = await getCollectionSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, filters: { cuentaId: new ObjectId(cuenta._id), periodoId: { $in: periodosActivos } } })
      if (detallesComprobantes) cuentasErrors.push(`La cuenta ${cuenta.codigoActual}-${cuenta.descripcion} posee movimientos en periodos activos`)
    }
    if (cuentasErrors[0]) throw new Error(cuentasErrors.join(', '))
    await deleteManyItemsSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { codigo: { $in: plancuentas.map(e => String(e.codigoActual).replace(/[.|,]/g, '')) } } })
  } catch (e) {
    console.log(e)
    return e
  }
}
