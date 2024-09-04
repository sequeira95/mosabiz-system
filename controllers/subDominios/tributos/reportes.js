import moment from 'moment-timezone'
import { agreggateCollectionsSD, formatCollectionName, getCollection } from '../../../utils/dataBaseConfing.js'
import { subDominioName, tiposDocumentosFiscales, tiposIVa } from '../../../constants.js'

export const getLibroCompra = async (req, res) => {
  const { periodoSelect, clienteId, itemsPorPagina, pagina } = req.body
  try {
    console.log(req.body)
    const tiposDocumentos = [tiposDocumentosFiscales.factura, tiposDocumentosFiscales.notaCredito, tiposDocumentosFiscales.notaDebito, tiposDocumentosFiscales.retIva]
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'compra',
            tipoDocumento: { $in: tiposDocumentos },
            periodoIvaInit: { $gte: moment(periodoSelect.fechaInicio).toDate() },
            periodoIvaEnd: { $lte: moment(periodoSelect.fechaFin).toDate() }
          }
        },
        { $count: 'total' }
      ]
    })
    if (itemsPorPagina && pagina) {
      const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
      const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
      const documentosCompras = await agreggateCollectionsSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        pipeline: [
          {
            $match: {
              tipoMovimiento: 'compra',
              tipoDocumento: { $in: tiposDocumentos },
              periodoIvaInit: { $gte: moment(periodoSelect.fechaInicio).toDate() },
              periodoIvaEnd: { $lte: moment(periodoSelect.fechaFin).toDate() }
            }
          },
          { $sort: { fecha: 1 } },
          { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
          { $limit: Number(itemsPorPagina) },
          {
            $lookup: {
              from: proveedoresCollection,
              localField: 'proveedorId',
              foreignField: '_id',
              as: 'proveedor'
            }
          },
          { $unwind: { path: '$proveedor', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: documentosFiscalesCollection,
              localField: 'facturaAsociada',
              foreignField: '_id',
              as: 'facturaAsociada'
            }
          },
          { $unwind: { path: '$facturaAsociada', preserveNullAndEmptyArrays: true } }
        ]
      })
      const ivaList = await getCollection({ nameCollection: 'iva' })
      const alicuotaGeneral = ivaList.find(e => e.tipo === tiposIVa.general).iva
      const alicuotaReducida = ivaList.find(e => e.tipo === tiposIVa.reducida).iva
      const alicuotaAdicional = ivaList.find(e => e.tipo === tiposIVa.adicional).iva
      const ivas = { alicuotaGeneral, alicuotaReducida, alicuotaAdicional }
      return res.status(200).json({ documentosCompras, ivas })
    }
    return res.status(200).json({ count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar los datos del libro ' + e.message })
  }
}
