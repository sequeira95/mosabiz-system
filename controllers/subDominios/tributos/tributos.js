import moment from 'moment-timezone'
import { agreggateCollections, agreggateCollectionsSD, formatCollectionName, getItemSD } from '../../../utils/dataBaseConfing.js'
import { subDominioName, tiposDocumentosFiscales } from '../../../constants.js'
import { ObjectId } from 'mongodb'

export const getCiclos = async (req, res) => {
  const { fecha, tipoImpuesto } = req.body
  console.log(fecha, tipoImpuesto)
  try {
    const ciclos = await agreggateCollections({
      nameCollection: 'ciclosImpuestos',
      pipeline: [
        {
          $match:
          {
            tipoImpuesto,
            /* $or: [
              {
                $and: [
                  { fechaFind: { $gte: moment(fecha).toDate()0, $lte: moment(fecha).toDate() } }
                ]
              },
              {
                $and: [
                  { isFechaActual: true },
                  { fechaInicio: { $lte: moment(fecha).toDate() } }
                ]
              }
            ] */
          }
        }
      ]
    })
    return res.status(200).json({ ciclos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las retenciones de ISLR ' + e.message })
  }
}
export const getListImpuestosIslr = async (req, res) => {
  const { pais } = req.body
  try {
    const islr = await agreggateCollections({
      nameCollection: 'islr',
      pipeline: [
        { $match: { pais: { $eq: pais } } }
      ]
    })
    return res.status(200).json({ islr })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las retenciones de ISLR ' + e.message })
  }
}
export const getFacturasPorDeclarar = async (req, res) => {
  const { clienteId, pagina, itemsPorPagina, periodoSelect, proveedor, numeroFactura } = req.body
  console.log(req.body)
  try {
    const regex = {}
    if (numeroFactura) {
      regex.$or = [
        { numeroFactura: { $regex: numeroFactura, $options: 'i' } }
      ]
    }
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const detalleDocumentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleDocumentosFiscales' })
    const facturas = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'compra',
            tipoDocumento: { $in: [tiposDocumentosFiscales.factura, tiposDocumentosFiscales.notaDebito] },
            proveedorId: new ObjectId(proveedor._id),
            ...regex,
            fecha: { $lte: moment(periodoSelect.fechaFin).toDate() }
          }
        },
        /* {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaAsociada',
            pipeline: [
              { $match: { tipoDocumento: tiposDocumentosFiscales.retIslr, estado: { $ne: 'anulado' } } }
            ],
            as: 'detalleFactura'
          }
        },
        { $unwind: { path: '$detalleFactura', preserveNullAndEmptyArrays: false } }, */
        {
          $lookup: {
            from: detalleDocumentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaId',
            pipeline: [
              { $match: { tipo: 'servicio' } }
            ],
            as: 'detalleForServicios'
          }
        },
        { $addFields: { hasServicios: { $size: '$detalleForServicios' } } },
        { $match: { hasServicios: { $gt: 0 } } },
        { $skip: (pagina - 1) * itemsPorPagina },
        { $limit: itemsPorPagina }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'compra',
            tipoDocumento: { $in: [tiposDocumentosFiscales.factura, tiposDocumentosFiscales.notaDebito] },
            proveedorId: new ObjectId(proveedor._id),
            ...regex,
            fecha: { $lte: moment(periodoSelect.fechaFin).toDate() }
          }
        },
        /* {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaAsociada',
            pipeline: [
              { $match: { tipoDocumento: tiposDocumentosFiscales.retIslr, estado: { $ne: 'anulado' } } }
            ],
            as: 'detalleFactura'
          }
        },
        { $unwind: { path: '$detalleFactura', preserveNullAndEmptyArrays: false } }, */
        {
          $lookup: {
            from: detalleDocumentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaId',
            pipeline: [
              { $match: { tipo: 'servicio' } }
            ],
            as: 'detalleForServicios'
          }
        },
        { $addFields: { hasServicios: { $size: '$detalleForServicios' } } },
        { $match: { hasServicios: { $gt: 0 } } },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ facturas, count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las facturas por declarar ' + e.message })
  }
}
export const ultimaInfoRetencion = async (req, res) => {
  const { clienteId } = req.body
  console.log(req.body)
  try {
    const ultimaRetencion = (await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipoMovimiento: 'compra', tipoDocumento: tiposDocumentosFiscales.retIslr, estado: { $ne: 'anulado' } } },
        { $sort: { fecha: -1 } },
        { $limit: 1 }
      ]
    }))[0]
    const ultimoNumeroGuardado = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'retencionIslr' } }))?.contador || 0
    return res.status(200).json({ ultimaRetencion, ultimoNumeroGuardado })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la ultima iformación sobre retención ' + e.message })
  }
}
export const getListProveedores = async (req, res) => {
  const { clienteId, search } = req.body
  console.log(req.body)
  try {
    const regex = {}
    if (search) {
      regex.$or = [
        { razonSocial: { $regex: search, $options: 'i' } }
      ]
    }
    const proveedores = await agreggateCollectionsSD({
      nameCollection: 'proveedores',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { ...regex } },
        { $limit: 10 }
      ]
    })
    return res.status(200).json({ proveedores })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la lista de proveedores ' + e.message })
  }
}
