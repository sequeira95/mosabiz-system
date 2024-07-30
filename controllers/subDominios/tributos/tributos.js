import moment from 'moment-timezone'
import { agreggateCollections, agreggateCollectionsSD, createManyItemsSD, formatCollectionName, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { formatearNumeroRetencionIslr, formatearNumeroRetencionIva, subDominioName, tiposDeclaracion, tiposDocumentosFiscales } from '../../../constants.js'
import { ObjectId } from 'mongodb'
import { uploadImg } from '../../../utils/cloudImage.js'
import { hasContabilidad } from '../../../utils/hasContabilidad.js'

export const getCiclos = async (req, res) => {
  const { fecha, tipoImpuesto, isSujetoPasivoEspecial } = req.body
  console.log(fecha, tipoImpuesto)
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
            ...matchConfig
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
  const { clienteId, pagina, itemsPorPagina, periodoSelect, proveedor, numeroFactura, tiposImpuesto, tipo } = req.body
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
            tipoMovimiento: tipo,
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
              { $match: { tipoDocumento: tiposDocumentosFiscales[tiposImpuesto], estado: { $ne: 'anulado' } } }
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
            tipoMovimiento: tipo,
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
              { $match: { tipoDocumento: tiposDocumentosFiscales[tiposImpuesto], estado: { $ne: 'anulado' } } }
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
    const asientosContables = []
    const tieneContabilidad = await hasContabilidad({ clienteId })
    const ajusteCompra = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'compras' } })
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
        filters: { codigo: ajusteCompra.codigoComprobanteCompras, periodoId: periodo._id, mesPeriodo }
      })
      if (!comprobanteContable) {
        comprobanteContable = await upsertItemSD({
          nameCollection: 'comprobantes',
          enviromentClienteId: clienteId,
          filters: { codigo: ajusteCompra.codigoComprobanteCompras, periodoId: periodo._id, mesPeriodo },
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
        creadoPor: new ObjectId(req.uid),
        tipoRetencionAux: comprobante.tipoRetencionAux
      })
      if (tieneContabilidad) {
        console.log('entrando')
        const cuentaRetIslr = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(ajusteCompra.cuentaRetIslrCompra) }
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
    const ajusteCompra = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'compras' } })
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
        filters: { codigo: ajusteCompra.codigoComprobanteCompras, periodoId: periodo._id, mesPeriodo }
      })
      if (!comprobanteContable) {
        comprobanteContable = await upsertItemSD({
          nameCollection: 'comprobantes',
          enviromentClienteId: clienteId,
          filters: { codigo: ajusteCompra.codigoComprobanteCompras, periodoId: periodo._id, mesPeriodo },
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
        filters: { _id: new ObjectId(ajusteCompra.cuentaRetIslrCompra) }
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
    const tieneContabilidad = await hasContabilidad({ clienteId })
    const ajusteCompra = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'compras' } })
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
        filters: { codigo: ajusteCompra.codigoComprobanteCompras, periodoId: periodo._id, mesPeriodo }
      })
      if (!comprobanteContable) {
        comprobanteContable = await upsertItemSD({
          nameCollection: 'comprobantes',
          enviromentClienteId: clienteId,
          filters: { codigo: ajusteCompra.codigoComprobanteCompras, periodoId: periodo._id, mesPeriodo },
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
        creadoPor: new ObjectId(req.uid)
      })
      if (tieneContabilidad) {
        console.log('entrando')
        const cuentaRet = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(ajusteCompra.cuentaRetIva) }
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
  const { clienteId, _id, retenido, observacion, estado, periodoInit, priodoFin, periodo } = req.body
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
