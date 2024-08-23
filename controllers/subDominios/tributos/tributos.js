import moment from 'moment-timezone'
import { agreggateCollections, agreggateCollectionsSD, bulkWriteSD, createManyItemsSD, deleteManyItemsSD, formatCollectionName, getCollection, getItemSD, updateItemSD, updateManyItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { formatearNumeroRetencionIslr, formatearNumeroRetencionIva, subDominioName, tiposDeclaracion, tiposDocumentosFiscales, tiposIVa } from '../../../constants.js'
import { ObjectId } from 'mongodb'
import { uploadImg } from '../../../utils/cloudImage.js'
import { hasContabilidad } from '../../../utils/hasContabilidad.js'

export const getCiclos = async (req, res) => {
  const { fecha, tipoImpuesto, isSujetoPasivoEspecial } = req.body
  console.log(fecha, tipoImpuesto, isSujetoPasivoEspecial)
  const matchConfig = {}
  if (isSujetoPasivoEspecial) {
    matchConfig.isSujetoPasivoEspecial = { $eq: isSujetoPasivoEspecial }
  }
  try {
    const ciclos = await agreggateCollections({
      nameCollection: 'ciclosImpuestos',
      pipeline: [
        {
          $match:
          {
            tipoImpuesto,
            isSujetoPasivoEspecial
            // ...matchConfig
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
    console.log({ ciclos })
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
export const getListImpuestosRetIva = async (req, res) => {
  const { pais } = req.body
  try {
    const retIva = await agreggateCollections({
      nameCollection: 'retIva',
      pipeline: [
        { $match: { pais: { $eq: pais } } }
      ]
    })
    return res.status(200).json({ retIva })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las retenciones de IVA ' + e.message })
  }
}
export const getFacturasPorDeclarar = async (req, res) => {
  const { clienteId, pagina, itemsPorPagina, periodoSelect, proveedor, numeroFactura, tiposImpuesto, tipo, isRetIva, cliente } = req.body
  console.log(req.body)
  try {
    const regex = {}
    if (numeroFactura) {
      regex.$or = [
        { numeroFactura: { $regex: numeroFactura, $options: 'i' } }
      ]
    }
    const lookups = []
    if (proveedor && proveedor._id) regex.proveedorId = new ObjectId(proveedor._id)
    if (cliente && cliente._id) regex.clienteId = new ObjectId(cliente._id)
    if (isRetIva && tipo === 'venta') regex.iva = { $gt: 0 }
    const fechaFin = periodoSelect?.fechaFin ? moment(periodoSelect.fechaFin).toDate() : moment().toDate()
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const proveedoresFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const clientesFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'clientes' })
    const detalleDocumentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleDocumentosFiscales' })
    if (!isRetIva) {
      lookups.push(
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
        { $match: { hasServicios: { $gt: 0 } } })
    }
    const facturas = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: tipo,
            tipoDocumento: { $in: [tiposDocumentosFiscales.factura, tiposDocumentosFiscales.notaDebito, tiposDocumentosFiscales.notaCredito] },
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
              { $match: { tipoDocumento: tiposDocumentosFiscales[tiposImpuesto], estado: { $ne: 'anulado' } } }
            ],
            as: 'detalleFactura'
          }
        },
        // { $unwind: { path: '$detalleFactura', preserveNullAndEmptyArrays: false } },
        { $addFields: { hasRetencion: { $size: '$detalleFactura' } } },
        { $match: { hasRetencion: { $lte: 0 } } },
        /* {
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
        { $match: { hasServicios: { $gt: 0 } } }, */
        ...lookups,
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
        { $unwind: { path: '$proveedor', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: clientesFiscalesCollection,
            localField: 'clienteId',
            foreignField: '_id',
            as: 'cliente'
          }
        },
        { $unwind: { path: '$cliente', preserveNullAndEmptyArrays: true } }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: tipo,
            tipoDocumento: { $in: [tiposDocumentosFiscales.factura, tiposDocumentosFiscales.notaDebito, tiposDocumentosFiscales.notaCredito] },
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
              { $match: { tipoDocumento: tiposDocumentosFiscales[tiposImpuesto], estado: { $ne: 'anulado' } } }
            ],
            as: 'detalleFactura'
          }
        },
        // { $unwind: { path: '$detalleFactura', preserveNullAndEmptyArrays: false } },
        { $addFields: { hasRetencion: { $size: '$detalleFactura' } } },
        { $match: { hasRetencion: { $lte: 0 } } },
        /* {
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
        { $match: { hasServicios: { $gt: 0 } } }, */
        ...lookups,
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
  const { clienteId, tiposImpuesto, tipo } = req.body
  console.log(req.body, 'gu')
  try {
    const ultimaRetencion = (await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipoMovimiento: tipo, tipoDocumento: tiposDocumentosFiscales[tiposImpuesto], estado: { $ne: 'anulado' } } },
        { $sort: { fecha: -1 } },
        { $limit: 1 }
      ]
    }))[0]
    const tiposContadores = {
      'RET ISLR': 'retencionIslr',
      'RET IVA': 'retencionIva'
    }
    const ultimoNumeroGuardado = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: tiposContadores[tiposImpuesto] } }))?.contador || 0
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
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const comprobantes = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'compra',
            tipoDocumento: tiposDocumentosFiscales.retIslr,
            fecha: { $gte: moment(periodoSelect.fechaInicio).toDate(), $lte: moment(periodoSelect.fechaFin).toDate() }
            // estado: { $ne: 'anulado' }
          }
        },
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
            as: 'factura'
          }
        },
        { $unwind: { path: '$factura', preserveNullAndEmptyArrays: true } }
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
            fecha: { $gte: moment(periodoSelect.fechaInicio).toDate(), $lte: moment(periodoSelect.fechaFin).toDate() }
            // estado: { $ne: 'anulado' }
          }
        },
        { $count: 'total' }
      ]
    })
    const declaracion = (await agreggateCollectionsSD({
      nameCollection: 'declaraciones',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoDeclaracion: tiposDeclaracion.islr,
            periodoInit: { $gte: moment(periodoSelect.fechaInicio).toDate() },
            priodoFin: { $lte: moment(periodoSelect.fechaFin).toDate() }
          }
        }
      ]
    }))[0]
    return res.status(200).json({ comprobantes, count: count.length ? count[0].total : 0, declaracion })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de bucar los comprobantes de retencion ISLR ' + e.message })
  }
}
export const saveComprobanteRetIslrCompras = async (req, res) => {
  console.log(req.body)
  try {
    const { clienteId, comprobantes, fecha } = req.body
    const comprobantesCrear = []
    const facturasUpdate = []
    const asientosContables = []
    const tieneContabilidad = await hasContabilidad({ clienteId })
    const ajusteTributos = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'tributos' } })
    let periodo = null
    let comprobanteContable = null
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    if (tieneContabilidad) {
      periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fecha).toDate() }, fechaFin: { $gte: moment(fecha).toDate() } } })
      // console.log({ periodo })
      if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha del documento')
      const mesPeriodo = moment(fecha).format('YYYY/MM')
      comprobanteContable = await getItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: ajusteTributos.codigoComprobanteCompras, periodoId: periodo._id, mesPeriodo }
      })
      if (!comprobanteContable) {
        comprobanteContable = await upsertItemSD({
          nameCollection: 'comprobantes',
          enviromentClienteId: clienteId,
          filters: { codigo: ajusteTributos.codigoComprobanteCompras, periodoId: periodo._id, mesPeriodo },
          update: {
            $set: {
              nombre: 'Movimientos de compras',
              isBloqueado: false,
              fechaCreacion: moment().toDate()
            }
          }
        })
      }
    }
    for (const comprobante of comprobantes) {
      const verifyComprobante = await getItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        filters: { facturaAsociada: new ObjectId(comprobante.facturaAsociada), tipoDocumento: tiposDocumentosFiscales.retIslr, estado: { $ne: 'anulado' } }
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
        creadoPor: new ObjectId(req.uid),
        tipoRetencionAux: comprobante.tipoRetencionAux,
        tasaDia: Number(comprobante.tasaDia),
        totalRetenidoSecundario: Number(comprobante.totalRetenidoSecundario.toFixed(2))
      })
      const factura = await getItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        filters: {
          _id: new ObjectId(comprobante.facturaAsociada),
          declarado: { $ne: true },
          $or: [
            { periodoIvaNombre: { $exists: false } },
            { periodoIvaNombre: { $in: ['', null, undefined] } }
          ]
        }
      })
      if (factura) {
        facturasUpdate.push({
          updateOne: {
            filter: { _id: factura._id },
            update: {
              $set: {
                periodoIvaNombre: comprobante.periodoIvaNombre,
                periodoIvaInit: moment(comprobante.periodoIvaInit).toDate(),
                periodoIvaEnd: moment(comprobante.periodoIvaEnd).toDate()
              }
            }
          }
        })
      }
      if (tieneContabilidad) {
        console.log('entrando')
        const cuentaRetIslr = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(ajusteTributos.cuentaRetIslrCompra) }
        })
        const factura = await getItemSD({
          nameCollection: 'documentosFiscales',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(comprobante.facturaAsociada) }
        })
        const detalleProveedor = await agreggateCollectionsSD({
          nameCollection: 'proveedores',
          enviromentClienteId: clienteId,
          pipeline: [
            { $match: { _id: new ObjectId(comprobante.proveedorId) } },
            {
              $lookup: {
                from: categoriasCollection,
                localField: 'categoria',
                foreignField: '_id',
                as: 'detalleCategoria'
              }
            },
            { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } }
          ]
        })
        const cuentaProveedor = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(detalleProveedor[0]?.detalleCategoria?.cuentaId) }
        })
        let terceroProveedor = await getItemSD({
          nameCollection: 'terceros',
          enviromentClienteId: clienteId,
          filters: { cuentaId: new ObjectId(cuentaProveedor._id), nombre: detalleProveedor[0]?.razonSocial.toUpperCase() }
        })
        if (!terceroProveedor) {
          terceroProveedor = await upsertItemSD({
            nameCollection: 'terceros',
            enviromentClienteId: clienteId,
            filters: { cuentaId: new ObjectId(cuentaProveedor._id), nombre: detalleProveedor[0]?.razonSocial.toUpperCase() },
            update: {
              $set: {
                nombre: detalleProveedor[0]?.razonSocial.toUpperCase(),
                cuentaId: new ObjectId(cuentaProveedor._id)
              }
            }
          })
        }
        asientosContables.push({
          cuentaId: new ObjectId(cuentaProveedor._id),
          cuentaCodigo: cuentaProveedor.codigo,
          cuentaNombre: cuentaProveedor.descripcion,
          comprobanteId: new ObjectId(comprobanteContable._id),
          periodoId: new ObjectId(periodo._id),
          descripcion: `COMPROBANTE RET ISLT N°${formatearNumeroRetencionIslr(contador)} DE ${factura.tipoDocumento}-${factura.numeroFactura}`,
          fecha: moment(comprobante.fecha).toDate(),
          debe: Number(comprobante.totalRetenido.toFixed(2)),
          haber: 0,
          fechaCreacion: moment().toDate(),
          terceroId: new ObjectId(terceroProveedor._id),
          terceroNombre: terceroProveedor.nombre,
          docReferencia: `RET ISLT N°${formatearNumeroRetencionIslr(contador)}`,
          documento: {
            docReferencia: `RET ISLT N°${formatearNumeroRetencionIslr(contador)}`,
            docFecha: moment(comprobante.fecha).toDate()
          }
        }, {
          cuentaId: new ObjectId(cuentaRetIslr._id),
          cuentaCodigo: cuentaRetIslr.codigo,
          cuentaNombre: cuentaRetIslr.descripcion,
          comprobanteId: new ObjectId(comprobanteContable._id),
          periodoId: new ObjectId(periodo._id),
          descripcion: `COMPROBANTE RET ISLT N°${formatearNumeroRetencionIslr(contador)} DE ${factura.tipoDocumento}-${factura.numeroFactura}`,
          fecha: moment(comprobante.fecha).toDate(),
          debe: 0,
          haber: Number(comprobante.totalRetenido.toFixed(2)),
          fechaCreacion: moment().toDate(),
          docReferencia: `RET ISLT N°${formatearNumeroRetencionIslr(contador)}`,
          documento: {
            docReferencia: `RET ISLT N°${formatearNumeroRetencionIslr(contador)}`,
            docFecha: moment(comprobante.fecha).toDate()
          }
        })
      }
      upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'retencionIslr' }, update: { $set: { contador } } })
    }
    await createManyItemsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      items: [
        ...comprobantesCrear
      ]
    })
    if (facturasUpdate[0]) bulkWriteSD({ nameCollection: 'documentosFiscales', enviromentClienteId: clienteId, pipeline: facturasUpdate })
    console.log({ asientosContables })
    if (asientosContables[0]) await createManyItemsSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, items: [...asientosContables] })
    return res.status(200).json({ status: 'Comprobantes creados exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar los comprobantes ' + e.message })
  }
}
export const anularComprobante = async (req, res) => {
  const { clienteId, comprobanteId, fechaAnulado } = req.body
  try {
    const asientosContables = []
    const tieneContabilidad = await hasContabilidad({ clienteId })
    const ajusteTributos = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'tributos' } })
    let periodo = null
    let comprobanteContable = null
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    if (tieneContabilidad) {
      periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fechaAnulado).toDate() }, fechaFin: { $gte: moment(fechaAnulado).toDate() } } })
      // console.log({ periodo })
      if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha del documento')
      const mesPeriodo = moment(fechaAnulado).format('YYYY/MM')
      comprobanteContable = await getItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: ajusteTributos.codigoComprobanteCompras, periodoId: periodo._id, mesPeriodo }
      })
      if (!comprobanteContable) {
        comprobanteContable = await upsertItemSD({
          nameCollection: 'comprobantes',
          enviromentClienteId: clienteId,
          filters: { codigo: ajusteTributos.codigoComprobanteCompras, periodoId: periodo._id, mesPeriodo },
          update: {
            $set: {
              nombre: 'Movimientos de compras',
              isBloqueado: false,
              fechaCreacion: moment().toDate()
            }
          }
        })
      }
      const comprobanteAnetrior = await getItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(comprobanteId) }
      })
      const detalleProveedor = await agreggateCollectionsSD({
        nameCollection: 'proveedores',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { _id: new ObjectId(comprobanteAnetrior.proveedorId) } },
          {
            $lookup: {
              from: categoriasCollection,
              localField: 'categoria',
              foreignField: '_id',
              as: 'detalleCategoria'
            }
          },
          { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } }
        ]
      })
      const cuentaProveedor = await getItemSD({
        nameCollection: 'planCuenta',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(detalleProveedor[0]?.detalleCategoria?.cuentaId) }
      })
      let terceroProveedor = await getItemSD({
        nameCollection: 'terceros',
        enviromentClienteId: clienteId,
        filters: { cuentaId: new ObjectId(cuentaProveedor._id), nombre: detalleProveedor[0]?.razonSocial.toUpperCase() }
      })
      if (!terceroProveedor) {
        terceroProveedor = await upsertItemSD({
          nameCollection: 'terceros',
          enviromentClienteId: clienteId,
          filters: { cuentaId: new ObjectId(cuentaProveedor._id), nombre: detalleProveedor[0]?.razonSocial.toUpperCase() },
          update: {
            $set: {
              nombre: detalleProveedor[0]?.razonSocial.toUpperCase(),
              cuentaId: new ObjectId(cuentaProveedor._id)
            }
          }
        })
      }
      const cuentaRetIslr = await getItemSD({
        nameCollection: 'planCuenta',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(ajusteTributos.cuentaRetIslrCompra) }
      })
      asientosContables.push({
        cuentaId: new ObjectId(cuentaRetIslr._id),
        cuentaCodigo: cuentaRetIslr.codigo,
        cuentaNombre: cuentaRetIslr.descripcion,
        comprobanteId: new ObjectId(comprobanteContable._id),
        periodoId: new ObjectId(periodo._id),
        descripcion: `COMPROBANTE RET ISLT N°${formatearNumeroRetencionIslr(comprobanteAnetrior.numeroFactura)} ANULADO`,
        fecha: moment(fechaAnulado).toDate(),
        debe: Number(comprobanteAnetrior.totalRetenido.toFixed(2)),
        haber: 0,
        fechaCreacion: moment().toDate(),
        docReferencia: `RET ISLT N°${formatearNumeroRetencionIslr(comprobanteAnetrior.numeroFactura)}`,
        documento: {
          docReferencia: `RET ISLT N°${formatearNumeroRetencionIslr(comprobanteAnetrior.numeroFactura)}`,
          docFecha: moment(fechaAnulado).toDate()
        }
      }, {
        cuentaId: new ObjectId(cuentaProveedor._id),
        cuentaCodigo: cuentaProveedor.codigo,
        cuentaNombre: cuentaProveedor.descripcion,
        comprobanteId: new ObjectId(comprobanteContable._id),
        periodoId: new ObjectId(periodo._id),
        descripcion: `COMPROBANTE RET ISLT N°${formatearNumeroRetencionIslr(comprobanteAnetrior.numeroFactura)} ANULADO`,
        fecha: moment(fechaAnulado).toDate(),
        debe: 0,
        haber: Number(comprobanteAnetrior.totalRetenido.toFixed(2)),
        fechaCreacion: moment().toDate(),
        terceroId: new ObjectId(terceroProveedor._id),
        terceroNombre: terceroProveedor.nombre,
        docReferencia: `RET ISLT N°${formatearNumeroRetencionIslr(comprobanteAnetrior.numeroFactura)}`,
        documento: {
          docReferencia: `RET ISLT N°${formatearNumeroRetencionIslr(comprobanteAnetrior.numeroFactura)}`,
          docFecha: moment(fechaAnulado).toDate()
        }
      })
      if (asientosContables[0]) await createManyItemsSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, items: [...asientosContables] })
    }
    const comprobante = await updateItemSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(comprobanteId) },
      update: {
        $set: {
          estado: 'anulado',
          baseImponibleExento: 0,
          porcentajeRetenido: 0,
          baseRetencion: 0,
          sustraendo: 0,
          totalRetenido: 0,
          baseImponible: 0,
          totalCompra: 0,
          iva: 0,
          sinDerechoCredito: 0,
          proveedorId: null
        }
      }
    })
    return res.status(200).json({ status: 'Comprobante anulado exitosamente', comprobante })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de anular el comprobante ' + e.message })
  }
}
export const saveDeclaracionIslr = async (req, res) => {
  const { clienteId, _id, retenido, observacion, estado, periodoInit, priodoFin, periodo } = req.body
  try {
    console.log(req.body, req.files)
    const documentos = req.files?.documentos
    const documentosAdjuntos = []
    const declaracionCrear = {
      observacion,
      tipoDeclaracion: tiposDeclaracion.islr,
      estado,
      periodoInit: moment(periodoInit).toDate(),
      priodoFin: moment(priodoFin).toDate(),
      periodo,
      retenido: Number(Number(retenido).toFixed(2)),
      creadoPor: new ObjectId(req.uid)
    }
    if (req.files && req.files.documentos) {
      if (documentos && documentos[0]) {
        for (const documento of documentos) {
          const extension = documento.mimetype.split('/')[1]
          const namePath = `${documento.name}`
          const resDoc = await uploadImg(documento.data, namePath)
          documentosAdjuntos.push(
            {
              path: resDoc.filePath,
              name: resDoc.name,
              url: resDoc.url,
              type: extension,
              fileId: resDoc.fileId
            })
        }
      }
      if (documentos && documentos.name) {
        const extension = documentos.mimetype.split('/')[1]
        const namePath = `${documentos.name}`
        const resDoc = await uploadImg(documentos.data, namePath)
        documentosAdjuntos.push(
          {
            path: resDoc.filePath,
            name: resDoc.name,
            url: resDoc.url,
            type: extension,
            fileId: resDoc.fileId
          }
        )
      }
    }
    if (documentosAdjuntos[0]) {
      const itemsAnterior = (await getItemSD({ nameCollection: 'declaraciones', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })).documentosAdjuntos
      if (itemsAnterior) {
        documentosAdjuntos.push(...itemsAnterior)
      }
      declaracionCrear.documentosAdjuntos = documentosAdjuntos
    }
    const declaracionGuardada = await upsertItemSD({
      nameCollection: 'declaraciones',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: { $set: declaracionCrear }
    })
    return res.status(200).json({ status: 'Declaracion creada exitosamente', declaracion: declaracionGuardada })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la declaracion ' + e.message })
  }
}
export const saveComprobanteRetIvaCompras = async (req, res) => {
  console.log(req.body)
  try {
    const { clienteId, comprobantes, fecha } = req.body
    const comprobantesCrear = []
    const asientosContables = []
    const facturasUpdate = []
    const tieneContabilidad = await hasContabilidad({ clienteId })
    const ajusteTributos = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'tributos' } })
    let periodo = null
    let comprobanteContable = null
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    if (tieneContabilidad) {
      periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fecha).toDate() }, fechaFin: { $gte: moment(fecha).toDate() } } })
      // console.log({ periodo })
      if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha del documento')
      const mesPeriodo = moment(fecha).format('YYYY/MM')
      comprobanteContable = await getItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: ajusteTributos.codigoComprobanteCompras, periodoId: periodo._id, mesPeriodo }
      })
      if (!comprobanteContable) {
        comprobanteContable = await upsertItemSD({
          nameCollection: 'comprobantes',
          enviromentClienteId: clienteId,
          filters: { codigo: ajusteTributos.codigoComprobanteCompras, periodoId: periodo._id, mesPeriodo },
          update: {
            $set: {
              nombre: 'Movimientos de compras',
              isBloqueado: false,
              fechaCreacion: moment().toDate()
            }
          }
        })
      }
    }
    for (const comprobante of comprobantes) {
      const verifyComprobante = await getItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        filters: { facturaAsociada: new ObjectId(comprobante.facturaAsociada), tipoDocumento: tiposDocumentosFiscales.retIva }
      })
      if (verifyComprobante) throw new Error('Ya existe un comprobante para la factura N° ' + comprobante.numeroFacturaAsociada)
      let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'retencionIva' } }))?.contador || 0
      if (contador) ++contador
      if (!contador) contador = 1
      comprobantesCrear.push({
        tipoMovimiento: 'compra',
        tipoDocumento: tiposDocumentosFiscales.retIva,
        numeroFactura: contador,
        facturaAsociada: new ObjectId(comprobante.facturaAsociada),
        tipoDocumentoAfectado: comprobante.tipoDocumentoAfectado,
        fecha: moment(comprobante.fecha).toDate(),
        baseImponible: Number(comprobante.baseImponible.toFixed(2)),
        porcentajeRetenido: Number(comprobante.porcentajeRetenido.toFixed(2)),
        totalCompra: Number(comprobante.totalCompra.toFixed(2)),
        iva: Number(comprobante.iva.toFixed(2)),
        sinDerechoCredito: Number(comprobante.sinDerechoCredito.toFixed(2)),
        totalRetenido: Number(comprobante.totalRetenido.toFixed(2)),
        tipoRetencion: comprobante.tipoRetencion,
        proveedorId: new ObjectId(comprobante.proveedorId),
        creadoPor: new ObjectId(req.uid),
        tasaDia: Number(comprobante.tasaDia),
        monedaSecundaria: 'USD',
        totalRetenidoSecundario: Number(comprobante.totalRetenidoSecundario.toFixed(2))
      })
      const factura = await getItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        filters: {
          _id: new ObjectId(comprobante.facturaAsociada),
          declarado: { $ne: true },
          $or: [
            { periodoIvaNombre: { $exists: false } },
            { periodoIvaNombre: { $in: ['', null, undefined] } }
          ]
        }
      })
      if (factura) {
        facturasUpdate.push({
          updateOne: {
            filter: { _id: factura._id },
            update: {
              $set: {
                periodoIvaNombre: comprobante.periodoIvaNombre,
                periodoIvaInit: moment(comprobante.periodoIvaInit).toDate(),
                periodoIvaEnd: moment(comprobante.periodoIvaEnd).toDate()
              }
            }
          }
        })
      }
      if (tieneContabilidad) {
        console.log('entrando')
        const cuentaRet = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(ajusteTributos.cuentaRetIva) }
        })
        const factura = await getItemSD({
          nameCollection: 'documentosFiscales',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(comprobante.facturaAsociada) }
        })
        const detalleProveedor = await agreggateCollectionsSD({
          nameCollection: 'proveedores',
          enviromentClienteId: clienteId,
          pipeline: [
            { $match: { _id: new ObjectId(comprobante.proveedorId) } },
            {
              $lookup: {
                from: categoriasCollection,
                localField: 'categoria',
                foreignField: '_id',
                as: 'detalleCategoria'
              }
            },
            { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } }
          ]
        })
        const cuentaProveedor = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(detalleProveedor[0]?.detalleCategoria?.cuentaId) }
        })
        let terceroProveedor = await getItemSD({
          nameCollection: 'terceros',
          enviromentClienteId: clienteId,
          filters: { cuentaId: new ObjectId(cuentaProveedor._id), nombre: detalleProveedor[0]?.razonSocial.toUpperCase() }
        })
        if (!terceroProveedor) {
          terceroProveedor = await upsertItemSD({
            nameCollection: 'terceros',
            enviromentClienteId: clienteId,
            filters: { cuentaId: new ObjectId(cuentaProveedor._id), nombre: detalleProveedor[0]?.razonSocial.toUpperCase() },
            update: {
              $set: {
                nombre: detalleProveedor[0]?.razonSocial.toUpperCase(),
                cuentaId: new ObjectId(cuentaProveedor._id)
              }
            }
          })
        }
        asientosContables.push({
          cuentaId: new ObjectId(cuentaProveedor._id),
          cuentaCodigo: cuentaProveedor.codigo,
          cuentaNombre: cuentaProveedor.descripcion,
          comprobanteId: new ObjectId(comprobanteContable._id),
          periodoId: new ObjectId(periodo._id),
          descripcion: `COMPROBANTE RET IVA N°${formatearNumeroRetencionIva(contador, moment(fecha).format('YYYYMM'))} DE ${factura.tipoDocumento}-${factura.numeroFactura}`,
          fecha: moment(comprobante.fecha).toDate(),
          debe: Number(comprobante.totalRetenido.toFixed(2)),
          haber: 0,
          fechaCreacion: moment().toDate(),
          terceroId: new ObjectId(terceroProveedor._id),
          terceroNombre: terceroProveedor.nombre,
          docReferencia: `RET IVA N°${formatearNumeroRetencionIva(contador, moment(fecha).format('YYYYMM'))}`,
          documento: {
            docReferencia: `RET IVA N°${formatearNumeroRetencionIva(contador, moment(fecha).format('YYYYMM'))}`,
            docFecha: moment(comprobante.fecha).toDate()
          }
        }, {
          cuentaId: new ObjectId(cuentaRet._id),
          cuentaCodigo: cuentaRet.codigo,
          cuentaNombre: cuentaRet.descripcion,
          comprobanteId: new ObjectId(comprobanteContable._id),
          periodoId: new ObjectId(periodo._id),
          descripcion: `COMPROBANTE RET IVA N°${formatearNumeroRetencionIva(contador, moment(fecha).format('YYYYMM'))} DE ${factura.tipoDocumento}-${factura.numeroFactura}`,
          fecha: moment(comprobante.fecha).toDate(),
          debe: 0,
          haber: Number(comprobante.totalRetenido.toFixed(2)),
          fechaCreacion: moment().toDate(),
          docReferencia: `RET IVA N°${formatearNumeroRetencionIva(contador, moment(fecha).format('YYYYMM'))}`,
          documento: {
            docReferencia: `RET IVA N°${formatearNumeroRetencionIva(contador, moment(fecha).format('YYYYMM'))}`,
            docFecha: moment(comprobante.fecha).toDate()
          }
        })
      }
      upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'retencionIva' }, update: { $set: { contador } } })
    }
    await createManyItemsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      items: [
        ...comprobantesCrear
      ]
    })
    if (facturasUpdate[0]) bulkWriteSD({ nameCollection: 'documentosFiscales', enviromentClienteId: clienteId, pipeline: facturasUpdate })
    console.log({ asientosContables })
    if (asientosContables[0]) await createManyItemsSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, items: [...asientosContables] })
    return res.status(200).json({ status: 'Comprobantes creados exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar los comprobantes ' + e.message })
  }
}
export const getComprobantesRetencionIVA = async (req, res) => {
  const { clienteId, periodoSelect } = req.body
  try {
    console.log(tiposDocumentosFiscales.retIva, 'comprobamt')
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const comprobantes = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'compra',
            tipoDocumento: tiposDocumentosFiscales.retIva,
            fecha: { $gte: moment(periodoSelect.fechaInicio).toDate(), $lte: moment(periodoSelect.fechaFin).toDate() }
            // estado: { $ne: 'anulado' }
          }
        },
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
            pipeline: [
              {
                $lookup: {
                  from: documentosFiscalesCollection,
                  localField: 'facturaAsociada',
                  foreignField: '_id',
                  as: 'detalleNota'
                }
              },
              { $unwind: { path: '$detalleNota', preserveNullAndEmptyArrays: true } }
            ],
            as: 'factura'
          }
        },
        { $unwind: { path: '$factura', preserveNullAndEmptyArrays: true } }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'compra',
            tipoDocumento: tiposDocumentosFiscales.retIva,
            fecha: { $gte: moment(periodoSelect.fechaInicio).toDate(), $lte: moment(periodoSelect.fechaFin).toDate() }
            // estado: { $ne: 'anulado' }
          }
        },
        { $count: 'total' }
      ]
    })
    const declaracion = (await agreggateCollectionsSD({
      nameCollection: 'declaraciones',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'compra',
            tipoDeclaracion: tiposDeclaracion.iva,
            periodoInit: { $gte: moment(periodoSelect.fechaInicio).toDate() },
            priodoFin: { $lte: moment(periodoSelect.fechaFin).toDate() }
          }
        }
      ]
    }))[0]
    return res.status(200).json({ comprobantes, count: count.length ? count[0].total : 0, declaracion })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de bucar los comprobantes de retencion ISLR ' + e.message })
  }
}
export const saveDeclaracionIva = async (req, res) => {
  const { clienteId, _id, retenido, observacion, estado, periodoInit, priodoFin, periodo, tipoMovimiento } = req.body
  try {
    console.log(req.body, req.files)
    const documentos = req.files?.documentos
    const documentosAdjuntos = []
    const declaracionCrear = {
      observacion,
      tipoDeclaracion: tiposDeclaracion.iva,
      estado,
      periodoInit: moment(periodoInit).toDate(),
      priodoFin: moment(priodoFin).toDate(),
      periodo,
      retenido: Number(Number(retenido).toFixed(2)),
      creadoPor: new ObjectId(req.uid),
      tipoMovimiento
    }
    if (req.files && req.files.documentos) {
      if (documentos && documentos[0]) {
        for (const documento of documentos) {
          const extension = documento.mimetype.split('/')[1]
          const namePath = `${documento.name}`
          const resDoc = await uploadImg(documento.data, namePath)
          documentosAdjuntos.push(
            {
              path: resDoc.filePath,
              name: resDoc.name,
              url: resDoc.url,
              type: extension,
              fileId: resDoc.fileId
            })
        }
      }
      if (documentos && documentos.name) {
        const extension = documentos.mimetype.split('/')[1]
        const namePath = `${documentos.name}`
        const resDoc = await uploadImg(documentos.data, namePath)
        documentosAdjuntos.push(
          {
            path: resDoc.filePath,
            name: resDoc.name,
            url: resDoc.url,
            type: extension,
            fileId: resDoc.fileId
          }
        )
      }
    }
    if (documentosAdjuntos[0]) {
      const itemsAnterior = (await getItemSD({ nameCollection: 'declaraciones', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })).documentosAdjuntos
      if (itemsAnterior) {
        documentosAdjuntos.push(...itemsAnterior)
      }
      declaracionCrear.documentosAdjuntos = documentosAdjuntos
    }
    const declaracionGuardada = await upsertItemSD({
      nameCollection: 'declaraciones',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: { $set: declaracionCrear }
    })
    return res.status(200).json({ status: 'Declaracion creada exitosamente', declaracion: declaracionGuardada })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la declaracion ' + e.message })
  }
}
export const getDataIva = async (req, res) => {
  const { clienteId, periodoSelect } = req.body
  try {
    const ivaList = await getCollection({ nameCollection: 'iva' })
    console.log({ ivaList })
    const alicuotaGeneral = ivaList.find(e => e.tipo === tiposIVa.general).iva
    const alicuotaReducida = ivaList.find(e => e.tipo === tiposIVa.reducida).iva
    const alicuotaAdicional = ivaList.find(e => e.tipo === tiposIVa.adicional).iva
    console.log({ alicuotaGeneral, alicuotaReducida, alicuotaAdicional })
    const dataIva = (await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            periodoIvaInit: { $gte: moment(periodoSelect.fechaInicio).toDate() },
            periodoIvaEnd: { $lte: moment(periodoSelect.fechaFin).toDate() }
            // fecha: { $gte: moment(periodoSelect.fechaInicio).toDate(), $lte: moment(periodoSelect.fechaFin).toDate() }
          }
        },
        {
          $group: {
            _id: 0,
            item40: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $ne: ['$isImportacion', true] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $ne: ['$isImportacion', true] }
                        ]
                      }
                    ]
                  },
                  then: '$totalExento',
                  else: 0
                }
              }
            },
            item40resta: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipoMovimiento', 'venta'] },
                      { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                      { $ne: ['$isImportacion', true] }
                    ]
                  },
                  then: '$totalExento',
                  else: 0
                }
              }
            },
            item41: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $eq: ['$isImportacion', true] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $eq: ['$isImportacion', true] }
                        ]
                      }
                    ]
                  },
                  then: '$total',
                  else: 0
                }
              }
            },
            item41resta: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipoMovimiento', 'venta'] },
                      { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                      { $eq: ['$isImportacion', true] }
                    ]
                  },
                  then: '$total',
                  else: 0
                }
              }
            },
            item42: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item42resta: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                      { $ne: ['$isImportacion', true] },
                      { $gt: ['$iva', 0] },
                      { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item43: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item43resta: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                      { $ne: ['$isImportacion', true] },
                      { $gt: ['$iva', 0] },
                      { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item442: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item442resta: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                      { $ne: ['$isImportacion', true] },
                      { $gt: ['$iva', 0] },
                      { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item452: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item452resta: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                      { $ne: ['$isImportacion', true] },
                      { $gt: ['$iva', 0] },
                      { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item443: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item443resta: {
              $sum: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                      { $ne: ['$isImportacion', true] },
                      { $gt: ['$iva', 0] },
                      { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item453: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item453resta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item30: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      { $and: [{ $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] }] },
                      { $and: [{ $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] }] }
                    ]
                  },
                  then: '$totalExento',
                  else: 0
                }
              }
            },
            item30resta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      { $and: [{ $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] }] }
                    ]
                  },
                  then: '$totalExento',
                  else: 0
                }
              }
            },
            item31: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item31resta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item32: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item32resta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item312: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item312resta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item322: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item322resta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item313: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item313resta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item323: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item323resta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                          { $eq: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item33: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item33resta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item34: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item34resta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaGeneral] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item332: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item332resta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item342: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item342resta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaAdicional] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item333: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item333resta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      }
                    ]
                  },
                  then: '$baseImponible',
                  else: 0
                }
              }
            },
            item343: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item343resta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] }, { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                          { $ne: ['$isImportacion', true] },
                          { $gt: ['$iva', 0] },
                          { $eq: [{ $round: [{ $multiply: [{ $divide: ['$iva', '$baseImponible'] }, 100] }, 0] }, alicuotaReducida] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            itemsProrrata: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $eq: ['$aplicaProrrateo', true] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $eq: ['$aplicaProrrateo', true] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            itemsProrrataResta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                          { $eq: ['$aplicaProrrateo', true] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            itemsNoProrrata: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.factura] },
                          { $ne: ['$aplicaProrrateo', true] }
                        ]
                      },
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] },
                          { $ne: ['$aplicaProrrateo', true] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            itemsNoProrrataResta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'compra'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] },
                          { $ne: ['$aplicaProrrateo', true] }
                        ]
                      }
                    ]
                  },
                  then: '$iva',
                  else: 0
                }
              }
            },
            item66: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.retIva] },
                          { $ne: ['$tipoDocumentoAfectado', tiposDocumentosFiscales.notaCredito] }
                        ]
                      }
                    ]
                  },
                  then: '$totalRetenido',
                  else: 0
                }
              }
            },
            item66resta: {
              $sum: {
                $cond: {
                  if: {
                    $or: [
                      {
                        $and: [
                          { $eq: ['$tipoMovimiento', 'venta'] },
                          { $eq: ['$tipoDocumento', tiposDocumentosFiscales.retIva] },
                          { $eq: ['$tipoDocumentoAfectado', tiposDocumentosFiscales.notaCredito] }
                        ]
                      }
                    ]
                  },
                  then: '$totalRetenido',
                  else: 0
                }
              }
            }
          }
        },
        {
          $project: {
            item40: { $subtract: ['$item40', '$item40resta'] },
            item41: { $subtract: ['$item41', '$item41resta'] },
            item42: { $subtract: ['$item42', '$item42resta'] },
            item43: { $subtract: ['$item43', '$item43resta'] },
            item442: { $subtract: ['$item442', '$item442resta'] },
            item452: { $subtract: ['$item452', '$item452resta'] },
            item443: { $subtract: ['$item443', '$item443resta'] },
            item453: { $subtract: ['$item453', '$item453resta'] },
            item30: { $subtract: ['$item30', '$item30resta'] },
            item31: { $subtract: ['$item31', '$item31resta'] },
            item32: { $subtract: ['$item32', '$item32resta'] },
            item312: { $subtract: ['$item312', '$item312resta'] },
            item322: { $subtract: ['$item322', '$item322resta'] },
            item313: { $subtract: ['$item313', '$item313resta'] },
            item323: { $subtract: ['$item323', '$item323resta'] },
            item33: { $subtract: ['$item33', '$item33resta'] },
            item34: { $subtract: ['$item34', '$item34resta'] },
            item332: { $subtract: ['$item332', '$item332resta'] },
            item342: { $subtract: ['$item342', '$item342resta'] },
            item333: { $subtract: ['$item333', '$item333resta'] },
            item343: { $subtract: ['$item343', '$item343resta'] },
            itemsProrrata: { $subtract: ['$itemsProrrata', '$itemsProrrataResta'] },
            itemsNoProrrata: { $subtract: ['$itemsNoProrrata', '$itemsNoProrrataResta'] },
            item66: { $subtract: ['$item66', '$item66resta'] }
          }
        }
      ]
    }))[0]
    return res.status(200).json({ dataIva })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos para el IVA ' + e.message })
  }
}
export const getComprobantesRetencionIVAVenta = async (req, res) => {
  const { clienteId, periodoSelect } = req.body
  try {
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const comprobantes = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'venta',
            tipoDocumento: tiposDocumentosFiscales.retIva,
            fecha: { $gte: moment(periodoSelect.fechaInicio).toDate(), $lte: moment(periodoSelect.fechaFin).toDate() }
            // estado: { $ne: 'anulado' }
          }
        },
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
            pipeline: [
              {
                $lookup: {
                  from: documentosFiscalesCollection,
                  localField: 'facturaAsociada',
                  foreignField: '_id',
                  as: 'detalleNota'
                }
              },
              { $unwind: { path: '$detalleNota', preserveNullAndEmptyArrays: true } }
            ],
            as: 'factura'
          }
        },
        { $unwind: { path: '$factura', preserveNullAndEmptyArrays: true } }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'venta',
            tipoDocumento: tiposDocumentosFiscales.retIva,
            fecha: { $gte: moment(periodoSelect.fechaInicio).toDate(), $lte: moment(periodoSelect.fechaFin).toDate() }
            // estado: { $ne: 'anulado' }
          }
        },
        { $count: 'total' }
      ]
    })
    const declaracion = (await agreggateCollectionsSD({
      nameCollection: 'declaraciones',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: 'venta',
            tipoDeclaracion: tiposDeclaracion.iva,
            periodoInit: { $gte: moment(periodoSelect.fechaInicio).toDate() },
            priodoFin: { $lte: moment(periodoSelect.fechaFin).toDate() }
          }
        }
      ]
    }))[0]
    return res.status(200).json({ comprobantes, count: count.length ? count[0].total : 0, declaracion })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de bucar los comprobantes de retencion ISLR ' + e.message })
  }
}
export const getListClientes = async (req, res) => {
  const { clienteId, search } = req.body
  console.log(req.body)
  try {
    const regex = {}
    if (search) {
      regex.$or = [
        { razonSocial: { $regex: search, $options: 'i' } }
      ]
    }
    const clientes = await agreggateCollectionsSD({
      nameCollection: 'clientes',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { ...regex } },
        { $limit: 10 }
      ]
    })
    return res.status(200).json({ clientes })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la lista de proveedores ' + e.message })
  }
}
export const saveComprobanteRetIvaVentas = async (req, res) => {
  console.log(req.body)
  try {
    const { clienteId, comprobantes, fecha } = req.body
    const comprobantesCrear = []
    const asientosContables = []
    const tieneContabilidad = await hasContabilidad({ clienteId })
    const ajusteTributos = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'tributos' } })
    let periodo = null
    let comprobanteContable = null
    if (tieneContabilidad) {
      periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fecha).toDate() }, fechaFin: { $gte: moment(fecha).toDate() } } })
      // console.log({ periodo })
      if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha del documento')
      const mesPeriodo = moment(fecha).format('YYYY/MM')
      comprobanteContable = await getItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: ajusteTributos.codigoComprobanteVentas, periodoId: periodo._id, mesPeriodo }
      })
      if (!comprobanteContable) {
        comprobanteContable = await upsertItemSD({
          nameCollection: 'comprobantes',
          enviromentClienteId: clienteId,
          filters: { codigo: ajusteTributos.codigoComprobanteVentas, periodoId: periodo._id, mesPeriodo },
          update: {
            $set: {
              nombre: 'Movimientos de compras',
              isBloqueado: false,
              fechaCreacion: moment().toDate()
            }
          }
        })
      }
    }
    for (const comprobante of comprobantes) {
      const verifyComprobante = await getItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        filters: { facturaAsociada: new ObjectId(comprobante.facturaAsociada), tipoDocumento: tiposDocumentosFiscales.retIva }
      })
      if (verifyComprobante) throw new Error('Ya existe un comprobante para la factura N° ' + comprobante.numeroFacturaAsociada)
      comprobantesCrear.push({
        tipoMovimiento: 'venta',
        tipoDocumento: tiposDocumentosFiscales.retIva,
        numeroFactura: comprobante.numeroFactura,
        facturaAsociada: new ObjectId(comprobante.facturaAsociada),
        tipoDocumentoAfectado: comprobante.tipoDocumentoAfectado,
        fecha: moment(comprobante.fecha).toDate(),
        baseImponible: Number(comprobante.baseImponible.toFixed(2)),
        porcentajeRetenido: Number(comprobante.porcentajeRetenido.toFixed(2)),
        totalCompra: Number(comprobante.totalCompra.toFixed(2)),
        iva: Number(comprobante.iva.toFixed(2)),
        sinDerechoCredito: Number(comprobante.sinDerechoCredito.toFixed(2)),
        totalRetenido: Number(comprobante.totalRetenido.toFixed(2)),
        tipoRetencion: comprobante.tipoRetencion,
        clienteId: new ObjectId(comprobante.clienteId),
        creadoPor: new ObjectId(req.uid),
        tasaDia: Number(comprobante.tasaDia),
        monedaSecundaria: 'USD',
        totalRetenidoSecundario: Number(comprobante.totalRetenidoSecundario.toFixed(2)),
        periodoIvaInit: moment(comprobante.periodoIvaInit).toDate(),
        periodoIvaEnd: moment(comprobante.periodoIvaEnd).toDate(),
        periodoIvaNombre: comprobante.periodoIvaNombre
      })
      if (tieneContabilidad) {
        console.log('entrando')
        const cuentaRet = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(ajusteTributos.cuentaRetIvaVenta) }
        })
        const cuentaCobroRet = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(ajusteTributos.cuentaCobroRetencion) }
        })
        const factura = await getItemSD({
          nameCollection: 'documentosFiscales',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(comprobante.facturaAsociada) }
        })
        const cliente = await getItemSD({
          nameCollection: 'clientes',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(comprobante.clienteId) }
        })
        let terceroCliente = await getItemSD({
          nameCollection: 'terceros',
          enviromentClienteId: clienteId,
          filters: { cuentaId: new ObjectId(cuentaCobroRet._id), nombre: cliente?.razonSocial.toUpperCase() }
        })
        if (!terceroCliente) {
          terceroCliente = await upsertItemSD({
            nameCollection: 'terceros',
            enviromentClienteId: clienteId,
            filters: { cuentaId: new ObjectId(cuentaCobroRet._id), nombre: cliente?.razonSocial.toUpperCase() },
            update: {
              $set: {
                nombre: cliente?.razonSocial.toUpperCase(),
                cuentaId: new ObjectId(cuentaCobroRet._id)
              }
            }
          })
        }
        asientosContables.push({
          cuentaId: new ObjectId(cuentaRet._id),
          cuentaCodigo: cuentaRet.codigo,
          cuentaNombre: cuentaRet.descripcion,
          comprobanteId: new ObjectId(comprobanteContable._id),
          periodoId: new ObjectId(periodo._id),
          descripcion: `COMPROBANTE RET IVA N°${comprobante.numeroFactura} DE ${factura.tipoDocumento}-${factura.numeroFactura}`,
          fecha: moment(comprobante.fecha).toDate(),
          debe: Number(comprobante.totalRetenido.toFixed(2)),
          haber: 0,
          fechaCreacion: moment().toDate(),
          docReferencia: `RET IVA N°${comprobante.numeroFactura}`,
          documento: {
            docReferencia: `RET IVA N°${comprobante.numeroFactura}`,
            docFecha: moment(comprobante.fecha).toDate()
          }
        }, {
          cuentaId: new ObjectId(cuentaCobroRet._id),
          cuentaCodigo: cuentaCobroRet.codigo,
          cuentaNombre: cuentaCobroRet.descripcion,
          comprobanteId: new ObjectId(comprobanteContable._id),
          periodoId: new ObjectId(periodo._id),
          descripcion: `COMPROBANTE RET IVA N°${comprobante.numeroFactura} DE ${factura.tipoDocumento}-${factura.numeroFactura}`,
          fecha: moment(comprobante.fecha).toDate(),
          debe: 0,
          haber: Number(comprobante.totalRetenido.toFixed(2)),
          terceroId: new ObjectId(terceroCliente._id),
          terceroNombre: terceroCliente.nombre,
          fechaCreacion: moment().toDate(),
          docReferencia: `RET IVA N°${comprobante.numeroFactura}`,
          documento: {
            docReferencia: `RET IVA N°${comprobante.numeroFactura}`,
            docFecha: moment(comprobante.fecha).toDate()
          }
        })
      }
    }
    await createManyItemsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      items: [
        ...comprobantesCrear
      ]
    })
    if (asientosContables[0]) await createManyItemsSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, items: [...asientosContables] })
    return res.status(200).json({ status: 'Comprobantes creados exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar los comprobantes ' + e.message })
  }
}
export const getFacturasPorDeclararIva = async (req, res) => {
  const { clienteId, pagina, itemsPorPagina, periodoSelect, tipo } = req.body
  console.log(req.body)
  try {
    const fechaFin = periodoSelect?.fechaFin ? moment(periodoSelect.fechaFin).toDate() : moment().toDate()
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const proveedoresFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const clientesFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'clientes' })
    const facturas = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: tipo,
            tipoDocumento: { $in: [tiposDocumentosFiscales.factura, tiposDocumentosFiscales.notaCredito, tiposDocumentosFiscales.notaDebito] },
            declarado: { $ne: true },
            fecha: { $lte: fechaFin }
          }
        },
        { $skip: (pagina - 1) * itemsPorPagina },
        { $limit: itemsPorPagina },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaAsociada',
            pipeline: [
              { $match: { estado: { $ne: 'anulado' } } },
              {
                $group: {
                  _id: 0,
                  notasDebito: { $sum: { $cond: { if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaDebito] }, then: 1, else: 0 } } },
                  notasCredito: { $sum: { $cond: { if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.notaCredito] }, then: 1, else: 0 } } },
                  retIva: { $sum: { $cond: { if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.retIva] }, then: 1, else: 0 } } },
                  retIslr: { $sum: { $cond: { if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.retIslr] }, then: 1, else: 0 } } }
                }
              }
            ],
            as: 'detallesDocumentos'
          }
        },
        { $unwind: { path: '$detallesDocumentos', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: proveedoresFiscalesCollection,
            localField: 'proveedorId',
            foreignField: '_id',
            as: 'proveedor'
          }
        },
        { $unwind: { path: '$proveedor', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: clientesFiscalesCollection,
            localField: 'clienteId',
            foreignField: '_id',
            as: 'cliente'
          }
        },
        { $unwind: { path: '$cliente', preserveNullAndEmptyArrays: true } }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipoMovimiento: tipo,
            tipoDocumento: { $in: [tiposDocumentosFiscales.factura] },
            declarado: { $ne: true },
            fecha: { $lte: fechaFin }
          }
        },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ facturas, count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las facturas por declarar ' + e.message })
  }
}
export const savePeriodoFactura = async (req, res) => {
  const { clienteId, facturas, periodo } = req.body
  try {
    const idFacturas = facturas.map(factura => new ObjectId(factura._id))
    const datosUpdate = {
      periodoIvaInit: moment(periodo.fechaInicio).toDate(),
      periodoIvaEnd: moment(periodo.fechaFin).toDate(),
      periodoIvaNombre: periodo.periodo
    }
    await updateManyItemSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      filters: { _id: { $in: idFacturas } },
      update: { $set: { ...datosUpdate } }
    })
    return res.status(200).json({ status: 'Periodo asignados a facturas correctamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de asignar los periodos ' + e.message })
  }
}
export const deletePeriodoFactura = async (req, res) => {
  const { clienteId, facturas } = req.body
  try {
    const idFacturas = facturas.map(factura => new ObjectId(factura._id))
    const datosUpdate = {
      periodoIvaInit: null,
      periodoIvaEnd: null,
      periodoIvaNombre: null
    }
    const otrosDocumentosId = await agreggateCollections({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { facturaAsociada: { $in: idFacturas }, tipoDocumento: { $in: [tiposDocumentosFiscales.notaCredito, tiposDocumentosFiscales.notaDebito] } } },
        { $project: { _id: 1 } }
      ]
    })
    await updateManyItemSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      filters: { _id: { $in: idFacturas } },
      update: { $set: { ...datosUpdate, ...otrosDocumentosId } }
    })
    return res.status(200).json({ status: 'Periodo eliminados de las facturas correctamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar los periodos de las facturas ' + e.message })
  }
}
export const saveDocumentosfiscalesToArray = async (req, res) => {
  const { clienteId, documentosFiscales, tipo, moneda, filtros, fechaActual } = req.body
  try {
    const facturas = []
    const debitoCredito = []
    const retIva = []
    const tieneContabilidad = await hasContabilidad({ clienteId })
    /* este for se encarga solo de separar los documentos por tipo */
    for (const documento of documentosFiscales) {
      const tipoDocumento = documento.tipoDocumento.replaceAll(' ', '').toLowerCase()
      if (tipoDocumento === 'nc' || tipoDocumento === 'nd') debitoCredito.push(documento)
      if (tipoDocumento === 'ret') retIva.push(documento)
      if (tipoDocumento === 'fac') facturas.push(documento)
    }
    const clienteOwn = await getItemSD({ nameCollection: 'clientes', filters: { _id: new ObjectId(clienteId) } })
    let cajasList = []
    let cajas = null
    if (filtros.sucursal) {
      cajasList = await agreggateCollectionsSD({
        nameCollection: 'ventascajas',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { sucursalId: { $eq: new ObjectId(filtros.sucursal._id) } } }
        ]
      })
      cajas = cajasList.reduce((acc, caja) => {
        acc[caja.numeroControl] = caja._id
        return acc
      }, {})
    }
    /** funcion que crea las factuas de compra o venta para luego poder asociar id de facturas al resto de documentos */
    await createFacturas({
      documentos: facturas,
      moneda,
      uid: req.uid,
      tipo,
      clienteId: clienteOwn._id,
      clienteOwn,
      filtros,
      tieneContabilidad,
      fechaActual,
      cajas
    })
    /** Luego de crear las facturas crearemos las notas de debito y de credito */
    await createNotasDebitoCredito({
      documentos: debitoCredito,
      moneda,
      uid: req.uid,
      tipo,
      clienteId: clienteOwn._id,
      clienteOwn,
      filtros,
      tieneContabilidad,
      fechaActual,
      cajas
    })
    /** Luego creamos las ret Iva */
    await createRetencionesIva({
      documentos: retIva,
      moneda,
      uid: req.uid,
      tipo,
      clienteId: clienteOwn._id,
      clienteOwn,
      filtros,
      tieneContabilidad,
      fechaActual,
      cajas
    })
    return res.status(200).json({ status: 'Documentos fiscales guardados correctamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar los documentos fiscales ' + e.message })
  }
}
const createFacturas = async ({ documentos, moneda, uid, tipo, clienteId, clienteOwn, filtros, tieneContabilidad, fechaActual, cajas }) => {
  const documentosFacturas = []
  const asientosContables = []
  let cuentaIva = null
  let cuentaCosto = null
  let cuentaPago = null
  let periodo = null
  let comprobante = null
  if (tieneContabilidad) {
    cuentaIva = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(filtros?.cuentaIva?._id) } })
    cuentaCosto = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(filtros?.cuentaCosto?._id) } })
    cuentaPago = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(filtros?.cuentaPago?._id) } })
    if (!cuentaIva) throw new Error('La cuenta de IVA no existe')
    if (!cuentaCosto) throw new Error('La cuenta de gasto o costo  no existe')
    if (!cuentaPago) throw new Error('La cuenta de pago no existe')
    periodo = await getItemSD({
      nameCollection: 'periodos',
      enviromentClienteId: clienteId,
      filters: { fechaInicio: { $lte: moment(fechaActual).toDate() }, fechaFin: { $gte: moment(fechaActual).toDate() } }
    })
    // console.log({ periodo })
    if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha del documento')
    const mesPeriodo = moment(fechaActual).format('YYYY/MM')
    comprobante = await getItemSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      filters: { codigo: filtros.codigoComprobante, periodoId: periodo._id, mesPeriodo }
    })
    if (!comprobante) {
      comprobante = await upsertItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: filtros.codigoComprobante, periodoId: periodo._id, mesPeriodo },
        update: {
          $set: {
            nombre: `Movimientos de ${tipo}s`,
            isBloqueado: false,
            fechaCreacion: moment().toDate()
          }
        }
      })
    }
  }
  for (const documento of documentos) {
    let proveedor = null
    let cliente = null
    if (tipo === 'compra') {
      proveedor = await getItemSD({
        nameCollection: 'proveedores',
        enviromentClienteId: clienteId,
        filters: { tipoDocumento: documento.tipoDocumentoIdentidad, documentoIdentidad: documento.documentoIdentidad }
      })
      if (!proveedor) {
        proveedor = await upsertItemSD({
          nameCollection: 'proveedores',
          enviromentClienteId: clienteId,
          filters: { tipoDocumento: documento.tipoDocumentoIdentidad, documentoIdentidad: documento.documentoIdentidad },
          update: {
            $set: {
              tipoDocumento: documento.tipoDocumentoIdentidad,
              documentoIdentidad: documento.documentoIdentidad,
              razonSocial: documento.razonSocial
            }
          }
        })
      }
      const validarNumeroFactura = await getItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        filters: { numeroFactura: documento.numeroFactura, proveedorId: new ObjectId(proveedor._id) }
      })
      if (validarNumeroFactura) throw new Error(`La factura N° ${documento.numeroFactura} del proveedor ${documento.razonSocial} ya se encuentra registrada`)
      const compra = {
        fechaCreacion: moment().toDate(),
        tipoMovimiento: documento.tipoMovimiento,
        fecha: moment(documento.fecha).toDate(),
        fechaVencimiento: moment().toDate(),
        numeroFactura: documento.numeroFactura,
        tipoDocumento: 'Factura',
        numeroControl: documento.numeroControl,
        proveedorId: new ObjectId(proveedor._id),
        moneda,
        monedaSecundaria: moneda,
        compraFiscal: true,
        baseImponible: documento?.baseImponible ? Number(Number(documento?.baseImponible).toFixed(2)) : 0,
        iva: documento?.iva ? Number(Number(documento?.iva).toFixed(2)) : 0,
        total: documento?.total ? Number(Number(documento?.total).toFixed(2)) : 0,
        baseImponibleSecundaria: documento?.baseImponible ? Number(Number(documento?.baseImponible).toFixed(2)) : 0,
        ivaSecundaria: documento?.iva ? Number(Number(documento?.iva).toFixed(2)) : 0,
        totalSecundaria: documento?.total ? Number(Number(documento?.total).toFixed(2)) : 0,
        creadoPor: new ObjectId(uid),
        sinDerechoCredito: documento.sinDerechoCredito ? Number(Number(documento.sinDerechoCredito).toFixed(2)) : 0,
        noSujeto: documento.noSujeto ? Number(Number(documento.noSujeto).toFixed(2)) : 0,
        exonerado: documento.exonerado ? Number(Number(documento.exonerado).toFixed(2)) : 0,
        exento: documento.exento ? Number(Number(documento.exento).toFixed(2)) : 0,
        totalExento: documento.totalExento ? Number(Number(documento.totalExento).toFixed(2)) : 0,
        aplicaProrrateo: documento.aplicaProrrateo || false,
        isImportacion: documento.isImportacion || false
      }
      documentosFacturas.push(compra)
      if (tieneContabilidad) {
        let tercero = null
        if (filtros.terceros) {
          tercero = await getItemSD({
            nameCollection: 'terceros',
            enviromentClienteId: clienteId,
            filters: { cuentaId: new ObjectId(cuentaPago._id), nombre: proveedor?.razonSocial.toUpperCase() }
          })
          if (!tercero) {
            tercero = await upsertItemSD({
              nameCollection: 'terceros',
              enviromentClienteId: clienteId,
              filters: { cuentaId: new ObjectId(cuentaPago._id), nombre: proveedor?.razonSocial.toUpperCase() },
              update: {
                $set: {
                  nombre: proveedor?.razonSocial.toUpperCase(),
                  cuentaId: new ObjectId(cuentaPago._id)
                }
              }
            })
          }
        }
        const asientos = [
          {
            cuentaId: new ObjectId(cuentaCosto._id),
            cuentaCodigo: cuentaCosto.codigo,
            cuentaNombre: cuentaCosto.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `${compra.tipoDocumento}-${compra.numeroFactura}`,
            fecha: moment(fechaActual).toDate(),
            debe: Number(Number(compra.baseImponible.toFixed(2)) + Number(compra.totalExento.toFixed(2))),
            haber: 0,
            fechaCreacion: moment().toDate(),
            terceroId: tercero ? new ObjectId(tercero._id) : null,
            terceroNombre: tercero ? tercero.nombre : null,
            docReferenciaAux: `${compra.tipoDocumento}-${compra.numeroFactura}`,
            documento: {
              docReferencia: `${compra.tipoDocumento}-${compra.numeroFactura}`,
              docFecha: moment(fechaActual).toDate()
            }
          }, {
            cuentaId: new ObjectId(cuentaPago._id),
            cuentaCodigo: cuentaPago.codigo,
            cuentaNombre: cuentaPago.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `${compra.tipoDocumento}-${compra.numeroFactura}`,
            fecha: moment(fechaActual).toDate(),
            debe: 0,
            haber: Number(Number(compra.total.toFixed(2))),
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `${compra.tipoDocumento}-${compra.numeroFactura}`,
            documento: {
              docReferencia: `${compra.tipoDocumento}-${compra.numeroFactura}`,
              docFecha: moment(fechaActual).toDate()
            }
          }
        ]
        if (compra.iva > 0) {
          asientos.splice(1, 0, {
            cuentaId: new ObjectId(cuentaIva._id),
            cuentaCodigo: cuentaIva.codigo,
            cuentaNombre: cuentaIva.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `${compra.tipoDocumento}-${compra.numeroFactura}`,
            fecha: moment(fechaActual).toDate(),
            debe: compra.iva,
            haber: 0,
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `${compra.tipoDocumento}-${compra.numeroFactura}`,
            documento: {
              docReferencia: `${compra.tipoDocumento}-${compra.numeroFactura}`,
              docFecha: moment(fechaActual).toDate()
            }
          })
        }
        asientosContables.push(...asientos)
      }
    }
    if (tipo === 'venta') {
      cliente = await getItemSD({
        nameCollection: 'clientes',
        enviromentClienteId: clienteId,
        filters: { tipoDocumento: documento.tipoDocumentoIdentidad, documentoIdentidad: documento.documentoIdentidad }
      })
      if (!cliente) {
        cliente = await upsertItemSD({
          nameCollection: 'clientes',
          enviromentClienteId: clienteId,
          filters: { tipoDocumento: documento.tipoDocumentoIdentidad, documentoIdentidad: documento.documentoIdentidad },
          update: {
            $set: {
              tipoDocumento: documento.tipoDocumentoIdentidad,
              documentoIdentidad: documento.documentoIdentidad,
              razonSocial: documento.razonSocial
            }
          }
        })
      }
      if (documento.numeroReporteZ) {
        const validarNumeroFactura = await getItemSD({
          nameCollection: 'documentosFiscales',
          enviromentClienteId: clienteId,
          filters: { numeroFactura: documento.numeroFactura, numeroControl: documento.numeroControl }
        })
        if (validarNumeroFactura) throw new Error(`La factura N° ${documento.numeroFactura} con el N° Control ${documento.numeroControl} ya se encuentra registrada`)
      } else {
        const validarNumeroFactura = await getItemSD({
          nameCollection: 'documentosFiscales',
          enviromentClienteId: clienteId,
          filters: { numeroFactura: documento.numeroFactura }
        })
        if (validarNumeroFactura) throw new Error(`La factura N° ${documento.numeroFactura} ya se encuentra registrada`)
      }
      let caja = null
      let sucursal = null
      if (filtros.sucursal) {
        sucursal = new ObjectId(filtros.sucursal._id)
        if (documento.numeroReporteZ) {
          if (!cajas[documento.numeroControl]) throw new Error(`La caja con el N° control ${documento.numeroControl} no se encuentra registrada`)
          caja = new ObjectId(cajas[documento.numeroControl])
        } else {
          caja = new ObjectId(filtros.caja._id)
        }
      }
      const venta = {
        fechaCreacion: moment().toDate(),
        tipoMovimiento: documento.tipoMovimiento,
        fecha: moment(documento.fecha).toDate(),
        fechaVencimiento: moment().toDate(),
        numeroFactura: documento.numeroFactura,
        tipoDocumento: 'Factura',
        numeroControl: documento.numeroControl,
        numeroReporteZ: documento.numeroReporteZ,
        activo: false,
        sucursalId: sucursal,
        cajaId: caja,
        clienteId: new ObjectId(cliente._id),
        clienteNombre: cliente.razonSocial,
        clienteDocumentoIdentidad: `${cliente.tipoDocumento} - ${cliente.documentoIdentidad}`,
        direccion: cliente?.direccion,
        direccionEnvio: cliente?.direccionEnvio,
        moneda,
        compraFiscal: true,
        baseImponible: documento?.baseImponible ? Number(Number(documento?.baseImponible).toFixed(2)) : 0,
        iva: documento?.iva ? Number(Number(documento?.iva).toFixed(2)) : 0,
        total: documento?.total ? Number(Number(documento?.total).toFixed(2)) : 0,
        baseImponibleSecundaria: documento?.baseImponible ? Number(Number(documento?.baseImponible).toFixed(2)) : 0,
        monedaSecundaria: moneda,
        ivaSecundaria: documento?.iva ? Number(Number(documento?.iva).toFixed(2)) : 0,
        totalSecundaria: documento?.total ? Number(Number(documento?.total).toFixed(2)) : 0,
        creadoPor: new ObjectId(uid),
        exento: documento.exento ? Number(Number(documento.exento).toFixed(2)) : 0,
        totalExento: documento.totalExento ? Number(Number(documento.totalExento).toFixed(2)) : 0,
        isExportacion: documento.isExportacion || false,
        ownLogo: sucursal?.logo || clienteOwn?.logo,
        ownRazonSocial: sucursal?.nombre || clienteOwn?.razonSocial,
        ownDireccion: sucursal?.direccion || clienteOwn?.direccion,
        ownDocumentoIdentidad: sucursal?.rif || `${clienteOwn?.tipoDocumento}-${clienteOwn?.documentoIdentidad}`
      }
      documentosFacturas.push(venta)
      if (tieneContabilidad) {
        let tercero = null
        if (filtros.terceros) {
          tercero = await getItemSD({
            nameCollection: 'terceros',
            enviromentClienteId: clienteId,
            filters: { cuentaId: new ObjectId(cuentaPago._id), nombre: cliente?.razonSocial.toUpperCase() }
          })
          if (!tercero) {
            tercero = await upsertItemSD({
              nameCollection: 'terceros',
              enviromentClienteId: clienteId,
              filters: { cuentaId: new ObjectId(cuentaPago._id), nombre: cliente?.razonSocial.toUpperCase() },
              update: {
                $set: {
                  nombre: cliente?.razonSocial.toUpperCase(),
                  cuentaId: new ObjectId(cuentaPago._id)
                }
              }
            })
          }
        }
        const asientos = [
          {
            cuentaId: new ObjectId(cuentaPago._id),
            cuentaCodigo: cuentaPago.codigo,
            cuentaNombre: cuentaPago.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `${venta.tipoDocumento}-${venta.numeroFactura}`,
            fecha: moment(fechaActual).toDate(),
            debe: Number(Number(venta.total.toFixed(2))),
            haber: 0,
            fechaCreacion: moment().toDate(),
            terceroId: tercero ? new ObjectId(tercero._id) : null,
            terceroNombre: tercero ? tercero.nombre : null,
            docReferenciaAux: `${venta.tipoDocumento}-${venta.numeroFactura}`,
            documento: {
              docReferencia: `${venta.tipoDocumento}-${venta.numeroFactura}`,
              docFecha: moment(fechaActual).toDate()
            }
          },
          {
            cuentaId: new ObjectId(cuentaCosto._id),
            cuentaCodigo: cuentaCosto.codigo,
            cuentaNombre: cuentaCosto.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `${venta.tipoDocumento}-${venta.numeroFactura}`,
            fecha: moment(fechaActual).toDate(),
            debe: 0,
            haber: Number(Number(venta.baseImponible.toFixed(2)) + Number(venta.totalExento.toFixed(2))),
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `${venta.tipoDocumento}-${venta.numeroFactura}`,
            documento: {
              docReferencia: `${venta.tipoDocumento}-${venta.numeroFactura}`,
              docFecha: moment(fechaActual).toDate()
            }
          }
        ]
        if (venta.iva > 0) {
          asientos.push({
            cuentaId: new ObjectId(cuentaIva._id),
            cuentaCodigo: cuentaIva.codigo,
            cuentaNombre: cuentaIva.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `${venta.tipoDocumento}-${venta.numeroFactura}`,
            fecha: moment(fechaActual).toDate(),
            debe: 0,
            haber: venta.iva,
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `${venta.tipoDocumento}-${venta.numeroFactura}`,
            documento: {
              docReferencia: `${venta.tipoDocumento}-${venta.numeroFactura}`,
              docFecha: moment(fechaActual).toDate()
            }
          })
        }
        asientosContables.push(...asientos)
      }
    }
  }
  if (documentosFacturas[0]) {
    await createManyItemsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      items: documentosFacturas
    })
  }
  if (asientosContables[0]) {
    createManyItemsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      items: asientosContables
    })
  }
}
const createNotasDebitoCredito = async ({ documentos, moneda, uid, tipo, clienteId, clienteOwn, sucursal, filtros, fechaActual, tieneContabilidad, cajas }) => {
  const documentosFiscales = []
  const asientosContables = []
  let cuentaIva = null
  let cuentaCosto = null
  let cuentaPago = null
  let periodo = null
  let comprobante = null
  if (tieneContabilidad) {
    cuentaIva = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(filtros?.cuentaIva?._id) } })
    cuentaCosto = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(filtros?.cuentaCosto?._id) } })
    cuentaPago = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(filtros?.cuentaPago?._id) } })
    if (!cuentaIva) throw new Error('La cuenta de IVA no existe')
    if (!cuentaCosto) throw new Error('La cuenta de gasto o costo  no existe')
    if (!cuentaPago) throw new Error('La cuenta de pago no existe')
    periodo = await getItemSD({
      nameCollection: 'periodos',
      enviromentClienteId: clienteId,
      filters: { fechaInicio: { $lte: moment(fechaActual).toDate() }, fechaFin: { $gte: moment(fechaActual).toDate() } }
    })
    // console.log({ periodo })
    if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha del documento')
    const mesPeriodo = moment(fechaActual).format('YYYY/MM')
    comprobante = await getItemSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      filters: { codigo: filtros.codigoComprobante, periodoId: periodo._id, mesPeriodo }
    })
    if (!comprobante) {
      comprobante = await upsertItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: filtros.codigoComprobante, periodoId: periodo._id, mesPeriodo },
        update: {
          $set: {
            nombre: `Movimientos de ${tipo}s`,
            isBloqueado: false,
            fechaCreacion: moment().toDate()
          }
        }
      })
    }
  }
  const tiposDocumentos = {
    nd: 'Nota de débito',
    nc: 'Nota de crédito'
  }
  for (const documento of documentos) {
    let proveedor
    let cliente
    if (tipo === 'compra') {
      proveedor = await getItemSD({
        nameCollection: 'proveedores',
        enviromentClienteId: clienteId,
        filters: { tipoDocumento: documento.tipoDocumentoIdentidad, documentoIdentidad: documento.documentoIdentidad }
      })
      if (!proveedor && documento.documentoIdentidad) {
        proveedor = await upsertItemSD({
          nameCollection: 'proveedores',
          enviromentClienteId: clienteId,
          filters: { tipoDocumento: documento.tipoDocumentoIdentidad, documentoIdentidad: documento.documentoIdentidad },
          update: {
            $set: {
              tipoDocumento: documento.tipoDocumentoIdentidad,
              documentoIdentidad: documento.documentoIdentidad,
              razonSocial: documento.razonSocial
            }
          }
        })
      }
      const validarNumeroFactura = await getItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        filters: { numeroFactura: documento.numeroFactura, proveedorId: new ObjectId(proveedor._id) }
      })
      if (validarNumeroFactura) throw new Error(`La ${tiposDocumentos[documento?.tipoDocumento?.replaceAll(' ', '')?.toLowerCase()]} N° ${documento.numeroFactura} del proveedor ${documento.razonSocial} ya se encuentra registrada`)
      const facturaAfectada = await getItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        filters: { numeroFactura: documento.numeroFacturaAfectada, proveedorId: proveedor._id }
      })
      if (!facturaAfectada) throw new Error(`La factura N° ${documento.numeroFacturaAfectada} no se encuentra registrada`)
      const compra = {
        fechaCreacion: moment().toDate(),
        tipoMovimiento: documento.tipoMovimiento,
        facturaAsociada: facturaAfectada?._id,
        fecha: moment(documento.fecha).toDate(),
        fechaVencimiento: moment().toDate(),
        numeroFactura: documento.numeroFactura,
        tipoDocumento: tiposDocumentos[documento?.tipoDocumento?.replaceAll(' ', '')?.toLowerCase()],
        numeroControl: documento.numeroControl || null,
        proveedorId: proveedor?._id ? new ObjectId(proveedor._id) : null,
        moneda,
        compraFiscal: true,
        baseImponible: documento?.baseImponible ? Number(Number(documento?.baseImponible).toFixed(2)) : 0,
        iva: documento?.iva ? Number(Number(documento?.iva).toFixed(2)) : 0,
        total: documento?.total ? Number(Number(documento?.total).toFixed(2)) : 0,
        monedaSecundaria: moneda,
        ivaSecundaria: documento?.iva ? Number(Number(documento?.iva).toFixed(2)) : 0,
        totalSecundaria: documento?.total ? Number(Number(documento?.total).toFixed(2)) : 0,
        creadoPor: new ObjectId(uid),
        sinDerechoCredito: documento.sinDerechoCredito ? Number(Number(documento.sinDerechoCredito).toFixed(2)) : 0,
        noSujeto: documento.noSujeto ? Number(Number(documento.noSujeto).toFixed(2)) : 0,
        exonerado: documento.exonerado ? Number(Number(documento.exonerado).toFixed(2)) : 0,
        exento: documento.exento ? Number(Number(documento.exento).toFixed(2)) : 0,
        totalExento: documento.totalExento ? Number(Number(documento.totalExento).toFixed(2)) : 0,
        aplicaProrrateo: documento.aplicaProrrateo || false,
        isImportacion: documento.isImportacion || false
      }
      if (!documento.documentoIdentidad && documento?.razonSocial?.toLowerCase().replaceAll(' ', '') === 'anulado') {
        compra.estado = 'anulado'
        compra.proveedorId = null
      }
      documentosFiscales.push(compra)
      if (tieneContabilidad && compra.estado !== 'anulado') {
        let tercero = null
        if (filtros.terceros) {
          tercero = await getItemSD({
            nameCollection: 'terceros',
            enviromentClienteId: clienteId,
            filters: { cuentaId: new ObjectId(cuentaPago._id), nombre: proveedor?.razonSocial.toUpperCase() }
          })
          if (!tercero) {
            tercero = await upsertItemSD({
              nameCollection: 'terceros',
              enviromentClienteId: clienteId,
              filters: { cuentaId: new ObjectId(cuentaPago._id), nombre: proveedor?.razonSocial.toUpperCase() },
              update: {
                $set: {
                  nombre: proveedor?.razonSocial.toUpperCase(),
                  cuentaId: new ObjectId(cuentaPago._id)
                }
              }
            })
          }
        }
        if (compra.tipoDocumento === tiposDocumentosFiscales.notaDebito) {
          const asientos = [
            {
              cuentaId: new ObjectId(cuentaCosto._id),
              cuentaCodigo: cuentaCosto.codigo,
              cuentaNombre: cuentaCosto.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${compra.tipoDocumento}-${compra.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: Number(Number(compra.baseImponible.toFixed(2)) + Number(compra.totalExento.toFixed(2))),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${compra.tipoDocumento}-${compra.numeroFactura}`,
              documento: {
                docReferencia: `${compra.tipoDocumento}-${compra.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              }
            }, {
              cuentaId: new ObjectId(cuentaPago._id),
              cuentaCodigo: cuentaPago.codigo,
              cuentaNombre: cuentaPago.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${compra.tipoDocumento}-${compra.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: 0,
              haber: Number(Number(compra.total.toFixed(2))),
              fechaCreacion: moment().toDate(),
              terceroId: tercero ? new ObjectId(tercero._id) : null,
              terceroNombre: tercero ? tercero.nombre : null,
              docReferenciaAux: `${compra.tipoDocumento}-${compra.numeroFactura}`,
              documento: {
                docReferencia: `${compra.tipoDocumento}-${compra.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              }
            }
          ]
          if (compra.iva > 0) {
            asientos.splice(1, 0, {
              cuentaId: new ObjectId(cuentaIva._id),
              cuentaCodigo: cuentaIva.codigo,
              cuentaNombre: cuentaIva.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${compra.tipoDocumento}-${compra.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: compra.iva,
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${compra.tipoDocumento}-${compra.numeroFactura}`,
              documento: {
                docReferencia: `${compra.tipoDocumento}-${compra.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              }
            })
          }
          asientosContables.push(...asientos)
        }
        if (compra.tipoDocumento === tiposDocumentosFiscales.notaCredito) {
          const asientos = [
            {
              cuentaId: new ObjectId(cuentaPago._id),
              cuentaCodigo: cuentaPago.codigo,
              cuentaNombre: cuentaPago.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${compra.tipoDocumento}-${compra.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: Number(Number(compra.total.toFixed(2))),
              haber: 0,
              fechaCreacion: moment().toDate(),
              terceroId: tercero ? new ObjectId(tercero._id) : null,
              terceroNombre: tercero ? tercero.nombre : null,
              docReferenciaAux: `${compra.tipoDocumento}-${compra.numeroFactura}`,
              documento: {
                docReferencia: `${compra.tipoDocumento}-${compra.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              }
            },
            {
              cuentaId: new ObjectId(cuentaCosto._id),
              cuentaCodigo: cuentaCosto.codigo,
              cuentaNombre: cuentaCosto.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${compra.tipoDocumento}-${compra.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: 0,
              haber: Number(Number(compra.baseImponible.toFixed(2)) + Number(compra.totalExento.toFixed(2))),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${compra.tipoDocumento}-${compra.numeroFactura}`,
              documento: {
                docReferencia: `${compra.tipoDocumento}-${compra.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              }
            }
          ]
          if (compra.iva > 0) {
            asientos.push(
              {
                cuentaId: new ObjectId(cuentaIva._id),
                cuentaCodigo: cuentaIva.codigo,
                cuentaNombre: cuentaIva.descripcion,
                comprobanteId: new ObjectId(comprobante._id),
                periodoId: new ObjectId(periodo._id),
                descripcion: `${compra.tipoDocumento}-${compra.numeroFactura}`,
                fecha: moment(fechaActual).toDate(),
                debe: 0,
                haber: compra.iva,
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `${compra.tipoDocumento}-${compra.numeroFactura}`,
                documento: {
                  docReferencia: `${compra.tipoDocumento}-${compra.numeroFactura}`,
                  docFecha: moment(fechaActual).toDate()
                }
              }
            )
          }
          asientosContables.push(...asientos)
        }
      }
    }
    if (tipo === 'venta') {
      cliente = await getItemSD({
        nameCollection: 'clientes',
        enviromentClienteId: clienteId,
        filters: { tipoDocumento: documento.tipoDocumentoIdentidad, documentoIdentidad: documento.documentoIdentidad }
      })
      if (!cliente) {
        cliente = await upsertItemSD({
          nameCollection: 'clientes',
          enviromentClienteId: clienteId,
          filters: { tipoDocumento: documento.tipoDocumentoIdentidad, documentoIdentidad: documento.documentoIdentidad },
          update: {
            $set: {
              tipoDocumento: documento.tipoDocumentoIdentidad,
              documentoIdentidad: documento.documentoIdentidad,
              razonSocial: documento.razonSocial
            }
          }
        })
      }
      const validarNumeroFactura = await getItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        filters: { numeroFactura: documento.numeroFactura }
      })
      // PREGUNTAR VALIDACION PARA NOTAS DE DEBITO Y NOTAS DE CREDITO
      if (validarNumeroFactura) throw new Error(`La ${tiposDocumentos[documento?.tipoDocumento?.replaceAll(' ', '')?.toLowerCase()]} N° ${documento.numeroFactura} del proveedor ${documento.razonSocial} ya se encuentra registrada`)
      const facturaAfectada = await getItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        filters: { numeroFactura: documento.numeroFacturaAfectada }
      })
      if (!facturaAfectada) throw new Error(`La factura N° ${documento.numeroFacturaAfectada} no se encuentra registrada`)
      let caja = null
      let sucursal = null
      if (filtros.sucursal) {
        sucursal = new ObjectId(filtros.sucursal._id)
        if (documento.numeroReporteZ) {
          if (!cajas[documento.numeroControl]) throw new Error(`La caja con el N° control ${documento.numeroControl} no se encuentra registrada`)
          caja = new ObjectId(cajas[documento.numeroControl])
        } else {
          caja = new ObjectId(filtros.caja._id)
        }
      }
      const venta = {
        fechaCreacion: moment().toDate(),
        tipoMovimiento: documento.tipoMovimiento,
        fecha: moment(documento.fecha).toDate(),
        fechaVencimiento: moment().toDate(),
        numeroFactura: documento.numeroFactura,
        facturaAsociada: facturaAfectada?._id,
        tipoDocumento: tiposDocumentos[documento?.tipoDocumento?.replaceAll(' ', '')?.toLowerCase()],
        numeroReporteZ: documento.numeroReporteZ,
        numeroControl: documento.numeroControl,
        activo: false,
        sucursalId: sucursal,
        cajaId: caja,
        clienteId: new ObjectId(cliente._id),
        clienteNombre: cliente.razonSocial,
        clienteDocumentoIdentidad: `${cliente.tipoDocumento} - ${cliente.documentoIdentidad}`,
        direccion: cliente?.direccion,
        direccionEnvio: cliente?.direccionEnvio,
        moneda,
        compraFiscal: true,
        baseImponible: documento?.baseImponible ? Number(Number(documento?.baseImponible).toFixed(2)) : 0,
        iva: documento?.iva ? Number(Number(documento?.iva).toFixed(2)) : 0,
        total: documento?.total ? Number(Number(documento?.total).toFixed(2)) : 0,
        creadoPor: new ObjectId(uid),
        sinDerechoCredito: documento.sinDerechoCredito ? Number(Number(documento.sinDerechoCredito).toFixed(2)) : 0,
        noSujeto: documento.noSujeto ? Number(Number(documento.noSujeto).toFixed(2)) : 0,
        exonerado: documento.exonerado ? Number(Number(documento.exonerado).toFixed(2)) : 0,
        exento: documento.exento ? Number(Number(documento.exento).toFixed(2)) : 0,
        totalExento: documento.totalExento ? Number(Number(documento.totalExento).toFixed(2)) : 0,
        isExportacion: documento.isExportacion || false,
        ownLogo: sucursal?.logo || clienteOwn?.logo,
        ownRazonSocial: sucursal?.nombre || clienteOwn?.razonSocial,
        ownDireccion: sucursal?.direccion || clienteOwn?.direccion,
        ownDocumentoIdentidad: sucursal?.rif || `${clienteOwn?.tipoDocumento}-${clienteOwn?.documentoIdentidad}`
      }
      documentosFiscales.push(venta)
      if (tieneContabilidad && venta.estado !== 'anulado') {
        let tercero = null
        if (filtros.terceros) {
          tercero = await getItemSD({
            nameCollection: 'terceros',
            enviromentClienteId: clienteId,
            filters: { cuentaId: new ObjectId(cuentaPago._id), nombre: cliente?.razonSocial.toUpperCase() }
          })
          if (!tercero) {
            tercero = await upsertItemSD({
              nameCollection: 'terceros',
              enviromentClienteId: clienteId,
              filters: { cuentaId: new ObjectId(cuentaPago._id), nombre: cliente?.razonSocial.toUpperCase() },
              update: {
                $set: {
                  nombre: cliente?.razonSocial.toUpperCase(),
                  cuentaId: new ObjectId(cuentaPago._id)
                }
              }
            })
          }
        }
        if (venta.tipoDocumento === tiposDocumentosFiscales.notaDebito) {
          const asientos = [
            {
              cuentaId: new ObjectId(cuentaPago._id),
              cuentaCodigo: cuentaPago.codigo,
              cuentaNombre: cuentaPago.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${venta.tipoDocumento}-${venta.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: Number(Number(venta.total.toFixed(2))),
              haber: 0,
              fechaCreacion: moment().toDate(),
              terceroId: tercero ? new ObjectId(tercero._id) : null,
              terceroNombre: tercero ? tercero.nombre : null,
              docReferenciaAux: `${venta.tipoDocumento}-${venta.numeroFactura}`,
              documento: {
                docReferencia: `${venta.tipoDocumento}-${venta.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              }
            },
            {
              cuentaId: new ObjectId(cuentaCosto._id),
              cuentaCodigo: cuentaCosto.codigo,
              cuentaNombre: cuentaCosto.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${venta.tipoDocumento}-${venta.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: 0,
              haber: Number(Number(venta.baseImponible.toFixed(2)) + Number(venta.totalExento.toFixed(2))),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${venta.tipoDocumento}-${venta.numeroFactura}`,
              documento: {
                docReferencia: `${venta.tipoDocumento}-${venta.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              }
            }
          ]
          if (venta.iva > 0) {
            asientos.push({
              cuentaId: new ObjectId(cuentaIva._id),
              cuentaCodigo: cuentaIva.codigo,
              cuentaNombre: cuentaIva.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${venta.tipoDocumento}-${venta.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: 0,
              haber: venta.iva,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${venta.tipoDocumento}-${venta.numeroFactura}`,
              documento: {
                docReferencia: `${venta.tipoDocumento}-${venta.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              }
            })
          }
          asientosContables.push(...asientos)
        }
        if (venta.tipoDocumento === tiposDocumentosFiscales.notaCredito) {
          const asientos = [
            {
              cuentaId: new ObjectId(cuentaCosto._id),
              cuentaCodigo: cuentaCosto.codigo,
              cuentaNombre: cuentaCosto.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${venta.tipoDocumento}-${venta.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: Number(Number(venta.baseImponible.toFixed(2)) + Number(venta.totalExento.toFixed(2))),
              haber: 0,
              fechaCreacion: moment().toDate(),
              terceroId: tercero ? new ObjectId(tercero._id) : null,
              terceroNombre: tercero ? tercero.nombre : null,
              docReferenciaAux: `${venta.tipoDocumento}-${venta.numeroFactura}`,
              documento: {
                docReferencia: `${venta.tipoDocumento}-${venta.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              }
            },
            {
              cuentaId: new ObjectId(cuentaPago._id),
              cuentaCodigo: cuentaPago.codigo,
              cuentaNombre: cuentaPago.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${venta.tipoDocumento}-${venta.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: 0,
              haber: Number(Number(venta.total.toFixed(2))),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${venta.tipoDocumento}-${venta.numeroFactura}`,
              documento: {
                docReferencia: `${venta.tipoDocumento}-${venta.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              }
            }
          ]
          if (venta.iva > 0) {
            asientos.splice(1, 0,
              {
                cuentaId: new ObjectId(cuentaIva._id),
                cuentaCodigo: cuentaIva.codigo,
                cuentaNombre: cuentaIva.descripcion,
                comprobanteId: new ObjectId(comprobante._id),
                periodoId: new ObjectId(periodo._id),
                descripcion: `${venta.tipoDocumento}-${venta.numeroFactura}`,
                fecha: moment(fechaActual).toDate(),
                debe: venta.iva,
                haber: 0,
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `${venta.tipoDocumento}-${venta.numeroFactura}`,
                documento: {
                  docReferencia: `${venta.tipoDocumento}-${venta.numeroFactura}`,
                  docFecha: moment(fechaActual).toDate()
                }
              })
          }
          asientosContables.push(...asientos)
        }
      }
    }
  }
  if (documentosFiscales[0]) {
    await createManyItemsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      items: documentosFiscales
    })
  }
  if (asientosContables[0]) {
    createManyItemsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      items: asientosContables
    })
  }
}
const createRetencionesIva = async ({ documentos, moneda, uid, tipo, clienteId, clienteOwn, sucursal, filtros, fechaActual, tieneContabilidad, cajas }) => {
  const documentosFiscales = []
  const bulkWriteFacturasPeriodos = []
  const asientosContables = []
  let cuentaRetIva = null
  let cuentaPago = null
  let periodo = null
  let comprobante = null
  if (tieneContabilidad) {
    cuentaRetIva = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(filtros?.cuentaRetIva?._id) } })
    cuentaPago = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(filtros?.cuentaPago?._id) } })
    if (!cuentaRetIva) throw new Error('La cuenta de retención de IVA no existe')
    if (!cuentaPago) throw new Error('La cuenta de pago no existe')
    periodo = await getItemSD({
      nameCollection: 'periodos',
      enviromentClienteId: clienteId,
      filters: { fechaInicio: { $lte: moment(fechaActual).toDate() }, fechaFin: { $gte: moment(fechaActual).toDate() } }
    })
    // console.log({ periodo })
    if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha del documento')
    const mesPeriodo = moment(fechaActual).format('YYYY/MM')
    comprobante = await getItemSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      filters: { codigo: filtros.codigoComprobante, periodoId: periodo._id, mesPeriodo }
    })
    if (!comprobante) {
      comprobante = await upsertItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: filtros.codigoComprobante, periodoId: periodo._id, mesPeriodo },
        update: {
          $set: {
            nombre: `Movimientos de ${tipo}s`,
            isBloqueado: false,
            fechaCreacion: moment().toDate()
          }
        }
      })
    }
  }
  for (const documento of documentos) {
    let proveedor
    let cliente
    if (tipo === 'compra') {
      proveedor = await getItemSD({
        nameCollection: 'proveedores',
        enviromentClienteId: clienteId,
        filters: { tipoDocumento: documento.tipoDocumentoIdentidad, documentoIdentidad: documento.documentoIdentidad }
      })
      if (!proveedor && documento.documentoIdentidad) {
        proveedor = await upsertItemSD({
          nameCollection: 'proveedores',
          enviromentClienteId: clienteId,
          filters: { tipoDocumento: documento.tipoDocumentoIdentidad, documentoIdentidad: documento.documentoIdentidad },
          update: {
            $set: {
              tipoDocumento: documento.tipoDocumentoIdentidad,
              documentoIdentidad: documento.documentoIdentidad,
              razonSocial: documento.razonSocial
            }
          }
        })
      }
      if (proveedor?._id) {
        const validarNumeroFactura = await getItemSD({
          nameCollection: 'documentosFiscales',
          enviromentClienteId: clienteId,
          filters: { numeroFactura: documento.numeroFactura, proveedorId: new ObjectId(proveedor._id), estado: { $ne: 'anulado' } }
        })
        if (validarNumeroFactura) throw new Error(`La retención N° ${documento.numeroFactura} del proveedor ${documento.razonSocial} ya se encuentra registrada`)
      }
      if (!proveedor) {
        const validarNumeroFactura = await getItemSD({
          nameCollection: 'documentosFiscales',
          enviromentClienteId: clienteId,
          filters: { numeroFactura: documento.numeroFactura, estado: 'anulado' }
        })
        if (validarNumeroFactura) throw new Error(`La retención N° ${documento.numeroFactura} ya se encuentra registrada como anulada`)
      }
      const facturaAfectada = await getItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        filters: { numeroFactura: documento.numeroFacturaAfectada, proveedorId: proveedor?._id }
      })
      if (!facturaAfectada && documento.numeroFacturaAfectada) throw new Error(`La factura N° ${documento.numeroFacturaAfectada} no se encuentra registrada`)
      const compra = {
        fechaCreacion: moment().toDate(),
        tipoMovimiento: documento.tipoMovimiento,
        facturaAsociada: facturaAfectada?._id || null,
        fecha: moment(documento.fecha).toDate(),
        fechaVencimiento: moment().toDate(),
        numeroFactura: documento.numeroFactura,
        tipoDocumento: tiposDocumentosFiscales.retIva,
        tipoDocumentoAfectado: facturaAfectada?.tipoDocumento || null,
        numeroControl: documento.numeroControl || null,
        proveedorId: proveedor?._id ? new ObjectId(proveedor._id) : null,
        moneda,
        monedaSecundaria: moneda,
        compraFiscal: true,
        baseImponible: facturaAfectada?.baseImponible ? Number(Number(facturaAfectada?.baseImponible).toFixed(2)) : 0,
        iva: documento?.baseImponible ? Number(Number(documento?.baseImponible).toFixed(2)) : 0,
        total: documento?.total ? Number(Number(documento?.total).toFixed(2)) : 0,
        creadoPor: new ObjectId(uid),
        sinDerechoCredito: documento.sinDerechoCredito ? Number(Number(documento.sinDerechoCredito).toFixed(2)) : 0,
        noSujeto: documento.noSujeto ? Number(Number(documento.noSujeto).toFixed(2)) : 0,
        exonerado: documento.exonerado ? Number(Number(documento.exonerado).toFixed(2)) : 0,
        exento: documento.exento ? Number(Number(documento.exento).toFixed(2)) : 0,
        totalExento: documento.totalExento ? Number(Number(documento.totalExento).toFixed(2)) : 0,
        totalRetenido: documento.totalRetenido ? Number(Number(documento.totalRetenido).toFixed(2)) : 0,
        totalRetenidoSecundario: documento.totalRetenido ? Number(Number(documento.totalRetenido).toFixed(2)) : 0
      }
      // console.log(documento.periodoIvaNombre)
      if (facturaAfectada) {
        const updatePeriodoFactura = {
          updateOne: {
            filter: { _id: facturaAfectada._id },
            update: {
              $set: {
                periodoIvaNombre: documento.periodoIvaNombre,
                periodoIvaInit: moment(documento.periodoIvaInit).toDate(),
                periodoIvaEnd: moment(documento.periodoIvaEnd).toDate()
              }
            }
          }
        }
        bulkWriteFacturasPeriodos.push(updatePeriodoFactura)
      }
      if (!documento.documentoIdentidad && documento?.razonSocial?.toLowerCase().replaceAll(' ', '') === 'anulado') {
        compra.estado = 'anulado'
        compra.proveedorId = null
      }
      documentosFiscales.push(compra)
      if (tieneContabilidad && compra.estado !== 'anulado') {
        let tercero = null
        if (filtros.terceros) {
          tercero = await getItemSD({
            nameCollection: 'terceros',
            enviromentClienteId: clienteId,
            filters: { cuentaId: new ObjectId(cuentaPago._id), nombre: proveedor?.razonSocial.toUpperCase() }
          })
          if (!tercero) {
            tercero = await upsertItemSD({
              nameCollection: 'terceros',
              enviromentClienteId: clienteId,
              filters: { cuentaId: new ObjectId(cuentaPago._id), nombre: proveedor?.razonSocial.toUpperCase() },
              update: {
                $set: {
                  nombre: proveedor?.razonSocial.toUpperCase(),
                  cuentaId: new ObjectId(cuentaPago._id)
                }
              }
            })
          }
        }
        const asientos = [
          {
            cuentaId: new ObjectId(cuentaPago._id),
            cuentaCodigo: cuentaPago.codigo,
            cuentaNombre: cuentaPago.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `${compra.tipoDocumento}-${compra.numeroFactura}`,
            fecha: moment(fechaActual).toDate(),
            debe: Number(Number(compra.totalRetenido).toFixed(2)),
            haber: 0,
            fechaCreacion: moment().toDate(),
            terceroId: tercero ? new ObjectId(tercero._id) : null,
            terceroNombre: tercero ? tercero.nombre : null,
            docReferenciaAux: `${compra.tipoDocumento}-${compra.numeroFactura}`,
            documento: {
              docReferencia: `${compra.tipoDocumento}-${compra.numeroFactura}`,
              docFecha: moment(fechaActual).toDate()
            }
          },
          {
            cuentaId: new ObjectId(cuentaRetIva._id),
            cuentaCodigo: cuentaRetIva.codigo,
            cuentaNombre: cuentaRetIva.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `${compra.tipoDocumento}-${compra.numeroFactura}`,
            fecha: moment(fechaActual).toDate(),
            debe: 0,
            haber: Number(Number(compra.totalRetenido).toFixed(2)),
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `${compra.tipoDocumento}-${compra.numeroFactura}`,
            documento: {
              docReferencia: `${compra.tipoDocumento}-${compra.numeroFactura}`,
              docFecha: moment(fechaActual).toDate()
            }
          }
        ]
        asientosContables.push(...asientos)
      }
    }
    if (tipo === 'venta') {
      cliente = await getItemSD({
        nameCollection: 'clientes',
        enviromentClienteId: clienteId,
        filters: { tipoDocumento: documento.tipoDocumentoIdentidad, documentoIdentidad: documento.documentoIdentidad }
      })
      if (!cliente) {
        cliente = await upsertItemSD({
          nameCollection: 'clientes',
          enviromentClienteId: clienteId,
          filters: { tipoDocumento: documento.tipoDocumentoIdentidad, documentoIdentidad: documento.documentoIdentidad },
          update: {
            $set: {
              tipoDocumento: documento.tipoDocumentoIdentidad,
              documentoIdentidad: documento.documentoIdentidad,
              razonSocial: documento.razonSocial
            }
          }
        })
      }
      /* if (cliente?._id) {
        const validarNumeroFactura = await getItemSD({
          nameCollection: 'documentosFiscales',
          enviromentClienteId: clienteId,
          filters: { numeroFactura: documento.numeroFactura, estado: { $ne: 'anulado' } }
        })
        if (validarNumeroFactura) throw new Error(`La retención N° ${documento.numeroFactura} del proveedor ${documento.razonSocial} ya se encuentra registrada`)
      }
      if (!cliente) {
        const validarNumeroFactura = await getItemSD({
          nameCollection: 'documentosFiscales',
          enviromentClienteId: clienteId,
          filters: { numeroFactura: documento.numeroFactura, estado: 'anulado' }
        })
        if (validarNumeroFactura) throw new Error(`La retención N° ${documento.numeroFactura} ya se encuentra registrada como anulada`)
      } */
      const facturaAfectada = await getItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        filters: { numeroFactura: documento.numeroFacturaAfectada }
      })
      if (!facturaAfectada && documento.numeroFacturaAfectada) throw new Error(`La factura N° ${documento.numeroFacturaAfectada} no se encuentra registrada`)
      const venta = {
        fechaCreacion: moment().toDate(),
        tipoMovimiento: documento.tipoMovimiento,
        facturaAsociada: facturaAfectada?._id || null,
        fecha: moment(documento.fecha).toDate(),
        fechaVencimiento: moment().toDate(),
        numeroFactura: documento.numeroFactura,
        tipoDocumento: tiposDocumentosFiscales.retIva,
        tipoDocumentoAfectado: facturaAfectada?.tipoDocumento || null,
        numeroControl: documento.numeroControl || null,
        activo: false,
        // sucursalId: sucursal,
        // cajaId: caja,
        clienteId: new ObjectId(cliente._id),
        clienteNombre: cliente.razonSocial,
        clienteDocumentoIdentidad: `${cliente.tipoDocumento} - ${cliente.documentoIdentidad}`,
        direccion: cliente?.direccion,
        direccionEnvio: cliente?.direccionEnvio,
        moneda,
        baseImponible: facturaAfectada?.baseImponible ? Number(Number(facturaAfectada?.baseImponible).toFixed(2)) : 0,
        iva: documento?.baseImponible ? Number(Number(documento?.baseImponible).toFixed(2)) : 0,
        total: documento?.total ? Number(Number(documento?.total).toFixed(2)) : 0,
        creadoPor: new ObjectId(uid),
        exento: documento.exento ? Number(Number(documento.exento).toFixed(2)) : 0,
        totalExento: documento.totalExento ? Number(Number(documento.totalExento).toFixed(2)) : 0,
        totalRetenido: documento.totalRetenido ? Number(Number(documento.totalRetenido).toFixed(2)) : 0,
        ownLogo: sucursal?.logo || clienteOwn?.logo,
        ownRazonSocial: sucursal?.nombre || clienteOwn?.razonSocial,
        ownDireccion: sucursal?.direccion || clienteOwn?.direccion,
        ownDocumentoIdentidad: sucursal?.rif || `${clienteOwn?.tipoDocumento}-${clienteOwn?.documentoIdentidad}`
      }
      if (facturaAfectada) {
        const updatePeriodoFactura = {
          updateOne: {
            filter: { _id: facturaAfectada._id },
            update: {
              $set: {
                periodoIvaNombre: documento.periodoIvaNombre,
                periodoIvaInit: moment(documento.periodoIvaInit).toDate(),
                periodoIvaEnd: moment(documento.periodoIvaEnd).toDate()
              }
            }
          }
        }
        bulkWriteFacturasPeriodos.push(updatePeriodoFactura)
      }
      if (!documento.documentoIdentidad && documento?.razonSocial?.toLowerCase().replaceAll(' ', '') === 'anulado') {
        venta.estado = 'anulado'
        venta.clienteId = null
      }
      documentosFiscales.push(venta)
      if (tieneContabilidad && venta.estado !== 'anulado') {
        let tercero = null
        if (filtros.terceros) {
          tercero = await getItemSD({
            nameCollection: 'terceros',
            enviromentClienteId: clienteId,
            filters: { cuentaId: new ObjectId(cuentaPago._id), nombre: cliente?.razonSocial.toUpperCase() }
          })
          if (!tercero) {
            tercero = await upsertItemSD({
              nameCollection: 'terceros',
              enviromentClienteId: clienteId,
              filters: { cuentaId: new ObjectId(cuentaPago._id), nombre: cliente?.razonSocial.toUpperCase() },
              update: {
                $set: {
                  nombre: cliente?.razonSocial.toUpperCase(),
                  cuentaId: new ObjectId(cuentaPago._id)
                }
              }
            })
          }
        }
        const asientos = [
          {
            cuentaId: new ObjectId(cuentaRetIva._id),
            cuentaCodigo: cuentaRetIva.codigo,
            cuentaNombre: cuentaRetIva.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `${venta.tipoDocumento}-${venta.numeroFactura}`,
            fecha: moment(fechaActual).toDate(),
            debe: Number(Number(venta.totalRetenido).toFixed(2)),
            haber: 0,
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `${venta.tipoDocumento}-${venta.numeroFactura}`,
            documento: {
              docReferencia: `${venta.tipoDocumento}-${venta.numeroFactura}`,
              docFecha: moment(fechaActual).toDate()
            }
          },
          {
            cuentaId: new ObjectId(cuentaPago._id),
            cuentaCodigo: cuentaPago.codigo,
            cuentaNombre: cuentaPago.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `${venta.tipoDocumento}-${venta.numeroFactura}`,
            fecha: moment(fechaActual).toDate(),
            debe: 0,
            haber: Number(Number(venta.totalRetenido).toFixed(2)),
            fechaCreacion: moment().toDate(),
            terceroId: tercero ? new ObjectId(tercero._id) : null,
            terceroNombre: tercero ? tercero.nombre : null,
            docReferenciaAux: `${venta.tipoDocumento}-${venta.numeroFactura}`,
            documento: {
              docReferencia: `${venta.tipoDocumento}-${venta.numeroFactura}`,
              docFecha: moment(fechaActual).toDate()
            }
          }
        ]
        asientosContables.push(...asientos)
      }
    }
  }
  if (documentosFiscales[0]) {
    await createManyItemsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      items: documentosFiscales
    })
  }
  if (bulkWriteFacturasPeriodos[0]) await bulkWriteSD({ nameCollection: 'documentosFiscales', enviromentClienteId: clienteId, pipeline: bulkWriteFacturasPeriodos })
  if (asientosContables[0]) {
    createManyItemsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      items: asientosContables
    })
  }
}
export const getSucursalesList = async (req, res) => {
  const { clienteId } = req.body
  try {
    const sucursales = await agreggateCollectionsSD({
      nameCollection: 'ventassucursales',
      enviromentClienteId: clienteId,
      pipeline: [
      ]
    })
    return res.status(200).json({ sucursales })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener datos de las sucursales' + e.message })
  }
}
export const eliminarDocumentos = async (req, res) => {
  const { clienteId, tipo } = req.body
  try {
    await deleteManyItemsSD({ nameCollection: 'documentosFiscales', enviromentClienteId: clienteId, filters: { tipoMovimiento: tipo } })
    return res.status(200).json({ status: 'Documentos fiscales elkiminados correctamente' })
  } catch (e) {
    console.log(e)
  }
}
export const getCajasSucursalList = async (req, res) => {
  const { clienteId, sucursalId } = req.body
  console.log({ sucursalId })
  try {
    const cajas = await agreggateCollectionsSD({
      nameCollection: 'ventascajas',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { sucursalId: { $eq: new ObjectId(sucursalId) } } }
      ]
    })
    return res.status(200).json({ cajas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener datos de las sucursales' + e.message })
  }
}
