import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, formatCollectionName } from '../../utils/dataBaseConfing.js'
import { subDominioName } from '../../constants.js'
export const getHistorial = async (req, res) => {
  const { clienteId, productoId, tipo, idMovimiento } = req.body
  let matchTipo = {}
  if (productoId) matchTipo = { idProducto: new ObjectId(productoId) }
  if (idMovimiento) matchTipo = { idMovimiento: new ObjectId(idMovimiento) }
  try {
    const personasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const historial = await agreggateCollectionsSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { ...matchTipo, tipo } },
        {
          $lookup: {
            from: personasCollection,
            localField: 'creadoPor',
            foreignField: 'usuarioId',
            as: 'detallePersona'
          }
        },
        { $unwind: { path: '$detallePersona', preserveNullAndEmptyArrays: true } }
      ]
    })
    return res.status(200).json({ historial })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtner datos del historial de cambios' + e.message })
  }
}
export const getHistorialCompra = async (req, res) => {
  const { clienteId, compraId } = req.body
  console.log(req.body, 1)
  try {
    const personasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const historial = await agreggateCollectionsSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { idMovimiento: new ObjectId(compraId) } },
        {
          $lookup: {
            from: personasCollection,
            localField: 'creadoPor',
            foreignField: 'usuarioId',
            as: 'detallePersona'
          }
        },
        { $unwind: { path: '$detallePersona', preserveNullAndEmptyArrays: true } }
      ]
    })
    return res.status(200).json({ historial })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtner datos del historial de cambios' + e.message })
  }
}
