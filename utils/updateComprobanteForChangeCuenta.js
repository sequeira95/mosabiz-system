import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, getCollectionSD } from './dataBaseConfing.js'

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
  console.log(plancuentas)
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
