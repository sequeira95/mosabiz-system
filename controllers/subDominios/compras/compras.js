import { agreggateCollections, agreggateCollectionsSD, bulkWriteSD, createItemSD, createManyItemsSD, deleteManyItemsSD, formatCollectionName, getCollectionSD, getItem, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { subDominioName, tipoMovimientosShort, tiposDocumentosFiscales } from '../../../constants.js'
import moment from 'moment-timezone'
import { ObjectId } from 'mongodb'
import { hasInventario } from '../../../utils/validModulos.js'
import { hasContabilidad, validCreateFactura, validPagoFacturas } from '../../../utils/hasContabilidad.js'
import { deleteImg, uploadImg } from '../../../utils/cloudImage.js'

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
export const getListImpuestosIva = async (req, res) => {
  const { pais } = req.body
  console.log(pais)
  try {
    const iva = await agreggateCollections({
      nameCollection: 'iva',
      pipeline: [
        { $match: { pais: { $eq: pais } } }
      ]
    })
    const retiva = await agreggateCollections({
      nameCollection: 'retIva',
      pipeline: [
        { $match: { pais: { $eq: pais } } }
      ]
    })
    return res.status(200).json({ iva, retiva })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar los impuesto de iva ' + e.message })
  }
}
export const getListProductosForCompra = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina } = req.body
  try {
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
    const ivaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'iva' })
    // const matchAlmacen = almacenOrigen ? { almacenId: new ObjectId(almacenOrigen) } : {}
    const alamcenesInvalid = await getCollectionSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Auditoria'] } } })
    const productos = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { activo: { $ne: false } } },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) },
        {
          $lookup: {
            from: ivaCollection,
            localField: 'iva',
            foreignField: '_id',
            as: 'detalleIva'
          }
        },
        { $unwind: { path: '$detalleIva', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: categoriasCollection,
            localField: 'categoria',
            foreignField: '_id',
            as: 'detalleCategoria'
          }
        },
        { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: productorPorAlamcenCollection,
            localField: '_id',
            foreignField: 'productoId',
            pipeline: [
              { $match: { almacenId: { $nin: [null, ...alamcenesInvalid.map(e => e._id)] } } },
              {
                $group: {
                  _id: '$productoId',
                  entrada: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoMovimiento', 'entrada'] }, then: '$cantidad', else: 0
                      }
                    }
                  },
                  salida: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoMovimiento', 'salida'] }, then: '$cantidad', else: 0
                      }
                    }
                  }
                }
              },
              {
                $project: {
                  cantidad: { $subtract: ['$entrada', '$salida'] },
                  entrada: '$entrada',
                  salida: '$salida'
                }
              }
            ],
            as: 'detalleCantidadProducto'
          }
        },
        { $unwind: { path: '$detalleCantidadProducto', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            codigo: '$codigo',
            nombre: '$nombre',
            descripcion: '$descripcion',
            unidad: '$unidad',
            categoriaId: '$categoria',
            categoria: '$detalleCategoria.nombre',
            descuento: '$detalleCategoria.descuento',
            hasDescuento: '$detalleCategoria.hasDescuento',
            utilidad: '$detalleCategoria.utilidad',
            tipoDescuento: '$detalleCategoria.tipoDescuento',
            observacion: '$observacion',
            stock: '$detalleCantidadProducto.cantidad',
            entrada: '$detalleCantidadProducto.entrada',
            salida: '$detalleCantidadProducto.salida',
            moneda: '$moneda',
            isExento: '$isExento',
            precioVenta: '$precioVenta',
            ivaId: '$iva',
            iva: '$detalleIva.iva'
          }
        }
        // { $match: { cantidad: { $gte: 0 } } }
      ]
    })
    const countProductos = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { activo: { $ne: false } } },
        { $count: 'total' }
        // { $match: { cantidad: { $gte: 0 } } }
      ]
    })
    // console.log(productos)
    return res.status(200).json({ productos, countProductos: countProductos.length ? countProductos[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtner datos de los productos' + e.message })
  }
}
export const getServiciosForCompra = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina } = req.body
  try {
    const categoriaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const zonasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonas' })
    const retencionCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'retencionISLR' })
    const servicios = await agreggateCollectionsSD({
      nameCollection: 'servicios',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo: 'compras' } },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) },
        {
          $lookup: {
            from: zonasCollection,
            localField: 'zona',
            foreignField: '_id',
            as: 'detalleZona'
          }
        },
        { $unwind: { path: '$detalleZona', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: categoriaCollection,
            localField: 'categoria',
            foreignField: '_id',
            as: 'detalleCategoria'
          }
        },
        { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: retencionCollection,
            localField: 'retencion',
            foreignField: '_id',
            as: 'detalleRetencion'
          }
        },
        { $unwind: { path: '$detalleRetencion', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            zonaId: '$detalleZona._id',
            zona: '$detalleZona.nombre',
            categoriaId: '$detalleCategoria._id',
            categoria: '$detalleCategoria.nombre',
            descuento: '$detalleCategoria.descuento',
            tipoDescuento: '$detalleCategoria.tipoDescuento',
            hasDescuento: '$detalleCategoria.hasDescuento',
            retencionId: '$detalleRetencion._id',
            retencion: '$detalleRetencion.nombre',
            codigo: 1,
            nombre: 1,
            moneda: 1,
            precio: 1,
            observacion: 1,
            fechaCreacion: 1
          }
        }
      ]
    })
    const countServicios = await agreggateCollectionsSD({
      nameCollection: 'servicios',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo: 'compras' } },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ servicios, countServicios: countServicios.length ? countServicios[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar los servicios ' + e.message })
  }
}
export const createOrdenCompra = async (req, res) => {
  const { clienteId, movimiento, detalleMovimiento, fechaActualMovimiento, fechaVencimientoMovimiento, totalesMovimiento, estado, proveedor, solicitudCompraId } = req.body
  try {
    let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'compra' } }))?.contador
    console.log(contador)
    if (contador) ++contador
    if (!contador) contador = 1
    const newMovimiento = await createItemSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      item: {
        tipoMovimiento: 'compra',
        fecha: moment(fechaActualMovimiento).toDate(),
        fechaVencimiento: moment(fechaVencimientoMovimiento).toDate(),
        tipo: movimiento.tipo,
        estado,
        numeroOrden: contador,
        proveedorId: new ObjectId(proveedor._id),
        moneda: movimiento.moneda,
        monedaSecundaria: movimiento.monedaSecundaria,
        hasIgtf: movimiento.hasIgtf,
        isAgenteRetencionIva: movimiento.isAgenteRetencionIva,
        compraFiscal: movimiento.compraFiscal,
        retISLR: movimiento.retISLR,
        valorRetIva: movimiento?.valorRetIva ? Number(Number(movimiento?.valorRetIva).toFixed(2)) : null,
        codigoRetIslr: movimiento?.valorRetISLR?.codigo || null,
        nombreRetIslr: movimiento?.valorRetISLR?.nombre || null,
        porcenjateIslr: movimiento?.valorRetISLR?.valorRet ? Number(Number(movimiento?.valorRetISLR?.valorRet).toFixed(2)) : null,
        valorBaseImponibleIslr: movimiento?.valorRetISLR?.valorBaseImponible ? Number(Number(movimiento?.valorRetISLR?.valorBaseImponible).toFixed(2)) : null,
        baseImponible: totalesMovimiento?.baseImponible ? Number(Number(totalesMovimiento?.baseImponible).toFixed(2)) : null,
        iva: totalesMovimiento?.iva ? Number(Number(totalesMovimiento?.iva).toFixed(2)) : null,
        retIva: totalesMovimiento?.retIva ? Number(Number(totalesMovimiento?.retIva).toFixed(2)) : null,
        retIslr: totalesMovimiento?.retIslr ? Number(Number(totalesMovimiento?.retIslr).toFixed(2)) : null,
        total: totalesMovimiento?.total ? Number(Number(totalesMovimiento?.total).toFixed(2)) : null,
        baseImponibleSecundaria: totalesMovimiento?.baseImponibleSecundaria ? Number(Number(totalesMovimiento?.baseImponibleSecundaria).toFixed(2)) : null,
        ivaSecundaria: totalesMovimiento?.ivaSecundaria ? Number(Number(totalesMovimiento?.ivaSecundaria).toFixed(2)) : null,
        retIvaSecundaria: totalesMovimiento?.retIvaSecundaria ? Number(Number(totalesMovimiento?.retIvaSecundaria).toFixed(2)) : null,
        retIslrSecundaria: totalesMovimiento?.retIslrSecundaria ? Number(Number(totalesMovimiento?.retIslrSecundaria).toFixed(2)) : null,
        totalSecundaria: totalesMovimiento?.totalSecundaria ? Number(Number(totalesMovimiento?.totalSecundaria).toFixed(2)) : null,
        sinDerechoCredito: totalesMovimiento?.sinDerechoCredito ? Number(Number(Number(totalesMovimiento?.sinDerechoCredito).toFixed(2))) : null,
        noSujeto: totalesMovimiento?.noSujeto ? Number(Number(Number(totalesMovimiento?.noSujeto).toFixed(2))) : null,
        exonerado: totalesMovimiento?.exonerado ? Number(Number(Number(totalesMovimiento?.exonerado).toFixed(2))) : null,
        totalExento: totalesMovimiento?.totalExento ? Number(Number(Number(totalesMovimiento?.totalExento).toFixed(2))) : null,
        sinDerechoCreditoSecundaria: totalesMovimiento?.sinDerechoCreditoSecundaria ? Number(Number(Number(totalesMovimiento?.sinDerechoCreditoSecundaria).toFixed(2))) : null,
        noSujetoSecundaria: totalesMovimiento?.noSujetoSecundaria ? Number(Number(Number(totalesMovimiento?.noSujetoSecundaria).toFixed(2))) : null,
        exoneradoSecundaria: totalesMovimiento?.exoneradoSecundaria ? Number(Number(Number(totalesMovimiento?.exoneradoSecundaria).toFixed(2))) : null,
        exentoSecundaria: totalesMovimiento?.exentoSecundaria ? Number(Number(Number(totalesMovimiento?.exentoSecundaria).toFixed(2))) : null,
        totalExentoSecundaria: totalesMovimiento?.totalExentoSecundaria ? Number(Number(Number(totalesMovimiento?.totalExentoSecundaria).toFixed(2))) : null,
        creadoPor: new ObjectId(req.uid),
        metodoPago: proveedor.metodoPago,
        formaPago: proveedor.formaPago,
        credito: proveedor?.credito || null,
        duracionCredito: proveedor?.duracionCredito || null,
        almacenDestino: movimiento.almacenDestino ? new ObjectId(movimiento.almacenDestino._id) : null,
        tasaDia: movimiento.tasaDia ? Number(movimiento.tasaDia) : null,
        solicitudCompraId: solicitudCompraId ? new ObjectId(solicitudCompraId) : null
      }
    })
    createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        idMovimiento: newMovimiento.insertedId,
        categoria: 'creado',
        tipo: 'Orden de compra',
        fecha: moment().toDate(),
        descripcion: `Orden N° ${contador} creada`,
        creadoPor: new ObjectId(req.uid)
      }
    })
    upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'compra' }, update: { $set: { contador } } })
    const detalle = detalleMovimiento.map(e => {
      return {
        compraId: newMovimiento.insertedId,
        productoId: new ObjectId(e._id),
        codigo: e.codigo,
        descripcion: e.descripcion,
        nombre: e.nombre,
        observacion: e.observacion,
        unidad: e.unidad,
        cantidad: e.cantidad,
        tipo: e.tipo ? e.tipo : 'producto',
        retIslr: e.retIslr,
        costoUnitario: Number(e.costoUnitario),
        baseImponible: Number(e.baseImponible),
        montoIva: e.montoIva ? Number(e.montoIva) : null,
        iva: e.iva ? e.iva : null,
        costoTotal: Number(e.costoTotal)
      }
    })
    await createManyItemsSD({
      nameCollection: 'detalleCompra',
      enviromentClienteId: clienteId,
      items: [
        ...detalle
      ]
    })
    if (solicitudCompraId) {
      updateItemSD({
        nameCollection: 'movimientos',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(solicitudCompraId) },
        update: { $set: { estado: 'recibido' } }
      })
      createItemSD({
        nameCollection: 'historial',
        enviromentClienteId: clienteId,
        item: {
          idMovimiento: new ObjectId(solicitudCompraId),
          categoria: 'creado',
          tipo: 'Movimiento',
          fecha: moment().toDate(),
          descripcion: 'Solicitud de compra aprobada',
          creadoPor: new ObjectId(req.uid)
        }
      })
    }
    return res.status(200).json({ status: `Orden N° ${contador} creada exitosamente` })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la orden de compra ' + e.message })
  }
}
export const getListadoCompras = async (req, res) => {
  const { clienteId, pagina, itemsPorPagina, estado } = req.body
  try {
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const almacenesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const listComprasPendientes = await agreggateCollectionsSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado } },
        { $skip: (pagina - 1) * itemsPorPagina },
        { $limit: itemsPorPagina },
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
            from: almacenesCollection,
            localField: 'almacenDestino',
            foreignField: '_id',
            as: 'detalleAlmacenDestino'
          }
        },
        { $unwind: { path: '$detalleAlmacenDestino', preserveNullAndEmptyArrays: true } },
        {
          $lookup:
            {
              from: subDominioPersonasCollectionsName,
              localField: 'creadoPor',
              foreignField: 'usuarioId',
              as: 'personas'
            }
        },
        { $unwind: { path: '$personas', preserveNullAndEmptyArrays: true } },
        {
          $lookup:
            {
              from: subDominioPersonasCollectionsName,
              localField: 'pagadoPor',
              foreignField: 'usuarioId',
              as: 'pagadoPorDetalle'
            }
        },
        { $unwind: { path: '$pagadoPorDetalle', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            proveedor: '$proveedor.razonSocial',
            almacenDestino: '$detalleAlmacenDestino.nombre',
            almacenDestinoId: '$detalleAlmacenDestino._id',
            creadoPor: '$personas.nombre',
            creadoPorId: '$personas.usuarioId',
            proveedorId: 1,
            numeroOrden: 1,
            fecha: 1,
            fechaVencimiento: 1,
            fechaAprobacion: 1,
            estado: 1,
            moneda: 1,
            monedaSecundaria: 1,
            hasIgtf: 1,
            isAgenteRetencionIva: 1,
            compraFiscal: 1,
            retISLR: 1,
            valorRetIva: 1,
            codigoRetIslr: 1,
            nombreRetIslr: 1,
            porcenjateIslr: 1,
            valorBaseImponibleIslr: 1,
            baseImponible: 1,
            iva: 1,
            retIva: 1,
            retIslr: 1,
            total: 1,
            baseImponibleSecundaria: 1,
            ivaSecundaria: 1,
            retIvaSecundaria: 1,
            retIslrSecundaria: 1,
            totalSecundaria: 1,
            tasaDia: 1,
            fechaPago: 1,
            pagadoPor: '$pagadoPorDetalle.nombre',
            pagadoPorId: '$pagadoPorDetalle.usuarioId',
            statusInventario: 1
          }
        }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado } },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ listComprasPendientes, count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las compras pendientes ' + e.message })
  }
}
export const getDataCompra = async (req, res) => {
  const { clienteId, compraId } = req.body
  try {
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const almacenesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const detalleCompraCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleCompra' })
    const compra = await agreggateCollectionsSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { _id: new ObjectId(compraId) } },
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
            from: almacenesCollection,
            localField: 'almacenDestino',
            foreignField: '_id',
            as: 'almacenDestino'
          }
        },
        { $unwind: { path: '$almacenDestino', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: detalleCompraCollection,
            localField: '_id',
            foreignField: 'compraId',
            as: 'detalleCompra'
          }
        }
      ]
    })
    return res.status(200).json({ compra: compra[0] ? compra[0] : null })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las compras pendientes ' + e.message })
  }
}
export const cancelarCompra = async (req, res) => {
  const { clienteId, compraId, observacion } = req.body
  try {
    updateItemSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(compraId) },
      update: { $set: { estado: 'cancelada', observacion } }
    })
    return res.status(200).json({ status: 'Orden cancelada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de cancelar esta orden ' + e.message })
  }
}
export const aprobarOrdenCompra = async (req, res) => {
  const { clienteId, compraId, fechaAprobacion } = req.body
  try {
    updateItemSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(compraId) },
      update: { $set: { estado: 'aprobada', fechaAprobacion: moment(fechaAprobacion).toDate() } }
    })
    createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        idMovimiento: new ObjectId(compraId),
        categoria: 'editado',
        tipo: 'Orden de compra',
        fecha: moment().toDate(),
        descripcion: 'Orden aprobada',
        creadoPor: new ObjectId(req.uid)
      }
    })
    return res.status(200).json({ status: 'Orden aprobada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de aprobar esta orden ' + e.message })
  }
}
export const editOrden = async (req, res) => {
  console.log(req.body)
  const {
    clienteId,
    numeroOrden,
    _id,
    fechaVencimiento,
    moneda,
    monedaSecundaria,
    hasIgtf,
    isAgenteRetencionIva,
    compraFiscal,
    retISLR,
    valorRetIva,
    valorRetISLR,
    baseImponible,
    iva,
    retIva,
    retIslr,
    total,
    baseImponibleSecundaria,
    ivaSecundaria,
    retIvaSecundaria,
    retIslrSecundaria,
    totalSecundaria,
    tasaDia,
    metodoPago,
    formaPago,
    credito,
    duracionCredito,
    almacenDestino,
    proveedor,
    detalleCompra
  } = req.body
  try {
    await updateItemSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          fechaVencimiento: moment(fechaVencimiento).toDate(),
          estado: 'pendientePorAprobar',
          proveedorId: new ObjectId(proveedor._id),
          moneda,
          monedaSecundaria,
          hasIgtf,
          isAgenteRetencionIva,
          compraFiscal,
          retISLR,
          valorRetIva: valorRetIva ? Number(valorRetIva) : null,
          codigoRetIslr: valorRetISLR?.codigo || null,
          nombreRetIslr: valorRetISLR?.nombre || null,
          porcenjateIslr: valorRetISLR?.valorRet ? Number(valorRetISLR?.valorRet) : null,
          valorBaseImponibleIslr: valorRetISLR?.valorBaseImponible ? Number(valorRetISLR?.valorBaseImponible) : null,
          baseImponible: baseImponible ? Number(baseImponible) : null,
          iva: iva ? Number(iva) : null,
          retIva: retIva ? Number(retIva) : null,
          retIslr: retIslr ? Number(retIslr) : null,
          total: total ? Number(total) : null,
          baseImponibleSecundaria: baseImponibleSecundaria ? Number(baseImponibleSecundaria) : null,
          ivaSecundaria: ivaSecundaria ? Number(ivaSecundaria) : null,
          retIvaSecundaria: retIvaSecundaria ? Number(retIvaSecundaria) : null,
          retIslrSecundaria: retIslrSecundaria ? Number(retIslrSecundaria) : null,
          totalSecundaria: totalSecundaria ? Number(totalSecundaria) : null,
          metodoPago,
          formaPago,
          credito: credito || null,
          duracionCredito: duracionCredito || null,
          almacenDestino: almacenDestino ? new ObjectId(almacenDestino._id) : null,
          tasaDia: tasaDia ? Number(tasaDia) : null

        }
      }
    })
    createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        idMovimiento: _id,
        categoria: 'editado',
        tipo: 'Orden de compra',
        fecha: moment().toDate(),
        descripcion: `Factura N° ${numeroOrden} editada`,
        creadoPor: new ObjectId(req.uid)
      }
    })
    await deleteManyItemsSD({
      nameCollection: 'detalleCompra',
      enviromentClienteId: clienteId,
      filters: { compraId: new ObjectId(_id) }
    })
    const detalle = detalleCompra.map(e => {
      return {
        compraId: new ObjectId(_id),
        productoId: new ObjectId(e.productoId),
        codigo: e.codigo,
        descripcion: e.descripcion,
        nombre: e.nombre,
        observacion: e.observacion,
        unidad: e.unidad,
        cantidad: e.cantidad,
        tipo: e.tipo,
        retIslr: e.retIslr,
        costoUnitario: Number(e.costoUnitario),
        baseImponible: Number(e.baseImponible),
        montoIva: e.montoIva ? Number(e.montoIva) : null,
        iva: e.iva ? Number(e.iva) : null,
        costoTotal: Number(e.costoTotal)
      }
    })
    createManyItemsSD({
      nameCollection: 'detalleCompra',
      enviromentClienteId: clienteId,
      items: [
        ...detalle
      ]
    })
    return res.status(200).json({ status: `Orden N° ${numeroOrden} actualizada` })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la orden de compra ' + e.message })
  }
}
export const aprobarPagosOrdenCompra = async (req, res) => {
  const { clienteId, compraId, fechaAprobacionPagos } = req.body
  try {
    const tieneInventario = await hasInventario({ clienteId })
    const almacenTransito = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Transito' } })
    const productosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productos' })
    const categoriaPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorAlmacen' })
    const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
    const detalleCompraCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleCompra' })
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const detalleCompra = await agreggateCollectionsSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { _id: new ObjectId(compraId) } },
        {
          $lookup: {
            from: detalleCompraCollection,
            localField: '_id',
            foreignField: 'compraId',
            pipeline: [
              { $match: { tipo: 'producto' } },
              {
                $lookup: {
                  from: productosCollection,
                  localField: 'productoId',
                  foreignField: '_id',
                  as: 'detalleProducto'
                }
              },
              { $unwind: { path: '$detalleProducto', preserveNullAndEmptyArrays: true } },
              {
                $lookup: {
                  from: categoriaPorAlmacenCollection,
                  localField: 'detalleProducto.categoria',
                  foreignField: 'categoriaId',
                  pipeline: [
                    { $match: { almacenId: new ObjectId(almacenTransito._id) } }
                  ],
                  as: 'categoriaAlmacen'
                }
              },
              { $unwind: { path: '$categoriaAlmacen', preserveNullAndEmptyArrays: true } },
              {
                $lookup: {
                  from: planCuentaCollection,
                  localField: 'categoriaAlmacen.cuentaId',
                  foreignField: '_id',
                  as: 'cuentaTransito'
                }
              },
              { $unwind: { path: '$cuentaTransito', preserveNullAndEmptyArrays: true } }
            ],
            as: 'detalleCompra'
          }
        },
        {
          $lookup: {
            from: proveedoresCollection,
            localField: 'proveedorId',
            foreignField: '_id',
            pipeline: [
              {
                $lookup: {
                  from: categoriasCollection,
                  localField: 'categoria',
                  foreignField: '_id',
                  as: 'detalleCategoria'
                }
              },
              { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } }
            ],
            as: 'detalleProveedor'
          }
        },
        { $unwind: { path: '$detalleProveedor', preserveNullAndEmptyArrays: true } }
      ]
    })
    const detalleRecepcionInventario = []
    let movimientoInventario = null
    if (detalleCompra[0]) {
      if (tieneInventario) {
        let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'recepcion' } }))?.contador
        console.log(contador)
        if (contador) ++contador
        if (!contador) contador = 1
        upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'recepcion' }, update: { $set: { contador } } })
        movimientoInventario = await createItemSD({
          nameCollection: 'movimientos',
          enviromentClienteId: clienteId,
          item: {
            fecha: moment(fechaAprobacionPagos).toDate(),
            fechaVencimiento: null,
            tipo: 'recepcion',
            almacenOrigen: null,
            almacenDestino: null, // detalleCompra[0].almacenDestino,
            zona: null,
            compraId: new ObjectId(compraId),
            numeroMovimiento: contador
          }
        })
        createItemSD({
          nameCollection: 'historial',
          enviromentClienteId: clienteId,
          item: {
            idMovimiento: movimientoInventario.insertedId,
            categoria: 'creado',
            tipo: 'Movimiento',
            fecha: moment().toDate(),
            descripcion: `Movimiento ${tipoMovimientosShort.recepcion}-${contador} creado`,
            creadoPor: new ObjectId(req.uid)
          }
        })
        for (const detalle of detalleCompra[0]?.detalleCompra) {
          if (detalle.tipo !== 'producto') continue
          detalleRecepcionInventario.push({
            movimientoId: movimientoInventario.insertedId,
            productoId: new ObjectId(detalle.productoId),
            codigo: detalle.detalleProducto.codigo,
            descripcion: detalle.detalleProducto.descripcion,
            nombre: detalle.detalleProducto.nombre,
            observacion: detalle.detalleProducto.observacion,
            unidad: detalle.detalleProducto.unidad,
            cantidad: detalle.cantidad,
            costoUnitario: Number(detalle.costoUnitario)
          })
        }
      }
    }
    updateItemSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(compraId) },
      update: { $set: { estado: 'porRecibir', fechaAprobacionPagos: moment(fechaAprobacionPagos).toDate(), statusInventario: 'Pendiente' } }
    })
    createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        idMovimiento: new ObjectId(compraId),
        categoria: 'editado',
        tipo: 'Orden de compra',
        fecha: moment().toDate(),
        descripcion: 'Cambio de estado a pendiente por pago',
        creadoPor: new ObjectId(req.uid)
      }
    })
    if (tieneInventario) {
      createManyItemsSD({
        nameCollection: 'detalleMovimientos',
        enviromentClienteId: clienteId,
        items: detalleRecepcionInventario
      })
    }
    return res.status(200).json({ status: 'Orden aprobada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de aprobar esta orden ' + e.message })
  }
}
export const getDataOrdenesComprasPorPagar = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina, fechaActual, timeZone, rangoFechaVencimiento, fechaTasa, monedaPrincipal } = req.body
  try {
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const transaccionesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'transacciones' })
    const rango1 = rangoFechaVencimiento
    const rango2 = rangoFechaVencimiento * 2
    const rango3 = rangoFechaVencimiento * 3
    let tasa = await getItem({ nameCollection: 'tasas', filters: { fechaUpdate: fechaTasa, monedaPrincipal } })
    if (!tasa) {
      const ultimaTasa = await agreggateCollections({
        nameCollection: 'tasas',
        pipeline: [
          { $sort: { fechaOperacion: -1 } },
          { $limit: 1 }
        ]
      })
      tasa = ultimaTasa[0] ? ultimaTasa[0] : null
    }
    console.log({ fechaTasa, tasa })
    console.log({ fechaActual })
    const conteosPendientesPorPago = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: { $ne: 'pagada' }, tipoDocumento: { $in: ['Factura', 'Nota de entrega'] }, fecha: { $lte: moment(fechaActual).endOf('day').toDate() } } },
        {
          $addFields: {
            tasa: { $objectToArray: tasa }
          }
        },
        { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
        { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
        {
          $addFields: {
            valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
          }
        },
        {
          $lookup: {
            from: transaccionesCollection,
            localField: '_id',
            foreignField: 'documentoId',
            pipeline: [
              { $match: { fechaPago: { $lte: moment(fechaActual).endOf('day').toDate() } } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$pagoSecundario'] }
                }
              },
              {
                $group: {
                  _id: '$documentoId',
                  totalAbono: { $sum: '$valor' },
                  totalAbonoPrincipal: { $sum: '$pago' },
                  totalAbonoSecondario: { $sum: '$pagoSecundario' }
                }
              }
            ],
            as: 'detalleTransacciones'
          }
        },
        { $unwind: { path: '$detalleTransacciones', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaAsociada',
            pipeline: [
              // { $match: { tipoDocumento: 'Nota de débito' } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
                }
              },
              {
                $group: {
                  _id: 0,
                  totalNotaDebito: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de débito'] },
                        then: '$valor',
                        else: 0
                      }
                    }
                  }, // { $sum: '$valor' },
                  totalNotaDebitoPrincipal: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de débito'] },
                        then: '$total',
                        else: 0
                      }
                    }
                  }, // { $sum: '$total' },
                  totalNotaDebitoSecundario: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de débito'] },
                        then: '$totalSecundaria',
                        else: 0
                      }
                    }
                  }, // { $sum: '$totalSecundaria' }
                  totalNotaCredito: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$valor',
                        else: 0
                      }
                    }
                  },
                  totalNotaCreditoPrincipal: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$total',
                        else: 0
                      }
                    }
                  },
                  totalNotaCreditoSecundario: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$totalSecundaria',
                        else: 0
                      }
                    }
                  }
                  /* totalRetencionIslr: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', tiposDocumentosFiscales.retIslr] },
                        then: '$valor',
                        else: 0
                      }
                    }
                  } */
                }
              }
            ],
            as: 'creditoDebito'
          }
        },
        { $unwind: { path: '$creditoDebito', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            tasa: '$tasa',
            valor: '$valor',
            numeroFactura: '$numeroFactura',
            fechaVencimiento: '$fechaVencimiento',
            diffFechaVencimiento:
            {
              $dateDiff: { startDate: moment(fechaActual).toDate(), endDate: '$fechaVencimiento', unit: 'day', timezone: timeZone }
            },
            // total: '$total',
            // totalSecundaria: '$totalSecundaria',
            monedaSecundaria: '$monedaSecundaria',
            detalleTransacciones: '$detalleTransacciones',
            // totalAbono: '$detalleTransacciones.totalAbono',
            // hasAbono: { $ifNull: ['$detalleTransacciones.totalAbono', false] },
            // totalAbonoPrincipal: '$detalleTransacciones.totalAbonoPrincipal',
            // totalAbonoSecondario: '$detalleTransacciones, totalAbonoSecondario',
            // totalNotaCredito: { $ifNull: ['$creditoDebito.totalNotaCredito', 0] },
            // totalNotaCreditoPrincipal: { $ifNull: ['$creditoDebito.totalNotaCreditoPrincipal', 0] },
            // totalNotaCreditoSecundario: { $ifNull: ['$creditoDebito.totalNotaCreditoSecundario', 0] },
            // totalNotaDebito: { $ifNull: ['$creditoDebito.totalNotaDebito', 0] },
            // totalNotaDebitoPrincipal: { $ifNull: ['$creditoDebito.totalNotaDebitoPrincipal', 0] },
            // totalNotaDebitoSecundario: { $ifNull: ['$creditoDebito.totalNotaDebitoSecundario', 0] },
            totalTransaccion: {
              $subtract: [
                { $add: ['$valor', { $ifNull: ['$creditoDebito.totalNotaDebito', 0] }] },
                { $add: [{ $ifNull: ['$detalleTransacciones.totalAbono', 0] }, { $ifNull: ['$creditoDebito.totalNotaCredito', 0] }] }
              ]
            }
            // totalPorPagar: { $subtract: ['$total', '$detalleTransacciones.totalAbono'] }
          }
        },
        {
          $group: {
            _id: 0,
            /* rango1: {
              $sum: {
                $cond: {
                  if: {
                    $and: [{ $gte: ['$diffFechaVencimiento', 0] }, { $lte: ['$diffFechaVencimiento', rango1] }]
                  },
                  then: 1,
                  else: 0
                }
              }
            },
            rango2: {
              $sum: {
                $cond: {
                  if: {
                    $and: [{ $gt: ['$diffFechaVencimiento', rango1] }, { $lte: ['$diffFechaVencimiento', rango2] }]
                  },
                  then: 1,
                  else: 0
                }
              }
            },
            rango3: {
              $sum: {
                $cond: {
                  if: {
                    $and: [{ $gt: ['$diffFechaVencimiento', rango2] }, { $lte: ['$diffFechaVencimiento', rango3] }]
                  },
                  then: 1,
                  else: 0
                }
              }
            },
            rango1Vencido: {
              $sum: {
                $cond: {
                  if: {
                    $and: [{ $lte: ['$diffFechaVencimiento', 0] }, { $gte: ['$diffFechaVencimiento', (rango1 * -1)] }]
                  },
                  then: 1,
                  else: 0
                }
              }
            },
            rango2Vencido: {
              $sum: {
                $cond: {
                  if: {
                    $and: [{ $lt: ['$diffFechaVencimiento', (rango1 * -1)] }, { $gte: ['$diffFechaVencimiento', (rango2 * -1)] }]
                  },
                  then: 1,
                  else: 0
                }
              }
            },
            rango3Vencido: {
              $sum: {
                $cond: {
                  if: {
                    $and: [{ $lt: ['$diffFechaVencimiento', (rango2 * -1)] }, { $gte: ['$diffFechaVencimiento', (rango3 * -1)] }]
                  },
                  then: 1,
                  else: 0
                }
              }
            },
            totalAbono: {
              $sum: {
                $cond: { if: { $ne: ['$hasAbono', false] }, then: '$totalAbono', else: 0 }
              }
            },
            totalPricipal: { $sum: '$total' },
            totalSecundario: { $sum: '$totalSecundaria' },
            total: { $sum: '$valor' },
            totalNotaDebito: { $sum: '$totalNotaDebito' },
            totalNotaCredito: { $sum: '$totalNotaCredito' }, */
            rangoVencidos: {
              $sum: {
                $cond: {
                  if: { $lt: ['$diffFechaVencimiento', 0] }, then: '$totalTransaccion', else: 0
                }
              }
            },
            rango1: {
              $sum: {
                $cond: {
                  if: {
                    $and: [{ $gte: ['$diffFechaVencimiento', 0] }, { $lte: ['$diffFechaVencimiento', rango1] }]
                  },
                  then: '$totalTransaccion',
                  else: 0
                }
              }
            },
            rango2: {
              $sum: {
                $cond: {
                  if: {
                    $and: [{ $gt: ['$diffFechaVencimiento', rango1] }, { $lte: ['$diffFechaVencimiento', rango2] }]
                  },
                  then: '$totalTransaccion',
                  else: 0
                }
              }
            },
            rango3: {
              $sum: {
                $cond: {
                  if: {
                    $and: [{ $gt: ['$diffFechaVencimiento', rango2] }, { $lte: ['$diffFechaVencimiento', rango3] }]
                  },
                  then: '$totalTransaccion',
                  else: 0
                }
              }
            },
            rangoOtros: {
              $sum: {
                $cond: {
                  if: { $gt: ['$diffFechaVencimiento', rango3] },
                  then: '$totalTransaccion',
                  else: 0
                }
              }
            },
            totalPorPagar: { $sum: '$totalTransaccion' }
          }
        },
        {
          $project: {
            rangoVencidos: '$rangoVencidos',
            rangoOtros: '$rangoOtros',
            rango1: '$rango1',
            rango2: '$rango2',
            rango3: '$rango3',
            // rango1Vencido: '$rango1Vencido',
            // rango2Vencido: '$rango2Vencido',
            // rango3Vencido: '$rango3Vencido',
            // totalAbono: '$totalAbono',
            // total: '$total',
            // totalPricipal: '$totalPricipal',
            // totalPorPagar: { $subtract: [{ $add: ['$total', '$totalNotaDebito'] }, { $add: ['$totalAbono', '$totalNotaCredito'] }] },
            // total: { $subtract: [{ $add: ['$total', '$totalNotaDebito'] }, '$totalNotaCredito'] },
            totalPorPagar: '$totalPorPagar'
          }
        }
      ]
    })
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const comprasPorProveedor = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: { $ne: 'pagada' }, tipoDocumento: { $in: ['Factura', 'Nota de entrega'] }, fecha: { $lte: moment(fechaActual).endOf('day').toDate() } } },
        { $sort: { fechaVencimiento: 1 } },
        {
          $lookup: {
            from: transaccionesCollection,
            localField: '_id',
            foreignField: 'documentoId',
            pipeline: [
              { $match: { fechaPago: { $lte: moment(fechaActual).endOf('day').toDate() } } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$pagoSecundario'] }
                }
              },
              {
                $group: {
                  _id: '$documentoId',
                  totalAbono: { $sum: '$valor' },
                  totalAbonoPrincipal: { $sum: '$pago' },
                  totalAbonoSecundario: { $sum: '$pagoSecundario' }
                }
              }
            ],
            as: 'detalleTransacciones'
          }
        },
        { $unwind: { path: '$detalleTransacciones', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaAsociada',
            pipeline: [
              { $match: { fecha: { $lte: moment(fechaActual).endOf('day').toDate() }, tipoDocumento: 'Nota de débito' } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
                }
              },
              {
                $group: {
                  _id: '$facturaAsociada',
                  totalNotaDebito: { $sum: '$valor' },
                  totalNotaDebitoPrincipal: { $sum: '$total' },
                  totalNotaDebitoSecundario: { $sum: '$totalSecundaria' }
                }
              }
            ],
            as: 'detalleNotasDebito'
          }
        },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaAsociada',
            pipeline: [
              // { $match: { tipoDocumento: 'Nota de débito' } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
                }
              },
              {
                $group: {
                  _id: 0,
                  totalNotaDebito: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de débito'] },
                        then: '$valor',
                        else: 0
                      }
                    }
                  }, // { $sum: '$valor' },
                  totalNotaDebitoPrincipal: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de débito'] },
                        then: '$total',
                        else: 0
                      }
                    }
                  }, // { $sum: '$total' },
                  totalNotaDebitoSecundario: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de débito'] },
                        then: '$totalSecundaria',
                        else: 0
                      }
                    }
                  }, // { $sum: '$totalSecundaria' }
                  totalNotaCredito: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$valor',
                        else: 0
                      }
                    }
                  },
                  totalNotaCreditoPrincipal: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$total',
                        else: 0
                      }
                    }
                  },
                  totalNotaCreditoSecundario: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$totalSecundaria',
                        else: 0
                      }
                    }
                  }
                }
              }
            ],
            as: 'creditoDebito'
          }
        },
        { $unwind: { path: '$creditoDebito', preserveNullAndEmptyArrays: true } },
        /* { $unwind: { path: '$detalleNotasDebito', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaAsociada',
            pipeline: [
              { $match: { fecha: { $lte: moment(fechaActual).endOf('day').toDate() }, tipoDocumento: 'Nota de crédito' } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
                }
              },
              {
                $group: {
                  _id: '$facturaAsociada',
                  totalNotaCredito: { $sum: '$valor' },
                  totalNotaCreditoPrincipal: { $sum: '$total' },
                  totalNotaCreditoSecundario: { $sum: '$totalSecundaria' }
                }
              }
            ],
            as: 'detalleNotaCredito'
          }
        },
        { $unwind: { path: '$detalleNotaCredito', preserveNullAndEmptyArrays: true } }, */
        {
          $addFields: {
            tasa: { $objectToArray: tasa }
          }
        },
        { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
        { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
        {
          $addFields: {
            valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
          }
        },
        {
          $group: {
            _id: '$proveedorId',
            fechaVencimiento: { $first: '$fechaVencimiento' },
            costoTotal: { $sum: '$valor' },
            totalPrincipal: { $sum: 'total' },
            totalSecundaria: { $sum: '$totalSecundaria' },
            totalAbono: { $sum: '$detalleTransacciones.totalAbono' },
            totalAbonoPrincipal: { $sum: '$detalleTransacciones.totalAbonoPrincipal' },
            totalAbonoSecundario: { $sum: '$detalleTransacciones.totalAbonoSecundario' },
            totalNotaDebito: { $sum: '$creditoDebito.totalNotaDebito' },
            totalNotaDebitoPrincipal: { $sum: '$creditoDebito.totalNotaDebitoPrincipal' },
            totalNotaDebitoSecundario: { $sum: '$creditoDebito.totalNotaDebitoSecundario' },
            totalNotaCredito: { $sum: '$creditoDebito.totalNotaCredito' },
            totalNotaCreditoPrincipal: { $sum: '$creditoDebito.totalNotaCreditoPrincipal' },
            totalNotaCreditoSecundario: { $sum: '$creditoDebito.totalNotaCreditoSecundario' }
          }
        },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) },
        {
          $lookup: {
            from: proveedoresCollection,
            localField: '_id',
            foreignField: '_id',
            as: 'proveedor'
          }
        },
        { $unwind: { path: '$proveedor', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            proveedorId: '$_id',
            proveedor: '$proveedor.razonSocial',
            documentoIdentidad: { $concat: ['$proveedor.tipoDocumento', '-', '$proveedor.documentoIdentidad'] },
            costoTotal2: '$costoTotal',
            totalAbono: '$totalAbono',
            // porPagar: { $subtract: ['$costoTotal', '$totalAbono'] },
            porPagar: { $subtract: [{ $add: ['$costoTotal', { $ifNull: ['$totalNotaDebito', 0] }] }, { $add: ['$totalAbono', '$totalNotaCredito'] }] },
            totalAbonoPrincipal: 'totalAbonoPrincipal',
            totalAbonoSecundario: 'totalAbonoSecundario',
            fechaVencimiento: '$fechaVencimiento',
            monedaSecundaria: '$monedaSecundaria',
            totalSecundaria: '$totalSecundaria',
            totalPrincipal: '$totalPrincipal',
            // costoTotal: { $subtract: [{ $add: ['$costoTotal', { $ifNull: ['$totalNotaDebito', 0] }] }, '$totalNotaCredito'] },
            costoTotal: { $subtract: [{ $add: ['$costoTotal', { $ifNull: ['$totalNotaDebito', 0] }] }, '$totalNotaCredito'] },
            diffFechaVencimiento:
            {
              $dateDiff: { startDate: moment(fechaActual).toDate(), endDate: '$fechaVencimiento', unit: 'day', timezone: timeZone }
            },
            detalleTransacciones: '$detalleTransacciones'
          }
        },
        { $sort: { diffFechaVencimiento: 1 } }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: { $ne: 'pagada' }, tipoDocumento: { $in: ['Factura', 'Nota de entrega'] }, fecha: { $lte: moment(fechaActual).toDate() } } },
        {
          $group: {
            _id: '$proveedorId'
            // count: { $sum: 1 }
          }
        },
        { $count: 'count' }
      ]
    })
    return res.status(200).json({ conteosPendientesPorPago: conteosPendientesPorPago[0], count: count[0]?.count || 0, comprasPorProveedor })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las compras pendientes ' + e.message })
  }
}
export const getDetalleProveedor = async (req, res) => {
  const { clienteId, proveedorId, itemsPorPagina, pagina, fechaActual, timeZone, fechaTasa } = req.body
  try {
    // console.log(moment(fechaActual).endOf('day').toDate())
    let tasa = await getItem({ nameCollection: 'tasas', filters: { fechaUpdate: fechaTasa } })
    if (!tasa) {
      const ultimaTasa = await agreggateCollections({
        nameCollection: 'tasas',
        pipeline: [
          { $sort: { fechaOperacion: -1 } },
          { $limit: 1 }
        ]
      })
      tasa = ultimaTasa[0] ? ultimaTasa[0] : null
    }
    const pagination = []
    if (itemsPorPagina && pagina) {
      pagination.push(
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) }
      )
    }
    const transaccionesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'transacciones' })
    const detalleFacturaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleDocumentosFiscales' })
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const comprasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'compras' })
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const comprasPorProveedor = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match:
          {
            estado: { $ne: 'pagada' },
            tipoDocumento: { $in: ['Factura', 'Nota de entrega'] },
            proveedorId: new ObjectId(proveedorId),
            fecha: { $lte: moment(fechaActual).endOf('day').toDate() }
          }
        },
        { $sort: { fechaVencimiento: 1 } },
        ...pagination,
        {
          $addFields: {
            tasa: { $objectToArray: tasa }
          }
        },
        { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
        { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
        {
          $addFields: {
            valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
          }
        },
        {
          $lookup: {
            from: transaccionesCollection,
            localField: '_id',
            foreignField: 'documentoId',
            pipeline: [
              { $match: { fechaPago: { $lte: moment(fechaActual).endOf('day').toDate() } } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$pagoSecundario'] }
                }
              },
              {
                $group: {
                  _id: '$documentoId',
                  totalAbono: { $sum: '$valor' },
                  totalAbonoPrincipal: { $sum: '$pago' },
                  totalAbonoSecundario: { $sum: '$pagoSecundario' }
                }
              }
            ],
            as: 'detalleTransacciones'
          }
        },
        { $unwind: { path: '$detalleTransacciones', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaAsociada',
            pipeline: [
              // { $match: { tipoDocumento: 'Nota de débito' } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
                }
              },
              {
                $group: {
                  _id: 0,
                  totalNotaDebito: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de débito'] },
                        then: '$valor',
                        else: 0
                      }
                    }
                  }, // { $sum: '$valor' },
                  totalNotaDebitoPrincipal: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de débito'] },
                        then: '$total',
                        else: 0
                      }
                    }
                  }, // { $sum: '$total' },
                  totalNotaDebitoSecundario: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de débito'] },
                        then: '$totalSecundaria',
                        else: 0
                      }
                    }
                  }, // { $sum: '$totalSecundaria' }
                  totalNotaCredito: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$valor',
                        else: 0
                      }
                    }
                  },
                  totalNotaCreditoPrincipal: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$total',
                        else: 0
                      }
                    }
                  },
                  totalNotaCreditoSecundario: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                        then: '$totalSecundaria',
                        else: 0
                      }
                    }
                  }
                }
              }
            ],
            as: 'creditoDebito'
          }
        },
        { $unwind: { path: '$creditoDebito', preserveNullAndEmptyArrays: true } },
        /* {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: '_id',
            foreignField: 'facturaAsociada',
            pipeline: [
              { $match: { tipoDocumento: 'Nota de crédito' } },
              {
                $addFields: {
                  tasa: { $objectToArray: tasa }
                }
              },
              { $unwind: { path: '$tasa', preserveNullAndEmptyArrays: true } },
              { $match: { $expr: { $eq: ['$tasa.k', '$monedaSecundaria'] } } },
              {
                $addFields: {
                  valor: { $multiply: ['$tasa.v', '$totalSecundaria'] }
                }
              },
              {
                $group: {
                  _id: '$facturaAsociada',
                  totalNotaCredito: { $sum: '$valor' },
                  totalNotaCreditoPrincipal: { $sum: '$total' },
                  totalNotaCreditoSecundario: { $sum: '$totalSecundaria' }
                }
              }
            ],
            as: 'detalleNotaCredito'
          }
        },
        { $unwind: { path: '$detalleNotaCredito', preserveNullAndEmptyArrays: true } }, */
        {
          $lookup: {
            from: comprasCollection,
            localField: 'ordenCompraId',
            foreignField: '_id',
            as: 'ordenCompraDetalle'
          }
        },
        { $unwind: { path: '$ordenCompraDetalle', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: 'facturaAsociada',
            foreignField: '_id',
            as: 'facturaDetalle'
          }
        },
        { $unwind: { path: '$facturaDetalle', preserveNullAndEmptyArrays: true } },
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
            from: detalleFacturaCollection,
            localField: '_id',
            foreignField: 'facturaId',
            as: 'productosServicios'
          }
        },
        {
          $project: {
            // costoTotal: { $add: ['$valor', { $ifNull: ['$detalleNotaDebito.totalNotaDebito', 0] }] },
            costoTotal: { $round: [{ $subtract: [{ $add: ['$valor', { $ifNull: ['$creditoDebito.totalNotaDebito', 0] }] }, { $ifNull: ['$creditoDebito.totalNotaCredito', 0] }] }, 2] },
            totalNotaDebito: '$creditoDebito.totalNotaDebito',
            totalNotaDebitoPrincipal: '$creditoDebito.totalNotaDebitoPrincipal',
            totalNotaDebitoSecundario: '$creditoDebito.totalNotaDebitoSecundario',
            totalNotaCredito: '$creditoDebito.totalNotaCredito',
            totalNotaCreditoPrincipal: '$creditoDebito.totalNotaCreditoPrincipal',
            totalNotaCreditoSecundario: '$creditoDebito.totalNotaCreditoSecundario',
            proveedor: '$proveedor',
            productosServicios: '$productosServicios',
            proveedorId: 1,
            numeroFactura: 1,
            totalPrincipal: '$total',
            totalSecundaria: '$totalSecundaria',
            monedaSecundaria: '$monedaSecundaria',
            totalAbono: '$detalleTransacciones.totalAbono',
            // porPagar: { $subtract: [{ $add: ['$valor', { $ifNull: ['$detalleNotaDebito.totalNotaDebito', 0] }] }, '$detalleTransacciones.totalAbono'] },
            porPagar: {
              $round: [{
                $subtract: [
                  {
                    $add:
                    [
                      '$valor',
                      { $ifNull: ['$creditoDebito.totalNotaDebito', 0] }
                    ]
                  },
                  {
                    $add: ['$detalleTransacciones.totalAbono', { $ifNull: ['$creditoDebito.totalNotaCredito', 0] }]
                  }
                ]
              }, 2]
            },
            fechaVencimiento: 1,
            // detalleTransacciones: '$detalleTransacciones',
            diffFechaVencimiento:
            {
              $dateDiff: { startDate: moment(fechaActual).toDate(), endDate: '$fechaVencimiento', unit: 'day', timezone: timeZone }
            },
            fecha: 1,
            tipoDocumento: 1,
            numeroControl: 1,
            moneda: 1,
            hasIgtf: 1,
            isAgenteRetencionIva: 1,
            retISLR: 1,
            valorRetIva: 1,
            codigoRetIslr: 1,
            nombreRetIslr: 1,
            porcenjateIslr: 1,
            valorBaseImponibleIslr: 1,
            baseImponible: 1,
            iva: 1,
            retIva: 1,
            retIslr: 1,
            total: 1,
            baseImponibleSecundaria: 1,
            ivaSecundaria: 1,
            retIvaSecundaria: 1,
            retIslrSecundaria: 1,
            metodoPago: 1,
            formaPago: 1,
            credito: 1,
            duracionCredito: 1,
            tasaDia: 1,
            ordenCompraId: 1,
            facturaAsociada: 1,
            facturaDetalle: 1,
            ordenCompraDetalle: 1,
            totalAbonoSecundario: '$detalleTransacciones.totalAbonoSecundario',
            documentosAdjuntos: 1
          }
        }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match:
          {
            estado: { $ne: 'pagada' },
            tipoDocumento: { $in: ['Factura', 'Nota de entrega'] },
            proveedorId: new ObjectId(proveedorId),
            fecha: { $lte: moment(fechaActual).endOf('day').toDate() }
          }
        },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ comprasPorProveedor, count: count && count[0] ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar el listados de compras del proveedor ' + e.message })
  }
}
export const createPagoOrdenes = async (req, res) => {
  const { clienteId, proveedorId, abonos, tasaDia, fechaPago } = req.body
  // console.log(req.body)
  // console.log({ tasaDia })
  /* contabilidad
    Debe:
    cuenta categoria proveedor
    si tiene igtf se registra en la cuenta de gasto igtf (conmfiguracion de compra)
    haber:
    cuenta de banco o caja con monto
   */
  try {
    const datosAbonos = []
    const updateCompraPagada = []
    const createHistorial = []
    const asientosContables = []
    const tieneContabilidad = await hasContabilidad({ clienteId })
    const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const ajusteCompra = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'compras' } })
    let periodo = null
    let comprobante = null
    if (tieneContabilidad) {
      const validContabilidad = await validPagoFacturas({ clienteId, abonos })
      if (validContabilidad && validContabilidad.message) {
        return res.status(500).json({ error: 'Error al momento de validar información contable: ' + validContabilidad.message })
      }
      periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fechaPago).toDate() }, fechaFin: { $gte: moment(fechaPago).toDate() } } })
      // console.log({ periodo })
      if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha del documento')
      const mesPeriodo = moment(fechaPago).format('YYYY/MM')
      comprobante = await getItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: ajusteCompra.codigoComprobanteCompras, periodoId: periodo._id, mesPeriodo }
      })
      if (!comprobante) {
        comprobante = await upsertItemSD({
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
    if (abonos[0]) {
      for (const abono of abonos) {
        const asientosVariacionCambiaria = []
        let cuentaProveedor = null
        let terceroProveedor = null
        const documento = (await agreggateCollectionsSD({
          nameCollection: 'documentosFiscales',
          enviromentClienteId: clienteId,
          pipeline: [
            { $match: { _id: new ObjectId(abono.compraId) } },
            {
              $lookup: {
                from: proveedoresCollection,
                localField: 'proveedorId',
                foreignField: '_id',
                pipeline: [
                  {
                    $lookup: {
                      from: categoriasCollection,
                      localField: 'categoria',
                      foreignField: '_id',
                      as: 'detalleCategoria'
                    }
                  },
                  { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
                  {
                    $lookup: {
                      from: planCuentaCollection,
                      localField: 'detalleCategoria.cuentaId',
                      foreignField: '_id',
                      as: 'detalleCuenta'
                    }
                  },
                  { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: true } },
                  {
                    $project: {
                      proveedor: '$razonSocial',
                      categoria: '$detalleCategoria.nombre',
                      cuentaId: '$detalleCuenta._id',
                      cuentaNombre: '$detalleCuenta.descripcion',
                      cuentaCodigo: '$detalleCuenta.codigo'
                    }
                  }
                ],
                as: 'detalleProveedor'
              }
            },
            { $unwind: { path: '$detalleProveedor', preserveNullAndEmptyArrays: true } }
          ]
        }))[0]
        if (tieneContabilidad) {
          cuentaProveedor = await getItemSD({
            nameCollection: 'planCuenta',
            enviromentClienteId: clienteId,
            filters: { _id: new ObjectId(documento.detalleProveedor?.cuentaId) }
          })
          terceroProveedor = await getItemSD({
            nameCollection: 'terceros',
            enviromentClienteId: clienteId,
            filters: { cuentaId: new ObjectId(cuentaProveedor._id), nombre: documento.detalleProveedor?.razonSocial }
          })
          if (!terceroProveedor) {
            terceroProveedor = await upsertItemSD({
              nameCollection: 'terceros',
              enviromentClienteId: clienteId,
              update: {
                $set: {
                  nombre: documento.detalleProveedor?.razonSocial,
                  cuentaId: new ObjectId(cuentaProveedor._id)
                }
              }
            })
          }
        }
        console.log({ documento, abono })
        const tasaVerify = documento.tasaAux ? documento.tasaAux : documento.tasaDia
        const totalSecundarioAux = documento.totalSecundarioAux ? documento.totalSecundarioAux : documento.totalSecundaria
        const totalPrincipalAux = documento.totalAux ? documento.totalAux : documento.total
        const totalDivisa = totalSecundarioAux * tasaDia[documento.monedaSecundaria]
        const diferenciaTotal = Number((Number(totalDivisa.toFixed(2)) - Number(totalPrincipalAux.toFixed(2))).toFixed(2))
        console.log({ totalDivisa, totalPrincipalAux, diferenciaTotal, totalSecundarioAux, tasaVerify })
        if (tasaVerify !== tasaDia[documento.monedaSecundaria]) {
          if (tieneContabilidad) {
            if (diferenciaTotal > 0) {
              const cuentaVariacion = await getItemSD({
                nameCollection: 'planCuenta',
                enviromentClienteId: clienteId,
                filters: { _id: new ObjectId(ajusteCompra.cuentaVariacionCambiariaGastos) }
              })
              console.log({ diferenciaTotal })
              // Registrar la diferencia contable con la cuenta que se encuentra en ajustes por el debe y el por pagar en el haber
              asientosVariacionCambiaria.push({
                cuentaId: new ObjectId(cuentaVariacion._id),
                cuentaCodigo: cuentaVariacion.codigo,
                cuentaNombre: cuentaVariacion.descripcion,
                comprobanteId: new ObjectId(comprobante._id),
                periodoId: new ObjectId(periodo._id),
                descripcion: `AJUSTE VARIACIÓN CAMBIARIA${documento.tipoDocumento}-${documento.numeroFactura}`,
                fecha: moment(fechaPago).toDate(),
                debe: Number(diferenciaTotal.toFixed(2)),
                haber: 0,
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                documento: {
                  docReferencia: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                  docFecha: moment(fechaPago).toDate()
                }
                /* fechaDolar: documento.monedaSecundaria !== documento.moneda ? documento.fechaTasa : null,
                cantidad: documento.monedaSecundaria !== documento.moneda ? documento.ivaSecundaria : null,
                monedasUsar: documento.monedaSecundaria !== documento.moneda ? documento.monedaSecundaria : null,
                tasa: documento.monedaSecundaria !== documento.moneda ? documento.tasaDia : null,
                monedaPrincipal: documento.moneda */
              }, {
                cuentaId: new ObjectId(cuentaProveedor._id),
                cuentaCodigo: cuentaProveedor.codigo,
                cuentaNombre: cuentaProveedor.descripcion,
                comprobanteId: new ObjectId(comprobante._id),
                periodoId: new ObjectId(periodo._id),
                descripcion: `AJUSTE VARIACIÓN CAMBIARIA${documento.tipoDocumento}-${documento.numeroFactura}`,
                fecha: moment(fechaPago).toDate(),
                debe: 0,
                haber: Number(diferenciaTotal.toFixed(2)),
                fechaCreacion: moment().toDate(),
                terceroId: new ObjectId(terceroProveedor._id),
                terceroNombre: terceroProveedor.nombre,
                docReferenciaAux: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                documento: {
                  docReferencia: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                  docFecha: moment(fechaPago).toDate()
                }
              })
              await createManyItemsSD({
                nameCollection: 'detallesComprobantes',
                enviromentClienteId: clienteId,
                items: asientosVariacionCambiaria
              })
            }
            if (diferenciaTotal < 0) {
              const cuentaVariacion = await getItemSD({
                nameCollection: 'planCuenta',
                enviromentClienteId: clienteId,
                filters: { _id: new ObjectId(ajusteCompra.cuentaVariacionCambiaria) }
              })
              // hacer lo contrario de arriba
              asientosVariacionCambiaria.push({
                cuentaId: new ObjectId(cuentaProveedor._id),
                cuentaCodigo: cuentaProveedor.codigo,
                cuentaNombre: cuentaProveedor.descripcion,
                comprobanteId: new ObjectId(comprobante._id),
                periodoId: new ObjectId(periodo._id),
                descripcion: `AJUSTE VARIACIÓN CAMBIARIA${documento.tipoDocumento}-${documento.numeroFactura}`,
                fecha: moment(fechaPago).toDate(),
                debe: Number(diferenciaTotal.toFixed(2)),
                haber: 0,
                fechaCreacion: moment().toDate(),
                terceroId: new ObjectId(terceroProveedor._id),
                terceroNombre: terceroProveedor.nombre,
                docReferenciaAux: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                documento: {
                  docReferencia: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                  docFecha: moment(fechaPago).toDate()
                }
              }, {
                cuentaId: new ObjectId(cuentaVariacion._id),
                cuentaCodigo: cuentaVariacion.codigo,
                cuentaNombre: cuentaVariacion.descripcion,
                comprobanteId: new ObjectId(comprobante._id),
                periodoId: new ObjectId(periodo._id),
                descripcion: `AJUSTE VARIACIÓN CAMBIARIA${documento.tipoDocumento}-${documento.numeroFactura}`,
                fecha: moment(fechaPago).toDate(),
                debe: 0,
                haber: Number(diferenciaTotal.toFixed(2)),
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                documento: {
                  docReferencia: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                  docFecha: moment(fechaPago).toDate()
                }
                /* fechaDolar: documento.monedaSecundaria !== documento.moneda ? documento.fechaTasa : null,
                cantidad: documento.monedaSecundaria !== documento.moneda ? documento.ivaSecundaria : null,
                monedasUsar: documento.monedaSecundaria !== documento.moneda ? documento.monedaSecundaria : null,
                tasa: documento.monedaSecundaria !== documento.moneda ? documento.tasaDia : null,
                monedaPrincipal: documento.moneda */
              })
              await createManyItemsSD({
                nameCollection: 'detallesComprobantes',
                enviromentClienteId: clienteId,
                items: asientosVariacionCambiaria
              })
            }
          }
        }
        await updateItemSD({
          nameCollection: 'documentosFiscales',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(abono.compraId) },
          update: {
            $set: {
              totalPrincipalAux: totalDivisa - abono.abono,
              totalSecundarioAux: totalSecundarioAux - abono.abonoSecundario,
              tasaAux: tasaDia[documento.monedaSecundaria]
            }
          }
        })
        if (Number(abono.porPagar.toFixed(2)) === Number(abono.abono.toFixed(2))) {
          updateCompraPagada.push({
            updateOne: {
              filter: { _id: new ObjectId(abono.compraId) },
              update: {
                $set: {
                  estado: 'pagada',
                  fechaPago: moment(abono.fechaPago).toDate(),
                  pagadoPor: new ObjectId(req.uid)
                }
              }
            }
          })
        }
        datosAbonos.push({
          documentoId: new ObjectId(abono.compraId),
          proveedorId: new ObjectId(proveedorId),
          pago: Number(abono.abono.toFixed(2)),
          fechaPago: moment(abono.fechaPago).toDate(),
          referencia: abono.referencia,
          banco: new ObjectId(abono.banco._id),
          porcentajeIgtf: Number(abono?.porcentajeIgtf || 0),
          igtfPorPagar: abono?.igtfPorPagar ? Number(abono?.igtfPorPagar.toFixed(2)) : null,
          // pagoIgtf: Number(abono?.pagoIgtf.toFixed(2)),
          pagoSecundario: abono?.abonoSecundario ? Number(abono?.abonoSecundario.toFixed(2)) : null,
          igtfPorPagarSecundario: abono?.igtfPorPagarSecundario ? Number(abono?.igtfPorPagarSecundario.toFixed(2)) : null,
          // pagoIgtfSecundario: Number(abono?.pagoIgtfSecundario.toFixed(2)),
          moneda: abono.moneda,
          monedaSecundaria: abono.monedaSecundaria,
          tasa: abono.tasa,
          tipo: 'compra',
          creadoPor: new ObjectId(req.uid)
        })
        createHistorial.push({
          idMovimiento: new ObjectId(abono.compraId),
          categoria: 'creado',
          tipo: 'Pago',
          fecha: moment().toDate(),
          descripcion: abono.porPagar === abono.abono ? 'Factura pagada' : 'Abonó ' + abono.abono?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          creadoPor: new ObjectId(req.uid)
        })
        if (tieneContabilidad) {
          asientosContables.push({
            cuentaId: new ObjectId(cuentaProveedor._id),
            cuentaCodigo: cuentaProveedor.codigo,
            cuentaNombre: cuentaProveedor.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `ABONO ${documento.tipoDocumento}-${documento.numeroFactura}`,
            fecha: moment(fechaPago).toDate(),
            debe: Number(abono.abono.toFixed(2)),
            haber: 0,
            fechaCreacion: moment().toDate(),
            terceroId: new ObjectId(terceroProveedor._id),
            terceroNombre: terceroProveedor.nombre,
            docReferenciaAux: `${documento.tipoDocumento}-${documento.numeroFactura}`,
            documento: {
              docReferencia: `${documento.tipoDocumento}-${documento.numeroFactura}`,
              docFecha: moment(fechaPago).toDate()
            },
            fechaDolar: abono.monedaSecundaria !== abono.moneda ? tasaDia.fechaUpdate : null,
            cantidad: abono.monedaSecundaria !== abono.moneda ? Number(abono?.abonoSecundario.toFixed(2)) : null,
            monedasUsar: abono.monedaSecundaria !== abono.moneda ? abono.monedaSecundaria : null,
            tasa: abono.monedaSecundaria !== abono.moneda ? tasaDia[abono.monedaSecundaria] : null,
            monedaPrincipal: abono.moneda
          })
          if (abono.igtfPorPagar) {
            const cuentaIGTF = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteCompra.cuentaIgtf) }
            })
            asientosContables.push({
              cuentaId: new ObjectId(cuentaIGTF._id),
              cuentaCodigo: cuentaIGTF.codigo,
              cuentaNombre: cuentaIGTF.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `ABONO ${documento.tipoDocumento}-${documento.numeroFactura}`,
              fecha: moment(fechaPago).toDate(),
              debe: Number(abono.igtfPorPagar.toFixed(2)),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${documento.tipoDocumento}-${documento.numeroFactura}`,
              documento: {
                docReferencia: `${documento.tipoDocumento}-${documento.numeroFactura}`,
                docFecha: moment(fechaPago).toDate()
              }
            })
          }
          const cuentaBanco = await getItemSD({
            nameCollection: 'planCuenta',
            enviromentClienteId: clienteId,
            filters: { _id: new ObjectId(abono.banco.cuentaId) }
          })
          asientosContables.push({
            cuentaId: new ObjectId(cuentaBanco._id),
            cuentaCodigo: cuentaBanco.codigo,
            cuentaNombre: cuentaBanco.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `ABONO ${documento.tipoDocumento}-${documento.numeroFactura}`,
            fecha: moment(fechaPago).toDate(),
            debe: 0,
            haber: Number(abono.totalPagar.toFixed(2)),
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `${documento.tipoDocumento}-${documento.numeroFactura}`,
            documento: {
              docReferencia: `${documento.tipoDocumento}-${documento.numeroFactura}`,
              docFecha: moment(fechaPago).toDate()
            },
            fechaDolar: abono.monedaSecundaria !== abono.moneda ? tasaDia.fechaUpdate : null,
            cantidad: abono.monedaSecundaria !== abono.moneda ? Number(abono?.totalPagarSecundario.toFixed(2)) : null,
            monedasUsar: abono.monedaSecundaria !== abono.moneda ? abono.monedaSecundaria : null,
            tasa: abono.monedaSecundaria !== abono.moneda ? tasaDia[abono.monedaSecundaria] : null,
            monedaPrincipal: abono.monedaSecundaria !== abono.moneda ? abono.moneda : null
          })
        }
      }
    }
    if (updateCompraPagada[0]) {
      await bulkWriteSD({ nameCollection: 'documentosFiscales', enviromentClienteId: clienteId, pipeline: updateCompraPagada })
    }
    if (asientosContables[0]) {
      createManyItemsSD({
        nameCollection: 'detallesComprobantes',
        enviromentClienteId: clienteId,
        items: asientosContables
      })
    }
    if (createHistorial[0]) {
      createManyItemsSD({
        nameCollection: 'historial',
        enviromentClienteId: clienteId,
        items: createHistorial
      })
    }
    if (datosAbonos[0]) {
      createManyItemsSD({
        nameCollection: 'transacciones',
        enviromentClienteId: clienteId,
        items: datosAbonos
      })
    }
    return res.status(200).json({ status: 'Pago de ordenes de compra creados exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de realizar el pago de compras ' + e.message })
  }
}
export const getListadoPagos = async (req, res) => {
  const { clienteId, documentoId } = req.body
  try {
    const bancosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'bancos' })
    const pagosList = await agreggateCollectionsSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { documentoId: new ObjectId(documentoId) } },
        { $sort: { fechaPago: 1 } },
        {
          $lookup: {
            from: bancosCollection,
            localField: 'banco',
            foreignField: '_id',
            as: 'detalleBanco'
          }
        },
        { $unwind: { path: '$detalleBanco', preserveNullAndEmptyArrays: true } }
      ]
    })
    return res.status(200).json({ pagosList })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las compras pendientes ' + e.message })
  }
}
export const getSolicitudesInventario = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina } = req.body
  try {
    const detalleMovimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleMovimientos' })
    const almacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const movimientos = await agreggateCollectionsSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo: 'solicitudCompra', estado: { $ne: 'recibido' } } },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) },
        {
          $lookup: {
            from: detalleMovimientosCollection,
            localField: '_id',
            foreignField: 'movimientoId',
            as: 'detalleMovimientos'
          }
        },
        {
          $lookup: {
            from: almacenCollection,
            localField: 'almacenDestino',
            foreignField: '_id',
            as: 'almacenDestino'
          }
        },
        { $unwind: { path: '$almacenDestino', preserveNullAndEmptyArrays: true } },
        {
          $lookup:
            {
              from: subDominioPersonasCollectionsName,
              localField: 'pagadoPor',
              foreignField: 'usuarioId',
              as: 'cradoPor'
            }
        },
        { $unwind: { path: '$cradoPor', preserveNullAndEmptyArrays: true } }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo: 'solicitudCompra' } },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ movimientos, count: count && count[0] ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de bucar datos de los movimientos ' + e.message })
  }
}
export const getOrdenesComprasForFacturas = async (req, res) => {
  const { clienteId, estatusInventario, factura, search } = req.body
  try {
    const configMatch = {}
    console.log({ estatusInventario })
    if (estatusInventario) {
      configMatch.statusInventario = { $eq: estatusInventario }
    } else {
      configMatch.estado = { $in: ['porRecibir'] }
    }
    const regex = {}
    if (search) {
      regex.$or = [
        { numeroOrden: { $regex: search, $options: 'i' } },
        { numeroFactura: { $regex: search, $options: 'i' } }
      ]
    }
    let facturas = []
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const detalleCompraCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleCompra' })
    const detalleDocumentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleDocumentosFiscales' })
    const ordenes = await agreggateCollectionsSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { ...configMatch, ...regex }/* { estado: { $in: ['pendientePagos', 'pagada'] } } */ },
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
            from: detalleCompraCollection,
            localField: '_id',
            foreignField: 'compraId',
            as: 'detalleCompra'
          }
        },
        { $sort: { numeroOrden: 1 } }
      ]
    })
    if (factura) {
      facturas = await agreggateCollectionsSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { estado: { $ne: 'pagada' }, tipoDocumento: { $eq: 'Factura' }, ...regex } },
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
              from: detalleDocumentosFiscalesCollection,
              localField: '_id',
              foreignField: 'facturaId',
              as: 'detalleCompra'
            }
          },
          { $sort: { numeroOrden: 1 } },
          { $limit: 10 }
        ]
      })
    }
    return res.status(200).json({ ordenes, facturas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las compras pendientes ' + e.message })
  }
}
export const createFacturas = async (req, res) => {
  console.log(req.body)
  const { clienteId, factura, fechaFactura, fechaVencimiento, fechaActual } = req.body
  try {
    console.log({ clienteId, factura, fechaFactura, fechaVencimiento, fechaActual })
    const tieneContabilidad = await hasContabilidad({ clienteId })
    const ajusteCompra = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'compras' } })
    let periodo = null
    let comprobante = null
    let cuentaProveedor = null
    let terceroProveedor = null
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    if (tieneContabilidad) {
      const validContabilidad = await validCreateFactura({ clienteId, proveedorId: factura.proveedor._id })
      if (validContabilidad && validContabilidad.message) {
        return res.status(500).json({ error: 'Error al momento de validar información contable: ' + validContabilidad.message })
      }
      periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fechaFactura).toDate() }, fechaFin: { $gte: moment(fechaFactura).toDate() } } })
      // console.log({ periodo })
      if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha del documento')
      const mesPeriodo = moment(fechaFactura).format('YYYY/MM')
      comprobante = await getItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: ajusteCompra.codigoComprobanteCompras, periodoId: periodo._id, mesPeriodo }
      })
      if (!comprobante) {
        comprobante = await upsertItemSD({
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
      const detalleProveedor = await agreggateCollectionsSD({
        nameCollection: 'proveedores',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { _id: new ObjectId(factura.proveedor._id) } },
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
      cuentaProveedor = await getItemSD({
        nameCollection: 'planCuenta',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(detalleProveedor[0]?.detalleCategoria?.cuentaId) }
      })
      terceroProveedor = await getItemSD({
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
    }
    const newFactura = await createItemSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      item: {
        tipoMovimiento: 'compra',
        fecha: moment(fechaFactura).toDate(),
        fechaVencimiento: moment(fechaVencimiento).toDate(),
        numeroFactura: factura.numeroFactura,
        tipoDocumento: factura.tipoDocumento,
        numeroControl: factura.numeroControl,
        proveedorId: new ObjectId(factura.proveedor._id),
        moneda: factura.moneda,
        monedaSecundaria: factura.monedaSecundaria,
        hasIgtf: factura.hasIgtf,
        isAgenteRetencionIva: factura.isAgenteRetencionIva,
        compraFiscal: true,
        retISLR: factura.retISLR,
        valorRetIva: factura?.valorRetIva ? Number(Number(factura?.valorRetIva).toFixed(2)) : null,
        codigoRetIslr: factura?.valorRetISLR?.codigo || null,
        nombreRetIslr: factura?.valorRetISLR?.nombre || null,
        porcenjateIslr: factura?.valorRetISLR?.valorRet ? Number(Number(factura?.valorRetISLR?.valorRet).toFixed(2)) : null,
        valorBaseImponibleIslr: factura?.valorRetISLR?.valorBaseImponible ? Number(Number(factura?.valorRetISLR?.valorBaseImponible).toFixed(2)) : null,
        baseImponible: factura?.baseImponible ? Number(Number(factura?.baseImponible).toFixed(2)) : null,
        iva: factura?.iva ? Number(Number(factura?.iva).toFixed(2)) : null,
        retIva: factura?.retIva ? Number(Number(factura?.retIva).toFixed(2)) : null,
        retIslr: factura?.retIslr ? Number(Number(factura?.retIslr).toFixed(2)) : null,
        total: factura?.total ? Number(Number(factura?.total).toFixed(2)) : null,
        baseImponibleSecundaria: factura?.baseImponibleSecundaria ? Number(Number(factura?.baseImponibleSecundaria).toFixed(2)) : null,
        ivaSecundaria: factura?.ivaSecundaria ? Number(Number(factura?.ivaSecundaria).toFixed(2)) : null,
        retIvaSecundaria: factura?.retIvaSecundaria ? Number(Number(factura?.retIvaSecundaria).toFixed(2)) : null,
        retIslrSecundaria: factura?.retIslrSecundaria ? Number(Number(factura?.retIslrSecundaria).toFixed(2)) : null,
        totalSecundaria: factura?.totalSecundaria ? Number(Number(factura?.totalSecundaria).toFixed(2)) : null,
        creadoPor: new ObjectId(req.uid),
        metodoPago: factura.proveedor.metodoPago,
        formaPago: factura.proveedor.formaPago,
        credito: factura.proveedor?.credito || null,
        duracionCredito: factura.proveedor?.duracionCredito || null,
        tasaDia: factura.tasaDia ? Number(factura.tasaDia) : null,
        ordenCompraId: factura.ordenCompraId ? new ObjectId(factura.ordenCompraId) : null,
        facturaAsociada: factura.facturaAsociada ? new ObjectId(factura.facturaAsociada) : null,
        sinDerechoCredito: factura.sinDerechoCredito ? Number(Number(factura.sinDerechoCredito).toFixed(2)) : null,
        noSujeto: factura.noSujeto ? Number(Number(factura.noSujeto).toFixed(2)) : null,
        exonerado: factura.exonerado ? Number(Number(factura.exonerado).toFixed(2)) : null,
        exento: factura.exento ? Number(Number(factura.exento).toFixed(2)) : null,
        totalExento: factura.totalExento ? Number(Number(factura.totalExento).toFixed(2)) : null,
        sinDerechoCreditoSecundaria: factura.sinDerechoCreditoSecundaria ? Number(Number(factura.sinDerechoCreditoSecundaria).toFixed(2)) : null,
        noSujetoSecundaria: factura.noSujetoSecundaria ? Number(Number(factura.noSujetoSecundaria).toFixed(2)) : null,
        exoneradoSecundaria: factura.exoneradoSecundaria ? Number(Number(factura.exoneradoSecundaria).toFixed(2)) : null,
        exentoSecundaria: factura.exentoSecundaria ? Number(Number(factura.exentoSecundaria).toFixed(2)) : null,
        totalExentoSecundaria: factura.totalExentoSecundaria ? Number(Number(factura.totalExentoSecundaria).toFixed(2)) : null,
        aplicaProrrateo: factura.aplicaProrrateo || false,
        isImportacion: factura.isImportacion || false
      }
    })
    createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        idMovimiento: newFactura.insertedId,
        categoria: 'creado',
        tipo: 'Factura',
        fecha: moment().toDate(),
        descripcion: `Factura N° ${factura.numeroFactura} creada`,
        creadoPor: new ObjectId(req.uid)
      }
    })
    const detalle = factura.productosServicios.map(e => {
      console.log({ e })
      return {
        facturaId: newFactura.insertedId,
        productoId: new ObjectId(e._id),
        codigo: e.codigo,
        descripcion: e.descripcion,
        nombre: e.nombre,
        observacion: e.observacion,
        unidad: e.unidad,
        cantidad: e.cantidad,
        tipo: e.tipo ? e.tipo : 'producto',
        retIslr: e.retIslr,
        costoUnitario: Number(e.costoUnitario),
        baseImponible: Number(e.baseImponible),
        montoIva: e.montoIva ? Number(e.montoIva) : null,
        iva: e.iva ? e.iva : null,
        costoTotal: Number(e.costoTotal)
      }
    })
    await createManyItemsSD({
      nameCollection: 'detalleDocumentosFiscales',
      enviromentClienteId: clienteId,
      items: [
        ...detalle
      ]
    })
    if (tieneContabilidad) {
      console.log({ factura })
      if (factura.tipoDocumento !== 'Nota de entrega') {
        const isServicio = factura.productosServicios.some(e => e.tipo === 'servicio')
        const asientosContables = []
        let diferencia = 0
        let ordenCompra
        if (factura.ordenCompraId) {
          const detalleCompraCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleCompra' })
          ordenCompra = (await agreggateCollectionsSD({
            nameCollection: 'compras',
            enviromentClienteId: clienteId,
            pipeline: [
              { $match: { _id: new ObjectId(factura.ordenCompraId) } },
              {
                $lookup: {
                  from: detalleCompraCollection,
                  localField: '_id',
                  foreignField: 'compraId',
                  pipeline: [
                    { $match: { tipo: 'producto' } },
                    {
                      $group: {
                        _id: 0,
                        baseImponible: { $sum: '$baseImponible' },
                        totalExento: { $sum: '$totalExento' }
                      }
                    }
                  ],
                  as: 'detalleCompra'
                }
              },
              { $unwind: { path: '$detalleCompra', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  baseImponible: '$detalleCompra.baseImponible',
                  totalExento: '$detalleCompra.totalExento',
                  total: { $add: ['$detalleCompra.baseImponible', '$detalleCompra.totalExento'] }
                }
              }
            ]
          }))[0]
          let totalServicios = 0
          factura.productosServicios.forEach(e => {
            if (e.tipo === 'servicio') {
              totalServicios += e.baseImponible
            }
          })
          const totalOrdenCompra = Number(ordenCompra.total.toFixed(2)) // + Number(ordenCompra.totalExento.toFixed(2))
          const totalFactura = Number(factura.baseImponible.toFixed(2)) + Number(factura.totalExento.toFixed(2)) - totalServicios
          diferencia = (totalOrdenCompra - totalFactura || 0)
        }
        console.log({ ordenCompra })
        if (factura.tipoDocumento !== 'Nota de crédito') {
          // let totalPagarProveedor = 0
          if (ordenCompra && factura.tipoDocumento === 'Factura') {
            asientosContables.push({
              cuentaId: new ObjectId(cuentaProveedor._id),
              cuentaCodigo: cuentaProveedor.codigo,
              cuentaNombre: cuentaProveedor.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: Number(Number(ordenCompra.baseImponible.toFixed(2)) + Number(ordenCompra.totalExento.toFixed(2))),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              documento: {
                docReferencia: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              },
              fechaDolar: factura.monedaSecundaria !== factura.moneda ? factura.fechaTasa : null,
              cantidad: factura.monedaSecundaria !== factura.moneda ? Number((ordenCompra.total / factura.tasaDia).toFixed(2)) : null,
              monedasUsar: factura.monedaSecundaria !== factura.moneda ? factura.monedaSecundaria : null,
              tasa: factura.monedaSecundaria !== factura.moneda ? factura.tasaDia : null,
              monedaPrincipal: factura.moneda
            })
            if (diferencia > 0) {
              const cuentaVariacion = await getItemSD({
                nameCollection: 'planCuenta',
                enviromentClienteId: clienteId,
                filters: { _id: new ObjectId(ajusteCompra.cuentaVariacionCambiariaGastos) }
              })
              // Registrar la diferencia contable con la cuenta que se encuentra en ajustes por el debe y el por pagar en el haber
              asientosContables.push({
                cuentaId: new ObjectId(cuentaVariacion._id),
                cuentaCodigo: cuentaVariacion.codigo,
                cuentaNombre: cuentaVariacion.descripcion,
                comprobanteId: new ObjectId(comprobante._id),
                periodoId: new ObjectId(periodo._id),
                descripcion: `AJUSTE VARIACIÓN CAMBIARIA${factura.tipoDocumento}-${factura.numeroFactura}`,
                fecha: moment(fechaActual).toDate(),
                debe: Number(diferencia.toFixed(2)),
                haber: 0,
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                documento: {
                  docReferencia: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                  docFecha: moment(fechaActual).toDate()
                }
              })
            }
          }
          if (factura?.iva) {
            console.log('iva')
            // totalPagarProveedor += factura.iva
            const cuentaIva = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteCompra.cuentaIva) }
            })
            asientosContables.push({
              cuentaId: new ObjectId(cuentaIva._id),
              cuentaCodigo: cuentaIva.codigo,
              cuentaNombre: cuentaIva.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: factura.iva,
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              documento: {
                docReferencia: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              },
              fechaDolar: factura.monedaSecundaria !== factura.moneda ? factura.fechaTasa : null,
              cantidad: factura.monedaSecundaria !== factura.moneda ? factura.ivaSecundaria : null,
              monedasUsar: factura.monedaSecundaria !== factura.moneda ? factura.monedaSecundaria : null,
              tasa: factura.monedaSecundaria !== factura.moneda ? factura.tasaDia : null,
              monedaPrincipal: factura.moneda
            })
            console.log(1)
            console.log({ asientosContables })
          }
          let totalServicio = 0
          if (isServicio) {
            console.log('servicios')
            const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
            const dataServicios = factura.productosServicios.filter(e => e.tipo === 'servicio')
            for (const servicio of dataServicios) {
              const dataServicio = await agreggateCollectionsSD({
                nameCollection: 'servicios',
                enviromentClienteId: clienteId,
                pipeline: [
                  { $match: { _id: new ObjectId(servicio.productoId ? servicio.productoId : servicio._id) } },
                  {
                    $lookup: {
                      from: categoriasCollection,
                      localField: 'categoria',
                      foreignField: '_id',
                      as: 'detalleCategoria'
                    }
                  },
                  { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
                  {
                    $lookup: {
                      from: planCuentaCollection,
                      localField: 'detalleCategoria.cuentaId',
                      foreignField: '_id',
                      as: 'dataCuenta'
                    }
                  },
                  { $unwind: { path: '$dataCuenta', preserveNullAndEmptyArrays: true } }
                ]
              })
              // totalPagarProveedor += Number(servicio.baseImponible)
              totalServicio += Number(servicio.baseImponible)
              asientosContables.push({
                cuentaId: new ObjectId(dataServicio[0].dataCuenta._id),
                cuentaCodigo: dataServicio[0].dataCuenta.codigo,
                cuentaNombre: dataServicio[0].dataCuenta.descripcion,
                comprobanteId: new ObjectId(comprobante._id),
                periodoId: new ObjectId(periodo._id),
                descripcion: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                fecha: moment(fechaActual).toDate(),
                debe: Number(servicio.baseImponible),
                haber: 0,
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                documento: {
                  docReferencia: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                  docFecha: moment(fechaActual).toDate()
                },
                fechaDolar: factura.monedaSecundaria !== factura.moneda ? factura.fechaTasa : null,
                cantidad: factura.monedaSecundaria !== factura.moneda ? Number(servicio.baseImponible) / factura.tasaDia : null,
                monedasUsar: factura.monedaSecundaria !== factura.moneda ? factura.monedaSecundaria : null,
                tasa: factura.monedaSecundaria !== factura.moneda ? factura.tasaDia : null,
                monedaPrincipal: factura.moneda
              })
            }
          }
          if (factura.tipoDocumento === 'Nota de débito') {
            const cuentaDescuentoDevoluciones = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteCompra.cuentaDescuentosDevolucionesCompras) }
            })
            asientosContables.push({
              cuentaId: new ObjectId(cuentaDescuentoDevoluciones._id),
              cuentaCodigo: cuentaDescuentoDevoluciones.codigo,
              cuentaNombre: cuentaDescuentoDevoluciones.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: (Number(factura.baseImponible.toFixed(2)) + Number(factura.totalExento ? factura.totalExento.toFixed(2) : 0)) - Number(totalServicio.toFixed(2)),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              documento: {
                docReferencia: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              },
              fechaDolar: factura.monedaSecundaria !== factura.moneda ? factura.fechaTasa : null,
              cantidad: factura.monedaSecundaria !== factura.moneda ? Number((((Number(factura.baseImponible.toFixed(2)) + Number(factura.totalExento ? factura.totalExento.toFixed(2) : 0)) - Number(totalServicio.toFixed(2))) / factura.tasaDia).toFixed(2)) : null,
              monedasUsar: factura.monedaSecundaria !== factura.moneda ? factura.monedaSecundaria : null,
              tasa: factura.monedaSecundaria !== factura.moneda ? factura.tasaDia : null,
              monedaPrincipal: factura.moneda
            })
          }
          if (factura.retIva) {
            // console.log('retIva')
            // totalPagarProveedor += factura.retIva
            const cuentaRetIva = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteCompra.cuentaRetIva) }
            })
            asientosContables.unshift({
              cuentaId: new ObjectId(cuentaRetIva._id),
              cuentaCodigo: cuentaRetIva.codigo,
              cuentaNombre: cuentaRetIva.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: 0,
              haber: Math.abs(factura.retIva),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              documento: {
                docReferencia: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              },
              fechaDolar: factura.monedaSecundaria !== factura.moneda ? factura.fechaTasa : null,
              cantidad: factura.monedaSecundaria !== factura.moneda ? factura.retIvaSecundaria : null,
              monedasUsar: factura.monedaSecundaria !== factura.moneda ? factura.monedaSecundaria : null,
              tasa: factura.monedaSecundaria !== factura.moneda ? factura.tasaDia : null,
              monedaPrincipal: factura.moneda
            })
          }
          if (factura.retIslr) {
            // console.log('retIslr')
            // totalPagarProveedor += factura.retIslr
            const cuentaRetIslr = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteCompra.cuentaRetIslrCompra) }
            })
            asientosContables.unshift({
              cuentaId: new ObjectId(cuentaRetIslr._id),
              cuentaCodigo: cuentaRetIslr.codigo,
              cuentaNombre: cuentaRetIslr.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: 0,
              haber: Math.abs(factura.retIslr),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              documento: {
                docReferencia: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              },
              fechaDolar: factura.monedaSecundaria !== factura.moneda ? factura.fechaTasa : null,
              cantidad: factura.monedaSecundaria !== factura.moneda ? factura.retIslrSecundaria : null,
              monedasUsar: factura.monedaSecundaria !== factura.moneda ? factura.monedaSecundaria : null,
              tasa: factura.monedaSecundaria !== factura.moneda ? factura.tasaDia : null,
              monedaPrincipal: factura.moneda
            })
          }
          console.log({ cuentaProveedor, ajusteCompra })
          console.log({ terceroProveedor })
          asientosContables.push({
            cuentaId: new ObjectId(cuentaProveedor._id),
            cuentaCodigo: cuentaProveedor.codigo,
            cuentaNombre: cuentaProveedor.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `${factura.tipoDocumento}-${factura.numeroFactura}`,
            fecha: moment(fechaActual).toDate(),
            debe: 0,
            haber: factura.total,
            fechaCreacion: moment().toDate(),
            terceroId: new ObjectId(terceroProveedor._id),
            terceroNombre: terceroProveedor.nombre,
            docReferenciaAux: `${factura.tipoDocumento}-${factura.numeroFactura}`,
            documento: {
              docReferencia: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              docFecha: moment(fechaActual).toDate()
            },
            fechaDolar: factura.monedaSecundaria !== factura.moneda ? factura.fechaTasa : null,
            cantidad: factura.monedaSecundaria !== factura.moneda ? factura.totalSecundaria : null,
            monedasUsar: factura.monedaSecundaria !== factura.moneda ? factura.monedaSecundaria : null,
            tasa: factura.monedaSecundaria !== factura.moneda ? factura.tasaDia : null,
            monedaPrincipal: factura.moneda
          })
          console.log(2)
          if (diferencia < 0) {
            console.log({ ajusteCompra })
            const cuentaVariacion = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteCompra.cuentaVariacionCambiaria) }
            })
            console.log({ cuentaVariacion })
            // hacer lo contrario de arriba
            asientosContables.push({
              cuentaId: new ObjectId(cuentaVariacion._id),
              cuentaCodigo: cuentaVariacion.codigo,
              cuentaNombre: cuentaVariacion.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `AJUSTE VARIACIÓN CAMBIARIA${factura.tipoDocumento}-${factura.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: 0,
              haber: Number(diferencia.toFixed(2)),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              documento: {
                docReferencia: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              }
            })
          }
          console.log(2)
          console.log({ asientosContables })
          // console.log({ asientosContables })
        } else {
          // let totalPagarProveedor = 0
          let totalServicio = 0
          if (factura?.iva) {
            // totalPagarProveedor += factura.iva
            const cuentaIva = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteCompra.cuentaIva) }
            })
            asientosContables.push({
              cuentaId: new ObjectId(cuentaIva._id),
              cuentaCodigo: cuentaIva.codigo,
              cuentaNombre: cuentaIva.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: 0,
              haber: factura.iva,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              documento: {
                docReferencia: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              },
              fechaDolar: factura.monedaSecundaria !== factura.moneda ? factura.fechaTasa : null,
              cantidad: factura.monedaSecundaria !== factura.moneda ? factura.ivaSecundaria : null,
              monedasUsar: factura.monedaSecundaria !== factura.moneda ? factura.monedaSecundaria : null,
              tasa: factura.monedaSecundaria !== factura.moneda ? factura.tasaDia : null,
              monedaPrincipal: factura.moneda
            })
          }
          const isServicio = factura.productosServicios.some(e => e.tipo === 'servicio')
          if (isServicio) {
            const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
            const dataServicios = factura.productosServicios.filter(e => e.tipo === 'servicio')
            for (const servicio of dataServicios) {
              const dataServicio = await agreggateCollectionsSD({
                nameCollection: 'servicios',
                enviromentClienteId: clienteId,
                pipeline: [
                  { $match: { _id: new ObjectId(servicio.productoId ? servicio.productoId : servicio._id) } },
                  {
                    $lookup: {
                      from: categoriasCollection,
                      localField: 'categoria',
                      foreignField: '_id',
                      as: 'detalleCategoria'
                    }
                  },
                  { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
                  {
                    $lookup: {
                      from: planCuentaCollection,
                      localField: 'detalleCategoria.cuentaId',
                      foreignField: '_id',
                      as: 'dataCuenta'
                    }
                  },
                  { $unwind: { path: '$dataCuenta', preserveNullAndEmptyArrays: true } }
                ]
              })
              // totalPagarProveedor += Number(servicio.baseImponible)
              totalServicio += Number(servicio.baseImponible)
              asientosContables.push({
                cuentaId: new ObjectId(dataServicio[0].dataCuenta._id),
                cuentaCodigo: dataServicio[0].dataCuenta.codigo,
                cuentaNombre: dataServicio[0].dataCuenta.descripcion,
                comprobanteId: new ObjectId(comprobante._id),
                periodoId: new ObjectId(periodo._id),
                descripcion: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                fecha: moment(fechaActual).toDate(),
                debe: 0,
                haber: Number(servicio.baseImponible),
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                documento: {
                  docReferencia: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                  docFecha: moment(fechaActual).toDate()
                },
                fechaDolar: factura.monedaSecundaria !== factura.moneda ? factura.fechaTasa : null,
                cantidad: factura.monedaSecundaria !== factura.moneda ? Number(servicio.baseImponible) / factura.tasaDia : null,
                monedasUsar: factura.monedaSecundaria !== factura.moneda ? factura.monedaSecundaria : null,
                tasa: factura.monedaSecundaria !== factura.moneda ? factura.tasaDia : null,
                monedaPrincipal: factura.moneda
              })
            }
          }
          if (factura.retIva) {
            // totalPagarProveedor += factura.retIva
            const cuentaRetIva = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteCompra.cuentaRetIva) }
            })
            asientosContables.unshift({
              cuentaId: new ObjectId(cuentaRetIva._id),
              cuentaCodigo: cuentaRetIva.codigo,
              cuentaNombre: cuentaRetIva.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: Math.abs(factura.retIva),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              documento: {
                docReferencia: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              },
              fechaDolar: factura.monedaSecundaria !== factura.moneda ? factura.fechaTasa : null,
              cantidad: factura.monedaSecundaria !== factura.moneda ? factura.retIvaSecundaria : null,
              monedasUsar: factura.monedaSecundaria !== factura.moneda ? factura.monedaSecundaria : null,
              tasa: factura.monedaSecundaria !== factura.moneda ? factura.tasaDia : null,
              monedaPrincipal: factura.moneda
            })
          }
          if (factura.retIslr) {
            // totalPagarProveedor += factura.retIslr
            const cuentaRetIslr = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteCompra.cuentaRetIslrCompra) }
            })
            asientosContables.unshift({
              cuentaId: new ObjectId(cuentaRetIslr._id),
              cuentaCodigo: cuentaRetIslr.codigo,
              cuentaNombre: cuentaRetIslr.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: Math.abs(factura.retIslr),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              documento: {
                docReferencia: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              },
              fechaDolar: factura.monedaSecundaria !== factura.moneda ? factura.fechaTasa : null,
              cantidad: factura.monedaSecundaria !== factura.moneda ? factura.retIslrSecundaria : null,
              monedasUsar: factura.monedaSecundaria !== factura.moneda ? factura.monedaSecundaria : null,
              tasa: factura.monedaSecundaria !== factura.moneda ? factura.tasaDia : null,
              monedaPrincipal: factura.moneda
            })
          }
          const cuentaDescuentoDevoluciones = await getItemSD({
            nameCollection: 'planCuenta',
            enviromentClienteId: clienteId,
            filters: { _id: new ObjectId(ajusteCompra.cuentaDescuentosDevolucionesCompras) }
          })
          asientosContables.push({
            cuentaId: new ObjectId(cuentaDescuentoDevoluciones._id),
            cuentaCodigo: cuentaDescuentoDevoluciones.codigo,
            cuentaNombre: cuentaDescuentoDevoluciones.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `${factura.tipoDocumento}-${factura.numeroFactura}`,
            fecha: moment(fechaActual).toDate(),
            debe: 0,
            haber: (Number(factura.baseImponible.toFixed(2)) + Number(factura.totalExento ? factura.totalExento.toFixed(2) : 0)) - Number(totalServicio.toFixed(2)),
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `${factura.tipoDocumento}-${factura.numeroFactura}`,
            documento: {
              docReferencia: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              docFecha: moment(fechaActual).toDate()
            },
            fechaDolar: factura.monedaSecundaria !== factura.moneda ? factura.fechaTasa : null,
            cantidad: factura.monedaSecundaria !== factura.moneda ? Number((((Number(factura.baseImponible.toFixed(2)) + Number(factura.totalExento ? factura.totalExento.toFixed(2) : 0)) - Number(totalServicio.toFixed(2))) / factura.tasaDia).toFixed(2)) : null,
            monedasUsar: factura.monedaSecundaria !== factura.moneda ? factura.monedaSecundaria : null,
            tasa: factura.monedaSecundaria !== factura.moneda ? factura.tasaDia : null,
            monedaPrincipal: factura.moneda
          })
          if (factura?.iva || isServicio || factura.retIva || factura.retIslr) {
            asientosContables.unshift({
              cuentaId: new ObjectId(cuentaProveedor._id),
              cuentaCodigo: cuentaProveedor.codigo,
              cuentaNombre: cuentaProveedor.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              fecha: moment(fechaActual).toDate(),
              debe: Number(factura.total.toFixed(2)),
              haber: 0,
              fechaCreacion: moment().toDate(),
              terceroId: new ObjectId(terceroProveedor._id),
              terceroNombre: terceroProveedor.nombre,
              docReferenciaAux: `${factura.tipoDocumento}-${factura.numeroFactura}`,
              documento: {
                docReferencia: `${factura.tipoDocumento}-${factura.numeroFactura}`,
                docFecha: moment(fechaActual).toDate()
              },
              fechaDolar: factura.monedaSecundaria !== factura.moneda ? factura.fechaTasa : null,
              cantidad: factura.monedaSecundaria !== factura.moneda ? Number(factura.totalSecundaria.toFixed(2)) : null,
              monedasUsar: factura.monedaSecundaria !== factura.moneda ? factura.monedaSecundaria : null,
              tasa: factura.monedaSecundaria !== factura.moneda ? factura.tasaDia : null,
              monedaPrincipal: factura.moneda
            })
          }
        }
        if (asientosContables[0]) {
          createManyItemsSD({
            nameCollection: 'detallesComprobantes',
            enviromentClienteId: clienteId,
            items: asientosContables
          })
        }
      }
    }
    return res.status(200).json({ status: `Factura N° ${factura.numeroFactura} creada exitosamente` })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el documento ' + e.message })
  }
}
export const getFacturas = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina } = req.body
  try {
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const detalleFacturaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleDocumentosFiscales' })
    const comprasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'compras' })
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const facturas = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipoMovimiento: 'compra' } },
        { $skip: (pagina - 1) * itemsPorPagina },
        { $limit: itemsPorPagina },
        {
          $lookup: {
            from: comprasCollection,
            localField: 'ordenCompraId',
            foreignField: '_id',
            as: 'ordenCompraDetalle'
          }
        },
        { $unwind: { path: '$ordenCompraDetalle', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: 'facturaAsociada',
            foreignField: '_id',
            as: 'facturaDetalle'
          }
        },
        { $unwind: { path: '$facturaDetalle', preserveNullAndEmptyArrays: true } },
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
            from: detalleFacturaCollection,
            localField: '_id',
            foreignField: 'facturaId',
            as: 'productosServicios'
          }
        },
        {
          $lookup:
            {
              from: subDominioPersonasCollectionsName,
              localField: 'creadoPor',
              foreignField: 'usuarioId',
              as: 'personas'
            }
        },
        { $unwind: { path: '$personas', preserveNullAndEmptyArrays: true } }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'facturas',
      enviromentClienteId: clienteId,
      pipeline: [
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ facturas, count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las facturas pendientes ' + e.message })
  }
}
export const deleteImgCompras = async (req, res) => {
  const { clienteId, documentoId, imgId } = req.body
  try {
    await updateItemSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(documentoId) },
      update: { $pull: { documentosAdjuntos: { fileId: imgId } } }
    })
    try {
      await deleteImg(imgId)
    } catch (e) {
      console.log(e)
    }
    return res.status(200).json({ status: 'Imagen eliminada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar la imagen del almacen ' + e.message })
  }
}
export const addImagenCompras = async (req, res) => {
  const { clienteId, documentoId } = req.body
  console.log({ body: req.body, file: req.files.documentos })
  try {
    const documentos = req.files?.documentos
    const documentosAdjuntos = []
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
      const itemsAnterior = (await getItemSD({ nameCollection: 'documentosFiscales', enviromentClienteId: clienteId, filters: { _id: new ObjectId(documentoId) } })).documentosAdjuntos
      if (itemsAnterior) {
        documentosAdjuntos.push(...itemsAnterior)
      }
      const documento = await updateItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(documentoId) },
        update: { $set: { documentosAdjuntos } }
      })
      return res.status(200).json({ status: 'Imagenes guardada exitosamente', documento })
    }
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar las imagenes del almacen ' + e.message })
  }
}
export const getFacturasPagadas = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina } = req.body
  try {
    console.log(clienteId)
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const detalleFacturaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleDocumentosFiscales' })
    const comprasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'compras' })
    const documentosFiscalesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const facturas = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: 'pagada', tipoDocumento: tiposDocumentosFiscales.factura, tipoMovimiento: 'compra' } },
        { $skip: (pagina - 1) * itemsPorPagina },
        { $limit: itemsPorPagina },
        {
          $lookup: {
            from: comprasCollection,
            localField: 'ordenCompraId',
            foreignField: '_id',
            as: 'ordenCompraDetalle'
          }
        },
        { $unwind: { path: '$ordenCompraDetalle', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: documentosFiscalesCollection,
            localField: 'facturaAsociada',
            foreignField: '_id',
            as: 'facturaDetalle'
          }
        },
        { $unwind: { path: '$facturaDetalle', preserveNullAndEmptyArrays: true } },
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
            from: detalleFacturaCollection,
            localField: '_id',
            foreignField: 'facturaId',
            as: 'productosServicios'
          }
        },
        {
          $lookup:
            {
              from: subDominioPersonasCollectionsName,
              localField: 'creadoPor',
              foreignField: 'usuarioId',
              as: 'personas'
            }
        },
        { $unwind: { path: '$personas', preserveNullAndEmptyArrays: true } },
        {
          $lookup:
            {
              from: subDominioPersonasCollectionsName,
              localField: 'pagadoPor',
              foreignField: 'usuarioId',
              as: 'pagadoPorDetalle'
            }
        },
        { $unwind: { path: '$pagadoPorDetalle', preserveNullAndEmptyArrays: true } }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'facturas',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: 'pagada', tipoDocumento: tiposDocumentosFiscales.factura, tipoMovimiento: 'compra' } },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ facturas, count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las facturas pendientes ' + e.message })
  }
}
