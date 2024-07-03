import { agreggateCollections, agreggateCollectionsSD, bulkWriteSD, createItemSD, createManyItemsSD, deleteManyItemsSD, formatCollectionName, getCollectionSD, getItem, getItemSD, updateItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { subDominioName, tipoMovimientosShort } from '../../constants.js'
import moment from 'moment-timezone'
import { ObjectId } from 'mongodb'
import { hasContabilidad } from '../../utils/hasContabilidad.js'
import { hasInventario } from '../../utils/validModulos.js'

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
        valorRetIva: movimiento?.valorRetIva ? Number(movimiento?.valorRetIva) : null,
        codigoRetIslr: movimiento?.valorRetISLR?.codigo || null,
        nombreRetIslr: movimiento?.valorRetISLR?.nombre || null,
        porcenjateIslr: movimiento?.valorRetISLR?.valorRet ? Number(movimiento?.valorRetISLR?.valorRet) : null,
        valorBaseImponibleIslr: movimiento?.valorRetISLR?.valorBaseImponible ? Number(movimiento?.valorRetISLR?.valorBaseImponible) : null,
        baseImponible: totalesMovimiento?.baseImponible ? Number(totalesMovimiento?.baseImponible) : null,
        iva: totalesMovimiento?.iva ? Number(totalesMovimiento?.iva) : null,
        retIva: totalesMovimiento?.retIva ? Number(totalesMovimiento?.retIva) : null,
        retIslr: totalesMovimiento?.retIslr ? Number(totalesMovimiento?.retIslr) : null,
        total: totalesMovimiento?.total ? Number(totalesMovimiento?.total) : null,
        baseImponibleSecundaria: totalesMovimiento?.baseImponibleSecundaria ? Number(totalesMovimiento?.baseImponibleSecundaria) : null,
        ivaSecundaria: totalesMovimiento?.ivaSecundaria ? Number(totalesMovimiento?.ivaSecundaria) : null,
        retIvaSecundaria: totalesMovimiento?.retIvaSecundaria ? Number(totalesMovimiento?.retIvaSecundaria) : null,
        retIslrSecundaria: totalesMovimiento?.retIslrSecundaria ? Number(totalesMovimiento?.retIslrSecundaria) : null,
        totalSecundaria: totalesMovimiento?.totalSecundaria ? Number(totalesMovimiento?.totalSecundaria) : null,
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
        iva: e.iva ? Number(e.iva) : null,
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
  // console.log(req.body)
  try {
    const tieneContabilidad = await hasContabilidad({ clienteId })
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
    const movimientosAlmacen = []
    const asientosContable = []
    let totalPorPagarProveedor = 0
    let cuentaProveedor = null
    let terceroProveedor = null
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
      }
      for (const detalle of detalleCompra[0]?.detalleCompra) {
        console.log({ detalle })
        /* registrarlo normal como viene  que seria el costo promedio el como el costo unitario original
        contabilidad: la cuenta de la categoria del almacen de transito por el debe y por haber cuentas por pagar proveedor que seria la cuenta agregada en la categoria del proveedor
        crearla con tercero que seria la razon social
        */
        if (detalle.tipo !== 'producto') continue
        if (tieneInventario) {
          /* movimientosAlmacen.push({
            isCompra: true,
            productoId: new ObjectId(detalle.productoId),
            movimientoId: new ObjectId(detalle.compraId),
            cantidad: Number(detalle.cantidad),
            almacenId: new ObjectId(almacenTransito._id),
            almacenOrigen: null,
            almacenDestino: new ObjectId(almacenTransito._id),
            tipo: 'compra',
            tipoMovimiento: 'entrada',
            lote: null, // movimientos.lote,
            // fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
            // fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: Number(detalle.costoUnitario),
            costoPromedio: Number(detalle.costoUnitario),
            creadoPor: new ObjectId(req.uid)
          }) */
          /** Creamos el movimiento de recepcion de inventario (ESTO SE DEBERIA DE CONDICIONAR A SI LA PERSONA TIENE INVENTARIO ACTIVO) */
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
        /** */
        if (tieneContabilidad) {
          totalPorPagarProveedor += Number(detalle.costoUnitario) * Number(detalle.cantidad)
          asientosContable.push({
            cuentaId: new ObjectId(detalle.cuentaTransito._id),
            cuentaCodigo: detalle.cuentaTransito.codigo,
            cuentaNombre: detalle.cuentaTransito.descripcion,
            // comprobanteId: new ObjectId(comprobante._id),
            // periodoId: new ObjectId(periodo._id),
            // descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} CANCELADO`,
            fecha: moment(fechaAprobacionPagos).toDate(),
            debe: Number(detalle.costoUnitario) * Number(detalle.cantidad),
            haber: 0,
            fechaCreacion: moment().toDate()
            // docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
            /* documento: {
              docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              docFecha: moment(fechaCancelado).toDate()
            } */
          })
        }
      }
      if (tieneContabilidad) {
        cuentaProveedor = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(detalleCompra[0].detalleProveedor?.detalleCategoria?.cuentaId) }
        })
        terceroProveedor = await getItemSD({
          nameCollection: 'terceros',
          enviromentClienteId: clienteId,
          filters: { cuentaId: new ObjectId(cuentaProveedor._id), nombre: detalleCompra[0].detalleProveedor?.razonSocial }
        })
        if (!terceroProveedor) {
          terceroProveedor = await upsertItemSD({
            nameCollection: 'terceros',
            enviromentClienteId: clienteId,
            update: {
              $set: {
                nombre: detalleCompra[0].detalleProveedor?.razonSocial,
                cuentaId: new ObjectId(cuentaProveedor._id)
              }
            }
          })
        }
        asientosContable.push({
          cuentaId: new ObjectId(cuentaProveedor._id),
          cuentaCodigo: cuentaProveedor.codigo,
          cuentaNombre: cuentaProveedor.descripcion,
          // comprobanteId: new ObjectId(comprobante._id),
          // periodoId: new ObjectId(periodo._id),
          // descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} CANCELADO`,
          fecha: moment(fechaAprobacionPagos).toDate(),
          debe: 0,
          haber: totalPorPagarProveedor,
          fechaCreacion: moment().toDate(),
          terceroId: new ObjectId(terceroProveedor._id),
          terceroNombre: terceroProveedor.nombre
          // docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
          /* documento: {
            docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
            docFecha: moment(fechaCancelado).toDate()
          } */
        })
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
        items: [
          ...detalleRecepcionInventario
        ]
      })
      createManyItemsSD({
        nameCollection: 'productosPorAlmacen',
        enviromentClienteId: clienteId,
        items: [
          ...movimientosAlmacen
        ]
      })
    }
    return res.status(200).json({ status: 'Orden aprobada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de aprobar esta orden ' + e.message })
  }
}
export const getDataOrdenesComprasPorPagar = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina, fechaActual, timeZone, rangoFechaVencimiento, fechaTasa } = req.body
  try {
    const transaccionesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'transacciones' })
    const rango1 = rangoFechaVencimiento
    const rango2 = rangoFechaVencimiento * 2
    const rango3 = rangoFechaVencimiento * 3
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
    // console.log({ tasa })
    const conteosPendientesPorPago = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: { $ne: 'pagada' }, tipoDocumento: { $in: ['Factura', 'Nota de entrega'] } } },
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
            foreignField: 'compraId',
            /* pipeline: [
              {
                $group: {
                  _id: '$compraId',
                  totalAbono: { $sum: '$pago' }
                }
              }
            ], */
            as: 'detalleTransacciones'
          }
        },
        // { $unwind: { path: '$detalleTransacciones', preserveNullAndEmptyArrays: true } },
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
            total: '$total',
            totalSecundaria: '$totalSecundaria',
            monedaSecundaria: '$monedaSecundaria',
            detalleTransacciones: '$detalleTransacciones'
            // totalAbono: '$detalleTransacciones.totalAbono',
            // hasAbono: { $ifNull: ['$detalleTransacciones.totalAbono', false] }
            // totalPorPagar: { $subtract: ['$total', '$detalleTransacciones.totalAbono'] }
          }
        }
        /* {
          $group: {
            _id: 0,
            rango1: {
              $sum: {
                $cond: {
                  if: { $lte: ['$diffFechaVencimiento', rango1] }, then: 1, else: 0
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
            totalAbono: {
              $sum: {
                $cond: { if: { $ne: ['$hasAbono', false] }, then: '$totalAbono', else: 0 }
              }
            },
            total: { $sum: '$total' },
            totalSecundario: { $sum: '$totalSecundaria' }
          }
        },
        {
          $project: {
            rango1: '$rango1',
            rango2: '$rango2',
            rango3: '$rango3',
            totalAbono: '$totalAbono',
            total: '$total',
            totalPorPagar: { $subtract: ['$total', '$totalAbono'] }
          }
        } */
      ]
    })
    console.log({ conteosPendientesPorPago })
    const datosConteo = {
      rango1: 0,
      rango2: 0,
      rango3: 0,
      totalAbono: 0,
      total: 0,
      totalPrincipal: 0,
      totalSecundaria: 0,
      totalPorPagar: 0
    }
    for (const conteo of conteosPendientesPorPago) {
      const total = conteo.totalSecundaria * tasa[conteo.monedaSecundaria]
      if (conteo.diffFechaVencimiento <= rango1) datosConteo.rango1 += 1
      if (conteo.diffFechaVencimiento > rango1 && conteo.diffFechaVencimiento <= rango2) datosConteo.rango2 += 1
      if (conteo.diffFechaVencimiento > rango2 && conteo.diffFechaVencimiento <= rango3) datosConteo.rango3 += 1
      datosConteo.total += total
      datosConteo.totalPorPagar += total
      datosConteo.totalPrincipal += conteo.total
      datosConteo.totalSecundaria += conteo.totalSecundaria
    }
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const comprasPorProveedor = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: { $ne: 'pagada' }, tipoDocumento: { $in: ['Factura', 'Nota de entrega'] } } },
        { $sort: { fechaVencimiento: 1 } },
        {
          $lookup: {
            from: transaccionesCollection,
            localField: '_id',
            foreignField: 'compraId',
            pipeline: [
              {
                $group: {
                  _id: '$compraId',
                  totalAbono: { $sum: '$pago' }
                }
              }
            ],
            as: 'detalleTransacciones'
          }
        },
        // { $unwind: { path: '$detalleTransacciones', preserveNullAndEmptyArrays: true } },
        /* {
          $group: {
            _id: '$proveedorId',
            fechaVencimiento: { $first: '$fechaVencimiento' },
            costoTotal: { $sum: '$total' },
            totalAbono: { $sum: '$detalleTransacciones.totalAbono' }
          }
        }, */
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
          $project: {
            proveedorId: '$proveedorId',
            proveedor: '$proveedor.razonSocial',
            documentoIdentidad: { $concat: ['$proveedor.tipoDocumento', '-', '$proveedor.documentoIdentidad'] },
            // costoTotal: '$costoTotal',
            // totalAbono: '$totalAbono',
            // porPagar: { $subtract: ['$costoTotal', '$totalAbono'] },
            fechaVencimiento: '$fechaVencimiento',
            monedaSecundaria: '$monedaSecundaria',
            totalSecundaria: '$totalSecundaria',
            total: '$total',
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
    const dataCompraProveedor = {}
    const dataCompra = []
    for (const compra of comprasPorProveedor) {
      const total = compra.totalSecundaria * tasa[compra.monedaSecundaria]
      if (!dataCompraProveedor[compra.proveedorId]) {
        dataCompraProveedor[compra.proveedorId] = {
          proveedorId: compra.proveedorId,
          proveedor: compra.proveedor,
          documentoIdentidad: compra.documentoIdentidad,
          total: compra.total,
          totalSecundaria: compra.totalSecundaria,
          totalAbono: compra?.totalAbono || 0,
          costoTotal: total,
          porPagar: total - (compra?.totalAbono || 0),
          fechaVencimiento: compra.fechaVencimiento,
          diffFechaVencimiento: compra.diffFechaVencimiento,
          detalleTransacciones: []
        }
      } else {
        dataCompraProveedor[compra.proveedorId].total += compra.total
        dataCompraProveedor[compra.proveedorId].totalSecundaria += compra.totalSecundaria
        dataCompraProveedor[compra.proveedorId].totalAbono += compra?.totalAbono || 0
        dataCompraProveedor[compra.proveedorId].costoTotal += total
        dataCompraProveedor[compra.proveedorId].porPagar += (total - (compra?.totalAbono || 0))
        if (dataCompraProveedor[compra.proveedorId].diffFechaVencimiento > compra.diffFechaVencimiento) {
          dataCompraProveedor[compra.proveedorId].diffFechaVencimiento = compra.diffFechaVencimiento
          dataCompraProveedor[compra.proveedorId].fechaVencimiento = compra.fechaVencimiento
        }
      }
    }
    for (const key in dataCompraProveedor) {
      dataCompra.push(dataCompraProveedor[key])
    }
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: { $ne: 'pagada' }, tipoDocumento: { $in: ['Factura', 'Nota de entrega'] } } },
        { $sort: { fechaVencimiento: 1 } },
        {
          $group: {
            _id: '$proveedorId',
            count: { $sum: 1 }
          }
        }
      ]
    })
    return res.status(200).json({ conteosPendientesPorPago: datosConteo, count: count[0].count, comprasPorProveedor: dataCompra })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las compras pendientes ' + e.message })
  }
}
export const getDetalleProveedor = async (req, res) => {
  const { clienteId, proveedorId, itemsPorPagina, pagina, fechaActual, timeZone, rangoFechaVencimiento, fechaTasa } = req.body
  try {
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
    const comprasPorProveedor = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: { $ne: 'pagada' }, tipoDocumento: { $in: ['Factura', 'Nota de entrega'] }, proveedorId: new ObjectId(proveedorId) } },
        ...pagination,
        {
          $lookup: {
            from: transaccionesCollection,
            localField: '_id',
            foreignField: 'compraId',
            pipeline: [
              {
                $group: {
                  _id: '$compraId',
                  totalAbono: { $sum: '$pago' }
                }
              }
            ],
            as: 'detalleTransacciones'
          }
        },
        // { $unwind: { path: '$detalleTransacciones', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            proveedorId: 1,
            numeroFactura: 1,
            totalPrincipal: '$total',
            totalSecundaria: '$totalSecundaria',
            monedaSecundaria: '$monedaSecundaria',
            // totalAbono: '$detalleTransacciones.totalAbono',
            // porPagar: { $subtract: ['$total', '$detalleTransacciones.totalAbono'] },
            fechaVencimiento: 1,
            detalleTransacciones: '$detalleTransacciones',
            diffFechaVencimiento:
            {
              $dateDiff: { startDate: moment(fechaActual).toDate(), endDate: '$fechaVencimiento', unit: 'day', timezone: timeZone }
            }
          }
        }
      ]
    })
    const dataDetalle = comprasPorProveedor.map(e => {
      return {
        ...e,
        costoTotal: e.totalSecundaria * tasa[e.monedaSecundaria]
      }
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: { $ne: 'pagada' }, tipoDocumento: { $in: ['Factura', 'Nota de entrega'] }, proveedorId: new ObjectId(proveedorId) } },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ comprasPorProveedor: dataDetalle, count: count && count[0] ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar el listados de compras del proveedor ' + e.message })
  }
}
export const createPagoOrdenes = async (req, res) => {
  console.log(req.body)
  const { clienteId, proveedorId, abonos } = req.body
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
    // const asientosContables = []
    // const tieneContabilidad = await hasContabilidad({ clienteId })
    if (abonos[0]) {
      for (const abono of abonos) {
        if (abono.porPagar === abono.abono) {
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
          compraId: new ObjectId(abono.compraId),
          proveedorId: new ObjectId(proveedorId),
          pago: Number(abono.abono),
          fechaPago: moment(abono.fechaPago).toDate(),
          referencia: abono.referencia,
          banco: new ObjectId(abono.banco._id),
          porcentajeIgtf: Number(abono?.porcentajeIgtf || 0),
          baseImponibleIgtf: Number(abono?.baseImponibleIgtf || 0),
          pagoIgtf: abono?.pagoIgtf,
          abonoSecundario: abono?.abonoSecundario,
          baseImponibleIgtfSecundario: Number(abono?.baseImponibleIgtfSecundario.toFixed(2)),
          pagoIgtfSecundario: Number(abono?.pagoIgtfSecundario.toFixed(2)),
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
          descripcion: abono.porPagar === abono.abono ? 'Orden pagada' : 'Abonó ' + abono.abono?.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          creadoPor: new ObjectId(req.uid)
        })
      }
    }
    if (updateCompraPagada[0]) {
      await bulkWriteSD({ nameCollection: 'compras', enviromentClienteId: clienteId, pipeline: updateCompraPagada })
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
  const { clienteId, compraId } = req.body
  try {
    const bancosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'bancos' })
    const pagosList = await agreggateCollectionsSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { compraId: new ObjectId(compraId) } },
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
          { $match: { estado: { $ne: 'pagada' }, ...regex } },
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
  const { clienteId, factura, fechaFactura, fechaVencimiento } = req.body
  try {
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
        valorRetIva: factura?.valorRetIva ? Number(factura?.valorRetIva) : null,
        codigoRetIslr: factura?.valorRetISLR?.codigo || null,
        nombreRetIslr: factura?.valorRetISLR?.nombre || null,
        porcenjateIslr: factura?.valorRetISLR?.valorRet ? Number(factura?.valorRetISLR?.valorRet) : null,
        valorBaseImponibleIslr: factura?.valorRetISLR?.valorBaseImponible ? Number(factura?.valorRetISLR?.valorBaseImponible) : null,
        baseImponible: factura?.baseImponible ? Number(factura?.baseImponible) : null,
        iva: factura?.iva ? Number(factura?.iva) : null,
        retIva: factura?.retIva ? Number(factura?.retIva) : null,
        retIslr: factura?.retIslr ? Number(factura?.retIslr) : null,
        total: factura?.total ? Number(factura?.total) : null,
        baseImponibleSecundaria: factura?.baseImponibleSecundaria ? Number(factura?.baseImponibleSecundaria) : null,
        ivaSecundaria: factura?.ivaSecundaria ? Number(factura?.ivaSecundaria) : null,
        retIvaSecundaria: factura?.retIvaSecundaria ? Number(factura?.retIvaSecundaria) : null,
        retIslrSecundaria: factura?.retIslrSecundaria ? Number(factura?.retIslrSecundaria) : null,
        totalSecundaria: factura?.totalSecundaria ? Number(factura?.totalSecundaria) : null,
        creadoPor: new ObjectId(req.uid),
        metodoPago: factura.proveedor.metodoPago,
        formaPago: factura.proveedor.formaPago,
        credito: factura.proveedor?.credito || null,
        duracionCredito: factura.proveedor?.duracionCredito || null,
        tasaDia: factura.tasaDia ? Number(factura.tasaDia) : null,
        ordenCompraId: factura.ordenCompraId ? new ObjectId(factura.ordenCompraId) : null,
        facturaAsociada: factura.facturaAsociada ? new ObjectId(factura.facturaAsociada) : null
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
        iva: e.iva ? Number(e.iva) : null,
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
    return res.status(200).json({ status: `Factura N° ${factura.numeroFactura} creada exitosamente` })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la orden de compra ' + e.message })
  }
}
export const getFacturas = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina } = req.body
  try {
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const detalleFacturaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleDocumentosFiscales' })
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const facturas = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
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
