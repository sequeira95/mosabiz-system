import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, deleteItemSD, deleteManyItemsSD, formatCollectionName, updateItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment'
import { subDominioName } from '../../constants.js'

export const getProveedores = async (req, res) => {
  const { clienteId } = req.body
  try {
    const metodosPagosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'metodosPagos' })
    const bancosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'bancos' })
    const proveedores = await agreggateCollectionsSD({
      nameCollection: 'proveedores',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $lookup: {
            from: metodosPagosCollection,
            localField: '_id',
            foreignField: 'proveedorId',
            pipeline: [
              {
                $lookup: {
                  from: bancosCollection,
                  localField: 'banco',
                  foreignField: '_id',
                  pipeline: [
                    { $project: { nombre: 1 } }
                  ],
                  as: 'detalleBanco'
                }
              },
              { $unwind: { path: '$detalleBanco', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  bancoId: '$banco',
                  banco: '$detalleBanco.nombre',
                  numeroCuenta: 1,
                  identificacion: 1,
                  telefono: 1,
                  proveedorId: 1
                }
              }
            ],
            as: 'metodosPagos'
          }
        }
      ]
    })
    return res.status(200).json({ proveedores })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la liste del I.V.A ' + e.message })
  }
}
export const saveProveedor = async (req, res) => {
  console.log(req.body)
  const { clienteId, proveedor, metodosPago } = req.body
  try {
    if (!proveedor._id) {
      const saveProveedor = await upsertItemSD({
        nameCollection: 'proveedores',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(proveedor._id) },
        update: {
          $set: {
            tipoDocumento: proveedor.tipoDocumento,
            documentoIdentidad: proveedor.documentoIdentidad,
            razonSocial: proveedor.razonSocial,
            contacto: proveedor.contacto,
            telefono: proveedor.telefono,
            direccion: proveedor.direccion,
            formaPago: proveedor.formaPago,
            credito: proveedor.credito ? Number(proveedor.credito) : null,
            duracionCredito: proveedor.duracionCredito ? Number(proveedor.duracionCredito) : null,
            moneda: proveedor.moneda ? new ObjectId(proveedor.moneda) : null,
            fechaCreacion: moment().toDate()
          }
        }
      })
      const metodosPagoBulk = metodosPago.map(e => {
        return {
          updateOne: {
            filter: { _id: new ObjectId(e._id) },
            update: {
              $set: {
                banco: new ObjectId(e.banco._id),
                numeroCuenta: e.numeroCuenta,
                identificacion: e.identificacion,
                telefono: e.telefono,
                proveedorId: saveProveedor._id
              }
            },
            upsert: true
          }
        }
      })
      bulkWriteSD({ nameCollection: 'metodosPagos', enviromentClienteId: clienteId, pipeline: metodosPagoBulk })
      return res.status(200).json({ status: 'Proveedor guardado exitosamente', proveedor: saveProveedor })
    }
    const saveProveedor = await updateItemSD({
      nameCollection: 'proveedores',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(proveedor._id) },
      update: {
        $set: {
          tipoDocumento: proveedor.tipoDocumento,
          documentoIdentidad: proveedor.documentoIdentidad,
          razonSocial: proveedor.razonSocial,
          contacto: proveedor.contacto,
          telefono: proveedor.telefono,
          direccion: proveedor.direccion,
          formaPago: proveedor.formaPago,
          credito: proveedor.credito ? Number(proveedor.credito) : null,
          duracionCredito: proveedor.duracionCredito ? Number(proveedor.duracionCredito) : null,
          moneda: proveedor.moneda ? new ObjectId(proveedor.moneda) : null
        }
      }
    })
    const metodosPagoBulk = metodosPago.map(e => {
      return {
        updateOne: {
          filter: { _id: new ObjectId(e._id) },
          update: {
            $set: {
              banco: new ObjectId(e.banco._id),
              numeroCuenta: e.numeroCuenta,
              identificacion: e.identificacion,
              telefono: e.telefono,
              proveedorId: saveProveedor._id
            }
          },
          upsert: true
        }
      }
    })
    bulkWriteSD({ nameCollection: 'metodosPagos', enviromentClienteId: clienteId, pipeline: metodosPagoBulk })
    return res.status(200).json({ status: 'Proveedor guardado exitosamente', proveedor: saveProveedor })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar este proveedor' + e.message })
  }
}
export const deleteProveedor = async (req, res) => {
  const { clienteId, _id } = req.body
  try {
    await deleteItemSD({ nameCollection: 'proveedores', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    deleteManyItemsSD({ nameCollection: 'metodosPagos', enviromentClienteId: clienteId, filters: { proveedorId: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Proveedor eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar este proveedor ' + e.message })
  }
}
