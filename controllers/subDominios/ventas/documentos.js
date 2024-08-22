import { ObjectId } from 'mongodb'
import { agreggateCollections, agreggateCollectionsSD, bulkWriteSD, createItemSD, createManyItemsSD, deleteItemSD, deleteManyItemsSD, formatCollectionName, getCollection, getCollectionSD, getItem, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { subDominioName, documentosVentas } from '../../../constants.js'
import moment from 'moment-timezone'

export const getDocumentosByTipo = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina } = req.body
  const { tipo } = req.params
  try {
    const documentosFiscalesNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const extraStages = []
    if (['Nota de crédito','Nota de débito'].includes(tipo)) {
      extraStages.push({
        $lookup: {
          from: documentosFiscalesNameCol,
          localField: 'facturaAsociada',
          foreignField: '_id',
          as: 'factura'
        }
      },
      {
        $unwind: { path: '$factura', preserveNullAndEmptyArrays: true }
      },
      {
        $addFields: {
          documentoAsociado: {
            $concat: ['FAC - ', '$factura.numeroFactura']
          }
        }
      })
    }
    if (['Devolución'].includes(tipo)) {
      extraStages.push({
        $lookup: {
          from: documentosFiscalesNameCol,
          localField: 'notaEntregaAsociada',
          foreignField: '_id',
          as: 'factura'
        }
      },
      {
        $unwind: { path: '$factura', preserveNullAndEmptyArrays: true }
      },
      {
        $addFields: {
          documentoAsociado: {
            $concat: ['NE - ', '$factura.numeroFactura']
          }
        }
      })
    }
    const documentos = await agreggateCollectionsSD({
      enviromentClienteId: clienteId,
      nameCollection: 'documentosFiscales',
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'venta',
            tipoDocumento: tipo
          }
        },
        { $sort: { fechaCreacion: -1 } },
        { $skip: ((pagina || 1) - 1) * (itemsPorPagina || 10) },
        { $limit: itemsPorPagina || 10 },
        ...extraStages
      ]
    })
    const cantidad = await agreggateCollectionsSD({
      enviromentClienteId: clienteId,
      nameCollection: 'documentosFiscales',
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
  try {
    const nameCollection = 'documentosFiscales'
    const nameDetalleCollection = 'detalleDocumentosFiscales'
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
            foreignField: 'documentoId',
            as: 'detalleProductos'
          }
        }
      ]
    })
    return res.status(200).json({ documento })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la data del documento: ' + e.message })
  }
}
