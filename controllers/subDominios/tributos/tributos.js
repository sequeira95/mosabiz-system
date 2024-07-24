import moment from 'moment-timezone'
import { agreggateCollections, agreggateCollectionsSD, createManyItemsSD, formatCollectionName, getItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
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
    if (proveedor && proveedor._id) regex.proveedorId = new ObjectId(proveedor._id)
    const fechaFin = periodoSelect?.fechaFin ? moment(periodoSelect.fechaFin).toDate() : moment().toDate()
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const proveedoresFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const detalleDocumentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleDocumentosFiscales' })
    const facturas = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'compra',
            tipoDocumento: { $in: [tiposDocumentosFiscales.factura, tiposDocumentosFiscales.notaDebito] },
            // proveedorId: new ObjectId(proveedor._id),
            ...regex,
            fecha: { $lte: fechaFin }
          }
        },
        {
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
        // { $unwind: { path: '$detalleFactura', preserveNullAndEmptyArrays: false } },
        { $addFields: { hasRetencion: { $size: '$detalleFactura' } } },
        { $match: { hasRetencion: { $lte: 0 } } },
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
        { $limit: itemsPorPagina },
        {
          $lookup: {
            from: proveedoresFiscalesCollection,
            localField: 'proveedorId',
            foreignField: '_id',
            as: 'proveedor'
          }
        },
        { $unwind: { path: '$proveedor', preserveNullAndEmptyArrays: false } }
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
            // proveedorId: new ObjectId(proveedor._id),
            ...regex,
            fecha: { $lte: fechaFin }
          }
        },
        {
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
        // { $unwind: { path: '$detalleFactura', preserveNullAndEmptyArrays: false } },
        { $addFields: { hasRetencion: { $size: '$detalleFactura' } } },
        { $match: { hasRetencion: { $lte: 0 } } },
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
export const getComprobantesRetencionIslr = async (req, res) => {
  const { clienteId, periodoSelect } = req.body
  try {
    const proveedoresFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const comprobantes = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'compra',
            tipoDocumento: tiposDocumentosFiscales.retIslr,
            fecha: { $gte: moment(periodoSelect.fechaInicio).toDate(), $lte: moment(periodoSelect.fechaFin).toDate() },
            estado: { $ne: 'anulado' }
          }
        },
        {
          $lookup: {
            from: proveedoresFiscalesCollection,
            localField: 'proveedorId',
            foreignField: '_id',
            as: 'proveedor'
          }
        },
        { $unwind: { path: '$proveedor', preserveNullAndEmptyArrays: false } }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'compra',
            tipoDocumento: tiposDocumentosFiscales.retIslr,
            fecha: { $gte: moment(periodoSelect.fechaInicio).toDate(), $lte: moment(periodoSelect.fechaFin).toDate() },
            estado: { $ne: 'anulado' }
          }
        },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ comprobantes, count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de bucar los comprobantes de retencion ISLR ' + e.message })
  }
}
export const saveComprobanteRetIslrCompras = async (req, res) => {
  console.log(req.body)
  try {
    const { clienteId, comprobantes } = req.body
    const comprobantesCrear = []
    for (const comprobante of comprobantes) {
      const verifyComprobante = await getItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        filters: { facturaAsociada: new ObjectId(comprobante.facturaAsociada), tipoDocumento: tiposDocumentosFiscales.retIslr }
      })
      if (verifyComprobante) throw new Error('Ya existe un comprobante para la factura N° ' + comprobante.numeroFacturaAsociada)
      let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'retencionIslr' } }))?.contador || 0
      if (contador) ++contador
      if (!contador) contador = 1
      comprobantesCrear.push({
        tipoMovimiento: 'compra',
        tipoDocumento: tiposDocumentosFiscales.retIslr,
        numeroFactura: contador,
        facturaAsociada: new ObjectId(comprobante.facturaAsociada),
        tipoDocumentoAfectado: comprobante.tipoDocumentoAfectado,
        fecha: moment(comprobante.fecha).toDate(),
        baseImponibleExento: Number(comprobante.baseImponibleExento.toFixed(2)),
        porcentajeRetenido: Number(comprobante.porcentajeRetenido.toFixed(2)),
        baseRetencion: Number(comprobante.baseRetencion.toFixed(2)),
        sustraendo: Number(comprobante.sustraendo.toFixed(2)),
        totalRetenido: Number(comprobante.totalRetenido.toFixed(2)),
        tipoRetencion: comprobante.tipoRetencion,
        proveedorId: new ObjectId(comprobante.proveedorId),
        creadoPor: new ObjectId(req.uid)
      })
      upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'retencionIslr' }, update: { $set: { contador } } })
    }
    await createManyItemsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      items: [
        ...comprobantesCrear
      ]
    })
    return res.status(200).json({ status: 'Comprobantes creados exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar los comprobantes ' + e.message })
  }
}
