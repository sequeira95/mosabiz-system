import { agreggateCollections, agreggateCollectionsSD, createItemSD, createManyItemsSD, deleteManyItemsSD, formatCollectionName, getCollectionSD, getItemSD, updateItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { subDominioName } from '../../constants.js'
import moment from 'moment-timezone'
import { ObjectId } from 'mongodb'

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
  console.log(req.body)
  const { clienteId, movimiento, detalleMovimiento, fechaActualMovimiento, fechaVencimientoMovimiento, totalesMovimiento, estado, proveedor } = req.body
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
        tasaDia: movimiento.tasaDia ? Number(movimiento.tasaDia) : null
      }
    })
    createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        idMovimiento: newMovimiento.insertedId,
        categoria: 'creado',
        tipo: 'Factura',
        fecha: moment().toDate(),
        descripcion: `Factura N° ${contador} creada`,
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
        tipo: e.tipo,
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
            tasaDia: 1
          }
        }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: { $in: ['pendientePorAprobar'] } } },
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
        tipo: 'Factura',
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
    updateItemSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(compraId) },
      update: { $set: { estado: 'pendientePagos', fechaAprobacionPagos: moment(fechaAprobacionPagos).toDate() } }
    })
    return res.status(200).json({ status: 'Orden aprobada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de aprobar esta orden ' + e.message })
  }
}
export const getDataOrdenesComprasPorPagar = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina, fechaActual, timeZone } = req.body
  console.log(req.body)
  try {
    const conteosPendientesPorPago = await agreggateCollectionsSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: 'pendientePagos' } },
        {
          $project: {
            numeroOrden: '$numeroOrden',
            fechaVencimiento: '$fechaVencimiento',
            diffFechaVencimiento:
            {
              $dateDiff: { startDate: moment(fechaActual).toDate(), endDate: '$fechaVencimiento', unit: 'day', timezone: timeZone }
            },
            total: '$total'
          }
        },
        {
          $group: {
            _id: 0,
            menorDos: {
              $sum: {
                $cond: {
                  if: { $lte: ['$diffFechaVencimiento', 2] }, then: 1, else: 0
                }
              }
            },
            menorTres: {
              $sum: {
                $cond: {
                  if: {
                    $and: [{ $gt: ['$diffFechaVencimiento', 2] }, { $lte: ['$diffFechaVencimiento', 3] }]
                  },
                  then: 1,
                  else: 0
                }
              }
            },
            menorCinco: {
              $sum: {
                $cond: {
                  if: {
                    $and: [{ $gt: ['$diffFechaVencimiento', 3] }, { $lte: ['$diffFechaVencimiento', 5] }]
                  },
                  then: 1,
                  else: 0
                }
              }
            },
            totalPorPagar: { $sum: '$total' }
          }
        }
      ]
    })
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const comprasPorProveedor = await agreggateCollectionsSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: 'pendientePagos' } },
        { $sort: { fechaVencimiento: 1 } },
        {
          $group: {
            _id: '$proveedorId',
            fechaVencimiento: { $first: '$fechaVencimiento' },
            costoTotal: { $first: '$total' }
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
            costoTotal: '$costoTotal',
            fechaVencimiento: '$fechaVencimiento',
            diffFechaVencimiento:
            {
              $dateDiff: { startDate: moment(fechaActual).toDate(), endDate: '$fechaVencimiento', unit: 'day', timezone: timeZone }
            }
          }
        }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: 'pendientePagos' } },
        { $sort: { fechaVencimiento: 1 } },
        {
          $group: {
            _id: '$proveedorId',
            count: { $sum: 1 }
          }
        }
      ]
    })
    return res.status(200).json({ conteosPendientesPorPago: conteosPendientesPorPago[0] ? conteosPendientesPorPago[0] : null, count: count.count, comprasPorProveedor })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las compras pendientes ' + e.message })
  }
}
export const getDetalleProveedor = async (req, res) => {
  const { clienteId, proveedorId, itemsPorPagina, pagina } = req.body
  try {
    const pagination = []
    if (itemsPorPagina && pagina) {
      pagination.push(
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) }
      )
    }
    const comprasPorProveedor = await agreggateCollectionsSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: 'pendientePagos', proveedorId: new ObjectId(proveedorId) } },
        /* { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) }, */
        ...pagination,
        {
          $project: {
            proveedorId: 1,
            numeroOrden: 1,
            costoTotal: '$total'
          }
        }
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: 'pendientePagos', proveedorId: new ObjectId(proveedorId) } },
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
  console.log(req.body)
  const { clienteId, proveedorId, abonos } = req.body
  try {
    const datosAbonos = []
    if (abonos[0]) {
      for (const abono of abonos) {
        datosAbonos.push({
          compraId: new ObjectId(abono.compraId),
          proveedorId: new ObjectId(proveedorId),
          pago: Number(abono.monto),
          fechaPago: moment(abono.fechaPago).toDate(),
          referencia: abono.referencia,
          banco: new ObjectId(abono.banco._id)
        })
      }
    }
    return res.status(200).json({ })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de realizar el pago de compras ' + e.message })
  }
}
