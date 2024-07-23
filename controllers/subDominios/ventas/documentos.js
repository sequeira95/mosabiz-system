import { ObjectId } from 'mongodb'
import { agreggateCollections, agreggateCollectionsSD, bulkWriteSD, createItemSD, createManyItemsSD, deleteItemSD, deleteManyItemsSD, formatCollectionName, getCollection, getCollectionSD, getItem, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { subDominioName } from '../../../constants.js'
import moment from 'moment-timezone'

export const getDocumentosByTipo = async (req, res) => {
  const { clienteId, isFiscal, itemsPorPagina, pagina } = req.body
  const { tipo } = req.params
  try {
    // const personasNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const personasNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const clientesNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'clientes' })
    const nameCollection = isFiscal ? 'documentosFiscales' : 'documentosVentas'
    const documentos = await agreggateCollectionsSD({
      enviromentClienteId: clienteId,
      nameCollection,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'venta',
            tipoDocumento: tipo
          }
        },
        { $sort: { numeroFactura: -1 } },
        { $skip: ((pagina || 1) - 1) * (itemsPorPagina || 10) },
        { $limit: itemsPorPagina || 10 },
        {
          $lookup: {
            from: `${personasNameCol}`,
            localField: 'creadoPor',
            foreignField: 'usuarioId',
            pipeline: [
              { $project: { nombre: '$nombre' } }
            ],
            as: 'vendedorData'
          }
        },
        { $unwind: { path: '$vendedorData', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: `${clientesNameCol}`,
            localField: 'clienteId',
            foreignField: '_id',
            pipeline: [
              { $project: { razonSocial: '$razonSocial' } }
            ],
            as: 'clienteData'
          }
        },
        { $unwind: { path: '$clienteData', preserveNullAndEmptyArrays: true } }
      ]
    })
    const cantidad = await agreggateCollectionsSD({
      enviromentClienteId: clienteId,
      nameCollection,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'venta',
            tipoDocumento: tipo
          }
        },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ documentos, cantidad: cantidad[0]?.total || 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la data de facturacion: ' + e.message })
  }
}