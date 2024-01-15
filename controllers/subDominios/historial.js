import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, formatCollectionName } from '../../utils/dataBaseConfing.js'
import { subDominioName } from '../../constants.js'
export const getHistorial = async (req, res) => {
  const { clienteId, productoId, tipo } = req.body
  console.log(req.body)
  try {
    const personasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const historial = await agreggateCollectionsSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { idProducto: new ObjectId(productoId), tipo } },
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
    console.log(historial)
    return res.status(200).json({ historial })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtner datos del historial de cambios' + e.message })
  }
}
