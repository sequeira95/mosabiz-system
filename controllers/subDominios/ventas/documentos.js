import { ObjectId } from 'mongodb'
import { agreggateCollections, agreggateCollectionsSD, bulkWriteSD, createItemSD, createManyItemsSD, deleteItemSD, deleteManyItemsSD, formatCollectionName, getCollection, getCollectionSD, getItem, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { subDominioName, documentosVentas } from '../../../constants.js'
import moment from 'moment-timezone'

export const getDocumentosByTipo = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina } = req.body
  const { tipo } = req.params
  const isFiscal = documentosVentas.find(e => e.value === tipo)?.isFiscal
  try {
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
        { $limit: itemsPorPagina || 10 }
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

export const getDocumentoByTipo = async (req, res) => {
  const { clienteId, documentoId } = req.body
  const { tipo } = req.params
  const isFiscal = documentosVentas.find(e => e.value === tipo)?.isFiscal
  try {
    const nameCollection = isFiscal ? 'documentosFiscales' : 'documentosVentas'
    const nameDetalleCollection = isFiscal ? 'detalleDocumentosFiscales' : 'detalleDocumentosVentas'
    const detalleDocCol = formatCollectionName({
      enviromentEmpresa: subDominioName,
      enviromentClienteId: clienteId,
      nameCollection: nameDetalleCollection
    })
    const [documento] = await agreggateCollectionsSD({
      enviromentClienteId: clienteId,
      nameCollection,
      pipeline: [
        {
          $match: {
            _id: new ObjectId(documentoId),
            tipoMovimiento: 'venta',
            tipoDocumento: tipo
          }
        },
        {
          $lookup: {
            from: detalleDocCol,
            localField: '_id',
            foreignField: 'facturaId',
            as: 'detalleProductos'
          }
        }
      ]
    })
    return res.status(200).json({ documento, detalleDocCol })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la data del documento: ' + e.message })
  }
}
