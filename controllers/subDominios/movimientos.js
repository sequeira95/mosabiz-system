import moment from 'moment'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, createManyItemsSD, deleteManyItemsSD, formatCollectionName, getItemSD, updateItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'
import { subDominioName, tipoMovimientosShort } from '../../constants.js'
import { hasContabilidad, validMovimientoAuditoria, validMovimientoPenditeEnvio, validMovimientoPenditeRecepcion } from '../../utils/hasContabilidad.js'
export const getDataMovimientos = async (req, res) => {
  const { clienteId, estado } = req.body
  try {
    const detalleMovimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleMovimientos' })
    const zonaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonas' })
    const almacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const matchEstados = estado === 'recibido' ? { estado } : { estado, tipo: { $ne: 'solicitudCompra ' } }
    const movimientos = await agreggateCollectionsSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: matchEstados },
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
            from: zonaCollection,
            localField: 'zona',
            foreignField: '_id',
            as: 'zona'
          }
        },
        { $unwind: { path: '$zona', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: almacenCollection,
            localField: 'almacenOrigen',
            foreignField: '_id',
            as: 'almacenOrigen'
          }
        },
        { $unwind: { path: '$almacenOrigen', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: almacenCollection,
            localField: 'almacenDestino',
            foreignField: '_id',
            as: 'almacenDestino'
          }
        },
        { $unwind: { path: '$almacenDestino', preserveNullAndEmptyArrays: true } }
      ]
    })
    return res.status(200).json({ movimientos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de bucar datos de los movimientos ' + e.message })
  }
}
export const getMovimientosAjustes = async (req, res) => {
  const { clienteId } = req.body
  try {
    const productosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productos' })
    const almacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const personasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const movimientosAjustes = await agreggateCollectionsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo: { $in: ['inicial', 'ajuste'] } } },
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
            from: personasCollection,
            localField: 'creadoPor',
            foreignField: 'usuarioId',
            as: 'detallePersona'
          }
        },
        { $unwind: { path: '$detallePersona', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: almacenCollection,
            localField: 'almacenId',
            foreignField: '_id',
            as: 'detalleAlmacen'
          }
        },
        { $unwind: { path: '$detalleAlmacen', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            cantidad: '$cantidad',
            almacenId: '$almacenId',
            almacenNombre: '$detalleAlmacen.nombre',
            productoId: '$productoId',
            productoNombre: '$detalleProducto.nombre',
            codigoProducto: '$detalleProducto.codigo',
            tipo: '$tipo',
            costoUnitario: '$costoUnitario',
            fechaMovimiento: '$fechaMovimiento',
            tipoMovimiento: '$tipoMovimiento',
            creadoPor: '$detallePersona.nombre'
          }
        },
        { $sort: { fechaMovimiento: -1 } }
      ]
    })
    return res.status(200).json({ movimientosAjustes })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de bucar datos de los movimientos ' + e.message })
  }
}
export const createMovimientos = async (req, res) => {
  const { clienteId, movimiento, estado, detalleMovimiento } = req.body
  try {
    let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: movimiento.tipo } }))?.contador
    console.log(contador)
    if (contador) ++contador
    if (!contador) contador = 1
    const newMovimiento = await createItemSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      item: {
        fecha: moment(movimiento.fechaActual).toDate(),
        fechaVencimiento: moment(movimiento.fechaVencimiento).toDate(),
        tipo: movimiento.tipo,
        almacenOrigen: movimiento.almacenOrigen ? new ObjectId(movimiento.almacenOrigen._id) : null,
        almacenDestino: movimiento.almacenDestino ? new ObjectId(movimiento.almacenDestino._id) : null,
        zona: movimiento.zona ? new ObjectId(movimiento.zona._id) : null,
        estado,
        numeroMovimiento: contador
      }
    })
    createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        idMovimiento: newMovimiento.insertedId,
        categoria: 'creado',
        tipo: 'Movimiento',
        fecha: moment().toDate(),
        descripcion: `Movimiento ${tipoMovimientosShort[movimiento.tipo]}-${contador} creado`,
        creadoPor: new ObjectId(req.uid)
      }
    })
    upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: movimiento.tipo }, update: { $set: { contador } } })
    const detalle = detalleMovimiento.map(e => {
      return {
        movimientoId: newMovimiento.insertedId,
        productoId: new ObjectId(e._id),
        codigo: e.codigo,
        descripcion: e.descripcion,
        nombre: e.nombre,
        observacion: e.observacion,
        unidad: e.unidad,
        cantidad: e.cantidad
      }
    })
    await createManyItemsSD({
      nameCollection: 'detalleMovimientos',
      enviromentClienteId: clienteId,
      items: [
        ...detalle
      ]
    })
    return res.status(200).json({ status: 'Movimiento guardado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el movimiento ' + e.message })
  }
}
export const updateEstadoMovimiento = async (req, res) => {
  const { _id, clienteId, estado, fechaEnvio, fechaRecepcionEstimada, detalleMovimientos, fechaEntrega, almacenOrigen, almacenDestino } = req.body
  try {
    const updateMovimiento = {}
    if (estado === 'recepcionPendiente') {
      updateMovimiento.fechaEnvio = moment(fechaEnvio).toDate()
      updateMovimiento.fechaRecepcionEstimada = moment(fechaRecepcionEstimada).toDate()
    }
    if (estado === 'recibido') {
      updateMovimiento.fechaEntrega = moment(fechaEntrega).toDate()
      if (detalleMovimientos.every(e => e.cantidad === e.cantidadRecibido)) {
        updateMovimiento.estadoRecepcion = 'Satisfactorio'
      } else {
        updateMovimiento.estadoRecepcion = 'Con diferencia'
      }
    }
    const tieneContabilidad = await hasContabilidad({ clienteId })
    console.log({ tieneContabilidad })
    let comprobante = null
    let periodo = null
    if (tieneContabilidad) {
      console.log({ estado })
      if (estado === 'recepcionPendiente') {
        const validContabilidad = await validMovimientoPenditeEnvio({ clienteId, detalleMovimientos, almacenOrigen })
        console.log({ pa: validContabilidad.message })
        if (validContabilidad && validContabilidad.message) {
          return res.status(500).json({ error: 'Error al momento de validar información contable: ' + validContabilidad.message })
        }
      }
      if (estado === 'recibido') {
        const validContabilidad = await validMovimientoPenditeRecepcion({ clienteId, detalleMovimientos, almacenDestino, _id })
        console.log(validContabilidad.message)
        if (validContabilidad && validContabilidad.message) {
          return res.status(500).json({ error: 'Error al momento de validar información contable: ' + validContabilidad.message })
        }
      }
      const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
      periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fechaEnvio).toDate() }, fechaFin: { $gte: moment(fechaEnvio).toDate() } } })
      console.log({ periodo })
      if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha de envio o de recepción')
      const mesPeriodo = moment(fechaEnvio).format('YYYY/MM')
      comprobante = await getItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: ajusteInventario.codigoComprobanteMovimientos, periodoId: periodo._id, mesPeriodo }
      })
      if (!comprobante) {
        comprobante = await upsertItemSD({
          nameCollection: 'comprobantes',
          enviromentClienteId: clienteId,
          filters: { codigo: ajusteInventario.codigoComprobanteMovimientos, periodoId: periodo._id, mesPeriodo },
          update: {
            $set: {
              nombre: 'Movimientos de inventario',
              isBloqueado: false,
              fechaCreacion: moment().toDate()
            }
          }
        })
      }
    }
    const movimiento = await updateItemSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: { $set: { estado, ...updateMovimiento } }
    })
    let descripcion = ''
    if (estado === 'recepcionPendiente') {
      console.log('entrando')
      descripcion = 'Cambió estado a pendiente por recibir'
      updateMovimientoSalida({ detalleMovimientos, almacenOrigen, almacenDestino, clienteId, uid: req.uid, comprobante, periodo, fechaEnvio, movimiento, tieneContabilidad })
    }
    if (estado === 'recibido') {
      descripcion = 'Cambió estado a recibido'
      updateMovimientoEntrada({ detalleMovimientos, almacenOrigen, almacenDestino, clienteId, uid: req.uid, fechaEntrega, movimiento, comprobante, tieneContabilidad, periodo })
      const newDetalle = detalleMovimientos.map(e => {
        return {
          updateOne: {
            filter: { _id: new ObjectId(e._id) },
            update: {
              $set: {
                cantidadRecibido: e.cantidadRecibido
              }
            }
          }
        }
      })
      bulkWriteSD({ nameCollection: 'detalleMovimientos', enviromentClienteId: clienteId, pipeline: newDetalle })
    }
    createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        idMovimiento: new ObjectId(_id),
        categoria: 'editado',
        tipo: 'Movimiento',
        fecha: moment().toDate(),
        descripcion,
        creadoPor: new ObjectId(req.uid)
      }
    })
    return res.status(200).json({ status: 'Movimiento actualizado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de actualizar el movimiento ' + e.message })
  }
}
export const cancelarMovimiento = async (req, res) => {
  const { clienteId, movimientoId, observacion } = req.body
  try {
    const movimiento = await updateItemSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(movimientoId) },
      update: { $set: { estado: 'Cancelado', observacion } }
    })
    deleteManyItemsSD({ nameCollection: 'productosPorAlmacen', enviromentClienteId: clienteId, filters: { movimientoId: new ObjectId(movimientoId) } })
    createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        creadoPor: new ObjectId(req.uid),
        idMovimiento: new ObjectId(movimientoId),
        categoria: 'editado',
        tipo: 'Movimiento',
        fecha: moment().toDate(),
        descripcion: `Movimiento ${movimiento.numeroMovimiento} cancelado`
      }
    })
    return res.status(200).json({ status: 'Movimiento cancelado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de cancelar el movimiento ' + e.message })
  }
}
const updateMovimientoSalida = async ({ detalleMovimientos, almacenOrigen, almacenDestino, clienteId, uid, comprobante, periodo, fechaEnvio, movimiento, tieneContabilidad }) => {
  // console.log({ detalleMovimientos, almacenOrigen, almacenDestino })
  const detallesCrear = []
  const almacenTransito = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Transito' } })
  const asientosContables = []
  const zona = await getItemSD({ nameCollection: 'zonas', enviromentClienteId: clienteId, filters: { _id: new ObjectId(movimiento.zona) } })
  // let sumAlmacenTransito = 0
  for (const detalle of detalleMovimientos) {
    const datosMovivientoPorProducto = await agreggateCollectionsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { productoId: new ObjectId(detalle.productoId), almacenId: new ObjectId(almacenOrigen._id) } },
        {
          $group: {
            _id: {
              costoUnitario: '$costoUnitario',
              // fechaMovimiento: '$fechaMovimiento',
              lote: '$lote',
              fechaVencimiento: '$fechaVencimiento',
              fechaIngreso: '$fechaIngreso'
            },
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
            _id: 0,
            costoUnitario: '$_id.costoUnitario',
            // fechaMovimiento: '$_id.fechaMovimiento',
            fechaIngreso: '$_id.fechaIngreso',
            lote: '$_id.lote',
            fechaVencimiento: '$_id.fechaVencimiento',
            cantidad: { $subtract: ['$entrada', '$salida'] } // cantidad de producto en el almacen de origen
          }
        },
        { $match: { cantidad: { $gt: 0 } } },
        { $sort: { fechaIngreso: 1, lote: 1 } }
      ]
    })
    console.log({ datosMovivientoPorProducto })
    let asientoContableHaber = {}
    let asientoContableDebe = {}
    if (tieneContabilidad) {
      const producto = await getItemSD({ nameCollection: 'productos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(detalle.productoId) } })
      const categoriaPorAlmacen = await getItemSD({
        nameCollection: 'categoriaPorAlmacen',
        enviromentClienteId: clienteId,
        filters: { categoriaId: producto.categoria, almacenId: new ObjectId(almacenOrigen._id) }
      })
      const categoriaPorAlmacenTransito = await getItemSD({
        nameCollection: 'categoriaPorAlmacen',
        enviromentClienteId: clienteId,
        filters: { categoriaId: producto.categoria, almacenId: almacenTransito._id }
      })
      const cuentaPorCategoria = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: categoriaPorAlmacen.cuentaId } })
      const cuentaPorCategoriaTransito = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: categoriaPorAlmacenTransito.cuentaId } })
      asientoContableHaber = {
        cuentaId: new ObjectId(cuentaPorCategoria._id),
        cuentaCodigo: cuentaPorCategoria.codigo,
        cuentaNombre: cuentaPorCategoria.descripcion,
        comprobanteId: new ObjectId(comprobante._id),
        periodoId: new ObjectId(periodo._id),
        descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} DESDE ${almacenOrigen.nombre} HASTA ${zona?.nombre ? zona.nombre : almacenDestino.nombre}`,
        fecha: moment(fechaEnvio).toDate(),
        fechaCreacion: moment().toDate(),
        docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
        documento: {
          docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
          docFecha: moment(fechaEnvio).toDate()
        }
      }
      asientoContableDebe = {
        cuentaId: new ObjectId(cuentaPorCategoriaTransito._id),
        cuentaCodigo: cuentaPorCategoriaTransito.codigo,
        cuentaNombre: cuentaPorCategoriaTransito.descripcion,
        comprobanteId: new ObjectId(comprobante._id),
        periodoId: new ObjectId(periodo._id),
        descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} DESDE ${almacenOrigen.nombre} HASTA ${zona?.nombre ? zona.nombre : almacenDestino.nombre}`,
        fecha: moment(fechaEnvio).toDate(),
        fechaCreacion: moment().toDate(),
        docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
        documento: {
          docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
          docFecha: moment(fechaEnvio).toDate()
        }
      }
    }
    let costoProductoTotal = 0
    for (const movimientos of datosMovivientoPorProducto) {
      if (detalle.cantidad === 0) break
      if (detalle.cantidad >= movimientos.cantidad) {
        console.log({ 1: movimientos.fechaIngreso })
        costoProductoTotal += movimientos.costoUnitario * Number(movimientos.cantidad)
        detallesCrear.push({
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(movimientos.cantidad),
          almacenId: new ObjectId(almacenOrigen._id),
          almacenOrigen: new ObjectId(almacenOrigen._id),
          almacenDestino: new ObjectId(almacenTransito._id),
          tipo: 'movimiento',
          tipoMovimiento: 'salida',
          lote: movimientos.lote,
          fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
          fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
          fechaMovimiento: moment().toDate(),
          costoUnitario: movimientos.costoUnitario,
          creadoPor: new ObjectId(uid)
        }, {
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(movimientos.cantidad),
          almacenId: new ObjectId(almacenTransito._id),
          almacenOrigen: new ObjectId(almacenTransito._id),
          almacenDestino: almacenDestino?._id ? new ObjectId(almacenDestino._id) : null,
          tipo: 'movimiento',
          tipoMovimiento: 'entrada',
          lote: movimientos.lote,
          fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
          fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
          fechaMovimiento: moment().toDate(),
          costoUnitario: movimientos.costoUnitario,
          creadoPor: new ObjectId(uid)
        })
        detalle.cantidad -= movimientos.cantidad
        continue
      }
      if (detalle.cantidad < movimientos.cantidad) {
        costoProductoTotal += movimientos.costoUnitario * detalle.cantidad
        detallesCrear.push({
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(detalle.cantidad),
          almacenId: new ObjectId(almacenOrigen._id),
          almacenOrigen: new ObjectId(almacenOrigen._id),
          almacenDestino: new ObjectId(almacenTransito._id),
          tipo: 'movimiento',
          tipoMovimiento: 'salida',
          lote: movimientos.lote,
          fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
          fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
          fechaMovimiento: moment().toDate(),
          costoUnitario: movimientos.costoUnitario,
          creadoPor: new ObjectId(uid)
        },
        {
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(detalle.cantidad),
          almacenId: new ObjectId(almacenTransito._id),
          almacenOrigen: new ObjectId(almacenTransito._id),
          almacenDestino: almacenDestino?._id ? new ObjectId(almacenDestino._id) : null,
          tipo: 'movimiento',
          tipoMovimiento: 'entrada',
          lote: movimientos.lote,
          fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
          fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
          fechaMovimiento: moment().toDate(),
          costoUnitario: movimientos.costoUnitario,
          creadoPor: new ObjectId(uid)
        })
        detalle.cantidad = 0
        break
      }
    }
    asientoContableHaber.debe = 0
    asientoContableHaber.haber = costoProductoTotal
    asientoContableDebe.debe = costoProductoTotal
    asientoContableDebe.haber = 0
    // sumAlmacenTransito += costoProductoTotal
    asientosContables.push(asientoContableDebe, asientoContableHaber)
  }
  console.log({ asientosContables })
  if (tieneContabilidad) {
    /* const cuentaAlmacenTransito = { almacen: 'cuando exista como se guardará almacen de transito eso es lo que irá aqui ' }
    const asientoContableDebe = {
      cuentaId: new ObjectId(cuentaAlmacenTransito._id),
      cuentaCodigo: cuentaAlmacenTransito.codigo,
      cuentaNombre: cuentaAlmacenTransito.descripcion,
      comprobanteId: new ObjectId(comprobante._id),
      periodoId: new ObjectId(periodo._id),
      descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} DESDE ${almacenOrigen.nombre} HASTA ${zona.nombre}`,
      fecha: moment(fechaEnvio).toDate(),
      fechaCreacion: moment().toDate(),
      debe: sumAlmacenTransito,
      haber: 0,
      docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
      documento: {
        docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
        docFecha: moment(fechaEnvio).toDate()
      }
    }
    asientosContables.unshift(asientoContableDebe) */
    createManyItemsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      items: asientosContables
    })
  }
  console.log({ detallesCrear })
  createManyItemsSD({
    nameCollection: 'productosPorAlmacen',
    enviromentClienteId: clienteId,
    items: detallesCrear
  })
}
const updateMovimientoEntrada = async ({ detalleMovimientos, almacenOrigen, almacenDestino, clienteId, uid, fechaEntrega, movimiento, comprobante, periodo, tieneContabilidad }) => {
  const zona = await getItemSD({ nameCollection: 'zonas', enviromentClienteId: clienteId, filters: { _id: new ObjectId(movimiento.zona) } })
  const almacenTransito = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Transito' } })
  const almacenAuditoria = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Auditoria' } })
  const detallesCrear = []
  const asientosContables = []
  for (const detalle of detalleMovimientos) {
    // console.log({ detalle })
    const producto = await getItemSD({ nameCollection: 'productos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(detalle.productoId) } })
    const detallesMovimientosPorProducto = await agreggateCollectionsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { productoId: new ObjectId(detalle.productoId), movimientoId: new ObjectId(detalle.movimientoId), almacenId: almacenTransito._id, tipoMovimiento: 'entrada' } }
      ]
    })
    console.log({ detallesMovimientosPorProducto })
    let costoProductosPorAlmacen = 0
    let costoAlmacenAuditoria = 0
    let ultimoCosto = 0
    let ultimoLote = ''
    let ultimaFechaVencimiento = ''
    let UltimaFechaIngreso = ''
    for (const movimientos of detallesMovimientosPorProducto) {
      ultimoCosto = movimientos.costoUnitario
      ultimaFechaVencimiento = movimientos.fechaVencimiento
      UltimaFechaIngreso = movimientos.fechaIngreso
      ultimoLote = movimientos.lote
      console.log({ 2: movimientos.fechaIngreso })
      if (detalle.cantidadRecibido === 0 && movimientos.cantidad) {
        costoAlmacenAuditoria += movimientos.costoUnitario * Number(movimientos.cantidad)
        detallesCrear.push({
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(movimientos.cantidad),
          almacenId: almacenAuditoria._id,
          almacenOrigen: new ObjectId(almacenTransito._id),
          almacenDestino: almacenAuditoria._id,
          tipo: 'movimiento',
          tipoMovimiento: 'entrada',
          lote: movimientos.lote,
          fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
          fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
          tipoAuditoria: 'faltante',
          fechaMovimiento: moment().toDate(),
          costoUnitario: movimientos.costoUnitario,
          creadoPor: new ObjectId(uid)
        })
        detallesCrear.push({
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(movimientos.cantidad),
          almacenId: new ObjectId(almacenTransito._id),
          almacenOrigen: new ObjectId(almacenTransito._id),
          almacenDestino: almacenAuditoria._id,
          tipo: 'movimiento',
          tipoMovimiento: 'salida',
          lote: movimientos.lote,
          fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
          fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
          fechaMovimiento: moment().toDate(),
          costoUnitario: movimientos.costoUnitario,
          creadoPor: new ObjectId(uid)
        })
        continue
      }
      if (detalle.cantidadRecibido === 0) break
      if (detalle.cantidadRecibido >= movimientos.cantidad) {
        costoProductosPorAlmacen += movimientos.costoUnitario * movimientos.cantidad
        if (almacenDestino && almacenDestino._id) {
          detallesCrear.push({
            productoId: new ObjectId(detalle.productoId),
            movimientoId: new ObjectId(detalle.movimientoId),
            cantidad: Number(movimientos.cantidad),
            almacenId: almacenDestino?._id ? new ObjectId(almacenDestino._id) : null,
            almacenOrigen: new ObjectId(almacenTransito._id),
            almacenDestino: almacenDestino?._id ? new ObjectId(almacenDestino._id) : null,
            tipo: 'movimiento',
            tipoMovimiento: 'entrada',
            lote: movimientos.lote,
            fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
            fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: movimientos.costoUnitario,
            creadoPor: new ObjectId(uid)
          })
        }
        if (zona && zona._id) {
          detallesCrear.push({
            productoId: new ObjectId(detalle.productoId),
            movimientoId: new ObjectId(detalle.movimientoId),
            cantidad: Number(movimientos.cantidad),
            zonaId: zona?._id ? new ObjectId(zona._id) : null,
            almacenOrigen: new ObjectId(almacenTransito._id),
            zonaDestino: zona?._id ? new ObjectId(zona._id) : null,
            tipo: 'movimiento',
            tipoMovimiento: 'entrada',
            lote: movimientos.lote,
            fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
            fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: movimientos.costoUnitario,
            creadoPor: new ObjectId(uid)
          })
        }
        detallesCrear.push({
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(movimientos.cantidad),
          almacenId: new ObjectId(almacenTransito._id),
          almacenOrigen: new ObjectId(almacenTransito._id),
          almacenDestino: almacenDestino?._id ? new ObjectId(almacenDestino._id) : null,
          tipo: 'movimiento',
          tipoMovimiento: 'salida',
          lote: movimientos.lote,
          fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
          fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
          fechaMovimiento: moment().toDate(),
          costoUnitario: movimientos.costoUnitario,
          creadoPor: new ObjectId(uid)
        })
        detalle.cantidadRecibido -= movimientos.cantidad
        continue
      }
      if (detalle.cantidadRecibido < movimientos.cantidad) {
        if (almacenDestino && almacenDestino._id) {
          detallesCrear.push({
            productoId: new ObjectId(detalle.productoId),
            movimientoId: new ObjectId(detalle.movimientoId),
            cantidad: Number(detalle.cantidadRecibido),
            almacenId: almacenDestino?._id ? new ObjectId(almacenDestino._id) : null,
            almacenOrigen: new ObjectId(almacenTransito._id),
            almacenDestino: almacenDestino?._id ? new ObjectId(almacenDestino._id) : null,
            tipo: 'movimiento',
            tipoMovimiento: 'entrada',
            lote: movimientos.lote,
            fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
            fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: movimientos.costoUnitario,
            creadoPor: new ObjectId(uid)
          })
        }
        if (zona && zona._id) {
          detallesCrear.push({
            productoId: new ObjectId(detalle.productoId),
            movimientoId: new ObjectId(detalle.movimientoId),
            cantidad: Number(detalle.cantidadRecibido),
            almacenOrigen: new ObjectId(almacenTransito._id),
            zonaId: zona?._id ? new ObjectId(zona._id) : null,
            zonaDestino: zona?._id ? new ObjectId(zona._id) : null,
            tipo: 'movimiento',
            tipoMovimiento: 'entrada',
            lote: movimientos.lote,
            fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
            fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: movimientos.costoUnitario,
            creadoPor: new ObjectId(uid)
          })
        }
        detallesCrear.push({
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(detalle.cantidadRecibido),
          almacenId: new ObjectId(almacenTransito._id),
          almacenOrigen: new ObjectId(almacenTransito._id),
          almacenDestino: almacenDestino?._id ? new ObjectId(almacenDestino._id) : null,
          tipo: 'movimiento',
          tipoMovimiento: 'salida',
          lote: movimientos.lote,
          fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
          fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
          fechaMovimiento: moment().toDate(),
          costoUnitario: movimientos.costoUnitario,
          creadoPor: new ObjectId(uid)
        })
        const sumaRecibida = Number(detalle.cantidadRecibido) * movimientos.costoUnitario
        costoProductosPorAlmacen += sumaRecibida
        const faltante = Number(movimientos.cantidad) - Number(detalle.cantidadRecibido)
        if (faltante > 0) {
          costoAlmacenAuditoria += movimientos.costoUnitario * Number(faltante)
          detallesCrear.push({
            productoId: new ObjectId(detalle.productoId),
            movimientoId: new ObjectId(detalle.movimientoId),
            cantidad: Number(faltante),
            almacenId: almacenAuditoria._id,
            almacenOrigen: new ObjectId(almacenTransito._id),
            almacenDestino: almacenAuditoria._id,
            tipo: 'movimiento',
            tipoMovimiento: 'entrada',
            tipoAuditoria: 'faltante',
            lote: movimientos.lote,
            fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
            fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: movimientos.costoUnitario,
            creadoPor: new ObjectId(uid)
          })
          detallesCrear.push({
            productoId: new ObjectId(detalle.productoId),
            movimientoId: new ObjectId(detalle.movimientoId),
            cantidad: Number(faltante),
            almacenId: new ObjectId(almacenTransito._id),
            almacenOrigen: new ObjectId(almacenTransito._id),
            almacenDestino: almacenAuditoria._id,
            tipo: 'movimiento',
            tipoMovimiento: 'salida',
            lote: movimientos.lote,
            fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
            fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: movimientos.costoUnitario,
            creadoPor: new ObjectId(uid)
          })
        }
        detalle.cantidadRecibido = 0
        continue
      }
    }
    if (detalle.cantidadRecibido > 0) {
      detallesCrear.push({
        productoId: new ObjectId(detalle.productoId),
        movimientoId: new ObjectId(detalle.movimientoId),
        cantidad: Number(detalle.cantidadRecibido),
        almacenId: almacenAuditoria._id,
        almacenOrigen: almacenTransito._id,
        almacenDestino: null,
        tipo: 'movimiento',
        tipoMovimiento: 'entrada',
        tipoAuditoria: 'sobrante',
        fechaMovimiento: moment().toDate(),
        costoUnitario: ultimoCosto,
        lote: ultimoLote,
        fechaVencimiento: moment(ultimaFechaVencimiento).toDate(),
        fechaIngreso: moment(UltimaFechaIngreso).toDate(),
        creadoPor: new ObjectId(uid)
      })
      if (almacenDestino && almacenDestino._id) {
        detallesCrear.push({
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(detalle.cantidadRecibido),
          almacenId: new ObjectId(almacenDestino._id),
          almacenOrigen: almacenTransito._id,
          almacenDestino: new ObjectId(almacenDestino._id),
          tipo: 'movimiento',
          tipoMovimiento: 'entrada',
          // tipoAuditoria: 'sobrante',
          fechaMovimiento: moment().toDate(),
          costoUnitario: ultimoCosto,
          lote: ultimoLote,
          fechaVencimiento: moment(ultimaFechaVencimiento).toDate(),
          fechaIngreso: moment(UltimaFechaIngreso).toDate(),
          creadoPor: new ObjectId(uid)
        })
      }
      if (zona && zona._id) {
        detallesCrear.push({
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(detalle.cantidadRecibido),
          almacenOrigen: almacenTransito._id,
          zonaId: zona?._id ? new ObjectId(zona._id) : null,
          zonaDestino: zona?._id ? new ObjectId(zona._id) : null,
          tipo: 'movimiento',
          tipoMovimiento: 'entrada',
          // tipoAuditoria: 'sobrante',
          fechaMovimiento: moment().toDate(),
          costoUnitario: ultimoCosto,
          lote: ultimoLote,
          fechaVencimiento: moment(ultimaFechaVencimiento).toDate(),
          fechaIngreso: moment(UltimaFechaIngreso).toDate(),
          creadoPor: new ObjectId(uid)
        })
      }
    }
    if (tieneContabilidad) {
      console.log({ costoAlmacenAuditoria, costoProductosPorAlmacen })
      const categoriaPorAlmacen = await getItemSD({
        nameCollection: 'categoriaPorAlmacen',
        enviromentClienteId: clienteId,
        filters: { categoriaId: producto.categoria, almacenId: new ObjectId(almacenDestino?._id) }
      })
      const categoriaPorAlmacenTransito = await getItemSD({
        nameCollection: 'categoriaPorAlmacen',
        enviromentClienteId: clienteId,
        filters: { categoriaId: producto.categoria, almacenId: almacenTransito._id }
      })
      let cuentaEntrada = null
      if (almacenDestino) {
        cuentaEntrada = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: categoriaPorAlmacen.cuentaId } })
      }
      if (zona) {
        cuentaEntrada = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: zona.cuentaId } })
      }
      const cuentaPorCategoriaTransito = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: categoriaPorAlmacenTransito.cuentaId } })
      // costoProductosPorAlmacen -= costoAlmacenAuditoria
      const asientoContableHaber = {
        cuentaId: new ObjectId(cuentaPorCategoriaTransito._id),
        cuentaCodigo: cuentaPorCategoriaTransito.codigo,
        cuentaNombre: cuentaPorCategoriaTransito.descripcion,
        comprobanteId: new ObjectId(comprobante._id),
        periodoId: new ObjectId(periodo._id),
        descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} DESDE ${almacenOrigen.nombre} HASTA ${zona?.nombre ? zona.nombre : almacenDestino.nombre}`,
        fecha: moment(fechaEntrega).toDate(),
        debe: 0,
        haber: costoProductosPorAlmacen + costoAlmacenAuditoria,
        fechaCreacion: moment().toDate(),
        docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
        documento: {
          docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
          docFecha: moment(fechaEntrega).toDate()
        }
      }
      const asientoContableDebe = {
        cuentaId: new ObjectId(cuentaEntrada._id),
        cuentaCodigo: cuentaEntrada.codigo,
        cuentaNombre: cuentaEntrada.descripcion,
        comprobanteId: new ObjectId(comprobante._id),
        periodoId: new ObjectId(periodo._id),
        descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} DESDE ${almacenOrigen.nombre} HASTA ${zona?.nombre ? zona.nombre : almacenDestino.nombre}`,
        fecha: moment(fechaEntrega).toDate(),
        debe: detalle.cantidadRecibido > 0 ? (ultimoCosto * detalle.cantidadRecibido) + costoProductosPorAlmacen : costoProductosPorAlmacen,
        haber: 0,
        fechaCreacion: moment().toDate(),
        docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
        documento: {
          docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
          docFecha: moment(fechaEntrega).toDate()
        }
      }
      if (costoAlmacenAuditoria) {
        const categoriaPorAlmacenAuditoria = await getItemSD({
          nameCollection: 'categoriaPorAlmacen',
          enviromentClienteId: clienteId,
          filters: { categoriaId: producto.categoria, almacenId: almacenAuditoria._id }
        })
        const cuentaPorCategoriaAuditoria = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: categoriaPorAlmacenAuditoria.cuentaId } })
        const asientoAuditoria = {
          cuentaId: new ObjectId(cuentaPorCategoriaAuditoria._id),
          cuentaCodigo: cuentaPorCategoriaAuditoria.codigo,
          cuentaNombre: cuentaPorCategoriaAuditoria.descripcion,
          comprobanteId: new ObjectId(comprobante._id),
          periodoId: new ObjectId(periodo._id),
          descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} DESDE ${almacenOrigen.nombre} HASTA ${zona?.nombre ? zona.nombre : almacenDestino.nombre}`,
          fecha: moment(fechaEntrega).toDate(),
          debe: costoAlmacenAuditoria,
          haber: 0,
          fechaCreacion: moment().toDate(),
          docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
          documento: {
            docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
            docFecha: moment(fechaEntrega).toDate()
          }
        }
        asientosContables.push(asientoAuditoria)
      }
      asientosContables.push(asientoContableDebe, asientoContableHaber)
      if (detalle.cantidadRecibido > 0) {
        const categoriaPorAlmacenAuditoria = await getItemSD({
          nameCollection: 'categoriaPorAlmacen',
          enviromentClienteId: clienteId,
          filters: { categoriaId: producto.categoria, almacenId: almacenAuditoria._id }
        })
        const cuentaPorCategoriaAuditoria = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: categoriaPorAlmacenAuditoria.cuentaId } })
        const asientoAuditoria = {
          cuentaId: new ObjectId(cuentaPorCategoriaAuditoria._id),
          cuentaCodigo: cuentaPorCategoriaAuditoria.codigo,
          cuentaNombre: cuentaPorCategoriaAuditoria.descripcion,
          comprobanteId: new ObjectId(comprobante._id),
          periodoId: new ObjectId(periodo._id),
          descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} DESDE ${almacenOrigen.nombre} HASTA ${zona?.nombre ? zona.nombre : almacenDestino.nombre}`,
          fecha: moment(fechaEntrega).toDate(),
          haber: ultimoCosto * detalle.cantidadRecibido,
          debe: 0,
          fechaCreacion: moment().toDate(),
          docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
          documento: {
            docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
            docFecha: moment(fechaEntrega).toDate()
          }
        }
        asientosContables.push(asientoAuditoria)
      }
    }
  }
  console.log({ detallesCrear })
  console.log({ asientosContables })
  createManyItemsSD({
    nameCollection: 'productosPorAlmacen',
    enviromentClienteId: clienteId,
    items: detallesCrear
  })
  if (tieneContabilidad) {
    createManyItemsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      items: asientosContables
    })
  }
}
export const saveAjusteAlmacenAuditoria = async (req, res) => {
  const { clienteId, cantidad, tipoAjuste, almacen, fechaRegistro, movimientoId, productoId, costoUnitario, tipoAuditoria, lote, fechaVencimiento, fechaIngreso } = req.body
  try {
    console.log({ 3: fechaIngreso })
    const tieneContabilidad = await hasContabilidad({ clienteId })
    if (tieneContabilidad) {
      const validContabilidad = validMovimientoAuditoria({ clienteId, tipoAjuste, almacen, productoId })
      if (validContabilidad && validContabilidad.message) {
        return res.status(500).json({ error: 'Error al momento de validar información contable: ' + validContabilidad.message })
      }
    }
    const almacenAuditoria = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Auditoria' } })
    const producto = await getItemSD({ nameCollection: 'productos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(productoId) } })
    let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'ajuste' } }))?.contador
    if (contador) ++contador
    if (!contador) contador = 1
    const movimiento = await createItemSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      item: {
        fecha: moment().toDate(),
        fechaVencimiento: moment().toDate(),
        tipo: 'Ajuste',
        almacenOrigen: almacenAuditoria?._id,
        almacenDestino: almacen ? new ObjectId(almacen?._id) : null,
        zona: null,
        numeroMovimiento: contador,
        creadoPor: new ObjectId(req.uid)
      }
    })
    createItemSD({
      nameCollection: 'detalleMovimientos',
      enviromentClienteId: clienteId,
      item: {
        movimientoId: movimiento.insertedId,
        productoId: new ObjectId(productoId),
        codigo: producto.codigo,
        descripcion: producto.descripcion,
        nombre: producto.nombre,
        observacion: producto.observacion,
        unidad: producto.unidad,
        cantidad: Number(cantidad)
      }
    })
    const detalleMovimientoAfectado = await getItemSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(movimientoId) }
    })
    if (tipoAuditoria === 'sobrante') {
      if (tipoAjuste === 'Almacen') {
        const detallesCrear = [
          {
            productoId: new ObjectId(productoId),
            movimientoId: movimiento.insertedId,
            cantidad: Number(cantidad),
            almacenId: almacenAuditoria._id,
            almacenOrigen: almacenAuditoria._id,
            almacenDestino: almacen ? new ObjectId(almacen._id) : null,
            tipoAuditoria,
            tipo: 'ajuste',
            tipoMovimiento: 'salida',
            lote,
            fechaVencimiento: moment(fechaVencimiento).toDate(),
            fechaIngreso: moment(fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: Number(costoUnitario),
            movimientoAfectado: new ObjectId(movimientoId),
            afecta: tipoAjuste,
            creadoPor: new ObjectId(req.uid)
          },
          {
            productoId: new ObjectId(productoId),
            movimientoId: movimiento.insertedId,
            cantidad: Number(cantidad),
            almacenId: detalleMovimientoAfectado.almacenDestino,
            almacenOrigen: detalleMovimientoAfectado.almacenDestino,
            almacenDestino: almacen ? new ObjectId(almacen._id) : null,
            tipoAuditoria,
            tipo: 'ajuste',
            tipoMovimiento: 'salida',
            lote,
            fechaVencimiento: moment(fechaVencimiento).toDate(),
            fechaIngreso: moment(fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: Number(costoUnitario),
            movimientoAfectado: new ObjectId(movimientoId),
            afecta: tipoAjuste,
            creadoPor: new ObjectId(req.uid)
          }
        ]
        createManyItemsSD({
          nameCollection: 'productosPorAlmacen',
          enviromentClienteId: clienteId,
          items: detallesCrear
        })
      }
      if (tipoAjuste === 'Sobrante') {
        const detallesCrear = [
          {
            productoId: new ObjectId(productoId),
            movimientoId: movimiento.insertedId,
            cantidad: Number(cantidad),
            almacenId: almacenAuditoria._id,
            almacenOrigen: almacenAuditoria._id,
            almacenDestino: almacen ? new ObjectId(almacen._id) : null,
            tipoAuditoria,
            tipo: 'ajuste',
            tipoMovimiento: 'salida',
            lote,
            fechaVencimiento: moment(fechaVencimiento).toDate(),
            fechaIngreso: moment(fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: Number(costoUnitario),
            movimientoAfectado: new ObjectId(movimientoId),
            afecta: tipoAjuste,
            creadoPor: new ObjectId(req.uid)
          }
        ]
        createManyItemsSD({
          nameCollection: 'productosPorAlmacen',
          enviromentClienteId: clienteId,
          items: detallesCrear
        })
      }
    }
    if (tipoAuditoria === 'faltante') {
      if (tipoAjuste === 'Almacen') {
        const detallesCrear = [
          {
            productoId: new ObjectId(productoId),
            movimientoId: movimiento.insertedId,
            cantidad: Number(cantidad),
            almacenId: almacenAuditoria._id,
            almacenOrigen: almacenAuditoria._id,
            almacenDestino: almacen ? new ObjectId(almacen._id) : null,
            tipoAuditoria,
            tipo: 'ajuste',
            tipoMovimiento: 'salida',
            lote,
            fechaVencimiento: moment(fechaVencimiento).toDate(),
            fechaIngreso: moment(fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: Number(costoUnitario),
            movimientoAfectado: new ObjectId(movimientoId),
            afecta: tipoAjuste,
            creadoPor: new ObjectId(req.uid)
          },
          {
            productoId: new ObjectId(productoId),
            movimientoId: new ObjectId(movimiento.insertedId),
            cantidad: Number(cantidad),
            almacenId: new ObjectId(almacen._id),
            almacenOrigen: almacenAuditoria._id,
            almacenDestino: new ObjectId(almacen._id),
            tipo: 'ajuste',
            tipoMovimiento: 'entrada',
            lote,
            fechaVencimiento: moment(fechaVencimiento).toDate(),
            fechaIngreso: moment(fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: Number(costoUnitario),
            creadoPor: new ObjectId(req.uid)
          }
        ]
        createManyItemsSD({
          nameCollection: 'productosPorAlmacen',
          enviromentClienteId: clienteId,
          items: detallesCrear
        })
        if (almacen) {
          detallesCrear.push({
            productoId: new ObjectId(productoId),
            movimientoId: new ObjectId(movimiento.insertedId),
            cantidad: Number(cantidad),
            almacenId: new ObjectId(almacen._id),
            almacenOrigen: almacenAuditoria._id,
            almacenDestino: new ObjectId(almacen._id),
            tipo: 'ajuste',
            tipoMovimiento: 'entrada',
            lote,
            fechaVencimiento: moment(fechaVencimiento).toDate(),
            fechaIngreso: moment(fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: Number(costoUnitario),
            creadoPor: new ObjectId(req.uid)
          })
        }
      }
      if (tipoAjuste === 'Faltante') {
        const detallesCrear = [
          {
            productoId: new ObjectId(productoId),
            movimientoId: movimiento.insertedId,
            cantidad: Number(cantidad),
            almacenId: almacenAuditoria._id,
            almacenOrigen: almacenAuditoria._id,
            almacenDestino: almacen ? new ObjectId(almacen._id) : null,
            tipoAuditoria,
            tipo: 'ajuste',
            tipoMovimiento: 'salida',
            lote,
            fechaVencimiento: moment(fechaVencimiento).toDate(),
            fechaIngreso: moment(fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: Number(costoUnitario),
            movimientoAfectado: new ObjectId(movimientoId),
            afecta: tipoAjuste,
            creadoPor: new ObjectId(req.uid)
          }
        ]
        createManyItemsSD({
          nameCollection: 'productosPorAlmacen',
          enviromentClienteId: clienteId,
          items: detallesCrear
        })
      }
    }
    createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        idMovimiento: movimiento.insertedId,
        categoria: 'creado',
        tipo: 'Movimiento',
        fecha: moment().toDate(),
        descripcion: `Movimiento AJ-${contador} creado`,
        creadoPor: new ObjectId(req.uid)
      }
    })
    if (tieneContabilidad) {
      console.log('contabilidad')
      const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
      const periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fechaRegistro).toDate() }, fechaFin: { $gte: moment(fechaRegistro).toDate() } } })
      const mesPeriodo = moment(fechaRegistro).format('YYYY/MM')
      let comprobante = await getItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: ajusteInventario.codigoComprobanteAjuste, periodoId: periodo._id, mesPeriodo }
      })
      console.log(1, comprobante)
      if (!comprobante) {
        comprobante = await upsertItemSD({
          nameCollection: 'comprobantes',
          enviromentClienteId: clienteId,
          filters: { codigo: ajusteInventario.codigoComprobanteAjuste, periodoId: periodo._id, mesPeriodo },
          update: {
            $set: {
              nombre: 'Ajuste de inventario',
              isBloqueado: false,
              fechaCreacion: moment().toDate()
            }
          }
        })
        console.log(2, comprobante)
      }
      if (tipoAjuste === 'Almacen') {
        const movimientoAfectado = await getItemSD({
          nameCollection: 'movimientos',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(movimientoId) }
        })
        const categoriaALmacen = await getItemSD({
          nameCollection: 'categoriaPorAlmacen',
          enviromentClienteId: clienteId,
          filters: { categoriaId: producto.categoria, almacenId: almacenAuditoria._id }
        })
        const categoriaALmacenDestino = await getItemSD({
          nameCollection: 'categoriaPorAlmacen',
          enviromentClienteId: clienteId,
          filters: { categoriaId: producto.categoria, almacenId: new ObjectId(almacen._id) }
        })
        const cuentaCategoria = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: categoriaALmacen.cuentaId }
        })
        const cuentaAlmacenDestino = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: categoriaALmacenDestino.cuentaId } })
        /*
        Si es faltante aumentamos destino y disminuimos auditoria y si es sobrante al revez.
        */
        if (tipoAuditoria === 'faltante') {
          const detalleComprobante = [
            {
              cuentaId: cuentaAlmacenDestino._id,
              cuentaCodigo: cuentaAlmacenDestino.codigo,
              cuentaNombre: cuentaAlmacenDestino.descripcion,
              comprobanteId: comprobante._id,
              periodoId: periodo._id,
              descripcion: `Ajuste #${contador} de inventario ${producto.nombre}, movimiento afectado ${tipoMovimientosShort[movimientoAfectado.tipo]}-${movimientoAfectado.numeroMovimiento}`,
              fecha: moment(fechaRegistro).toDate(),
              debe: Number(cantidad) * Number(costoUnitario),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `MOV-AJ-${contador}`,
              documento: {
                docReferencia: `MOV-AJ-${contador}`,
                docFecha: moment(fechaRegistro).toDate()
              }
            },
            {
              cuentaId: cuentaCategoria._id,
              cuentaCodigo: cuentaCategoria.codigo,
              cuentaNombre: cuentaCategoria.descripcion,
              comprobanteId: comprobante._id,
              periodoId: periodo._id,
              descripcion: `Ajuste #${contador} de inventario ${producto.nombre}, movimiento afectado ${tipoMovimientosShort[movimientoAfectado.tipo]}-${movimientoAfectado.numeroMovimiento}`,
              fecha: moment(fechaRegistro).toDate(),
              debe: 0,
              haber: Number(cantidad) * Number(costoUnitario),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `MOV-AJ-${contador}`,
              documento: {
                docReferencia: `MOV-AJ-${contador}`,
                docFecha: moment(fechaRegistro).toDate()
              }
            }
          ]
          console.log('creando contabilidad', detalleComprobante)
          createManyItemsSD({
            nameCollection: 'detallesComprobantes',
            enviromentClienteId: clienteId,
            items: detalleComprobante
          })
        }
        if (tipoAuditoria === 'sobrante') {
          const detalleComprobante = [
            {
              cuentaId: cuentaCategoria._id,
              cuentaCodigo: cuentaCategoria.codigo,
              cuentaNombre: cuentaCategoria.descripcion,
              comprobanteId: comprobante._id,
              periodoId: periodo._id,
              descripcion: `Ajuste #${contador} de inventario ${producto.nombre}, movimiento afectado ${tipoMovimientosShort[movimientoAfectado.tipo]}-${movimientoAfectado.numeroMovimiento}`,
              fecha: moment(fechaRegistro).toDate(),
              debe: Number(cantidad) * Number(costoUnitario),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `MOV-AJ-${contador}`,
              documento: {
                docReferencia: `MOV-AJ-${contador}`,
                docFecha: moment(fechaRegistro).toDate()
              }
            },
            {
              cuentaId: cuentaAlmacenDestino._id,
              cuentaCodigo: cuentaAlmacenDestino.codigo,
              cuentaNombre: cuentaAlmacenDestino.descripcion,
              comprobanteId: comprobante._id,
              periodoId: periodo._id,
              descripcion: `Ajuste #${contador} de inventario ${producto.nombre}, movimiento afectado ${tipoMovimientosShort[movimientoAfectado.tipo]}-${movimientoAfectado.numeroMovimiento}`,
              fecha: moment(fechaRegistro).toDate(),
              debe: 0,
              haber: Number(cantidad) * Number(costoUnitario),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `MOV-AJ-${contador}`,
              documento: {
                docReferencia: `MOV-AJ-${contador}`,
                docFecha: moment(fechaRegistro).toDate()
              }
            }
          ]
          console.log('creando contabilidad', detalleComprobante)
          createManyItemsSD({
            nameCollection: 'detallesComprobantes',
            enviromentClienteId: clienteId,
            items: detalleComprobante
          })
        }
      }
      if (tipoAjuste === 'Faltante') {
        const movimientoAfectado = await getItemSD({
          nameCollection: 'movimientos',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(movimientoId) }
        })
        const categoriaALmacen = await getItemSD({
          nameCollection: 'categoriaPorAlmacen',
          enviromentClienteId: clienteId,
          filters: { categoriaId: producto.categoria, almacenId: almacenAuditoria._id }
        })
        console.log({ producto })
        console.log({ categoriaALmacen })
        const cuentaCategoria = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: categoriaALmacen.cuentaId }
        })
        console.log({ cuentaCategoria })
        const cuentaAjuste = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(ajusteInventario.cuentaPerdidasAjusteInventario) } })
        const detalleComprobante = [
          {
            cuentaId: cuentaAjuste._id,
            cuentaCodigo: cuentaAjuste.codigo,
            cuentaNombre: cuentaAjuste.descripcion,
            comprobanteId: comprobante._id,
            periodoId: periodo._id,
            descripcion: `Ajuste #${contador} de inventario ${producto.nombre}, movimiento afectado ${tipoMovimientosShort[movimientoAfectado.tipo]}-${movimientoAfectado.numeroMovimiento}`,
            fecha: moment(fechaRegistro).toDate(),
            debe: Number(cantidad) * Number(costoUnitario),
            haber: 0,
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `MOV-AJ-${contador}`,
            documento: {
              docReferencia: `MOV-AJ-${contador}`,
              docFecha: moment(fechaRegistro).toDate()
            }
          },
          {
            cuentaId: cuentaCategoria._id,
            cuentaCodigo: cuentaCategoria.codigo,
            cuentaNombre: cuentaCategoria.descripcion,
            comprobanteId: comprobante._id,
            periodoId: periodo._id,
            descripcion: `Ajuste #${contador} de inventario ${producto.nombre}, movimiento afectado ${tipoMovimientosShort[movimientoAfectado.tipo]}-${movimientoAfectado.numeroMovimiento}`,
            fecha: moment(fechaRegistro).toDate(),
            debe: 0,
            haber: Number(cantidad) * Number(costoUnitario),
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `MOV-AJ-${contador}`,
            documento: {
              docReferencia: `MOV-AJ-${contador}`,
              docFecha: moment(fechaRegistro).toDate()
            }
          }
        ]
        console.log('creando contabilidad', detalleComprobante)
        createManyItemsSD({
          nameCollection: 'detallesComprobantes',
          enviromentClienteId: clienteId,
          items: detalleComprobante
        })
      }
      if (tipoAjuste === 'Sobrante') {
        const movimientoAfectado = await getItemSD({
          nameCollection: 'movimientos',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(movimientoId) }
        })
        const categoriaALmacen = await getItemSD({
          nameCollection: 'categoriaPorAlmacen',
          enviromentClienteId: clienteId,
          filters: { categoriaId: producto.categoria, almacenId: almacenAuditoria._id }
        })
        const cuentaCategoria = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: categoriaALmacen.cuentaId }
        })
        const cuentaAjuste = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(ajusteInventario.cuentaUtilidadAjusteInventario) }
        })
        const detalleComprobante = [
          {
            cuentaId: cuentaCategoria._id,
            cuentaCodigo: cuentaCategoria.codigo,
            cuentaNombre: cuentaCategoria.descripcion,
            comprobanteId: comprobante._id,
            periodoId: periodo._id,
            descripcion: `Ajuste #${contador} de inventario ${producto.nombre}, movimiento afectado ${tipoMovimientosShort[movimientoAfectado.tipo]}-${movimientoAfectado.numeroMovimiento}`,
            fecha: moment(fechaRegistro).toDate(),
            haber: 0,
            debe: Number(cantidad) * Number(costoUnitario),
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `MOV-AJ-${contador}`,
            documento: {
              docReferencia: `MOV-AJ-${contador}`,
              docFecha: moment(fechaRegistro).toDate()
            }
          },
          {
            cuentaId: cuentaAjuste._id,
            cuentaCodigo: cuentaAjuste.codigo,
            cuentaNombre: cuentaAjuste.descripcion,
            comprobanteId: comprobante._id,
            periodoId: periodo._id,
            descripcion: `Ajuste #${contador} de inventario ${producto.nombre}, movimiento afectado ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
            fecha: moment(fechaRegistro).toDate(),
            haber: Number(cantidad) * Number(costoUnitario),
            debe: 0,
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `MOV-AJ-${contador}`,
            documento: {
              docReferencia: `MOV-AJ-${contador}`,
              docFecha: moment(fechaRegistro).toDate()
            }
          }
        ]
        console.log('creando contabilidad', detalleComprobante)
        createManyItemsSD({
          nameCollection: 'detallesComprobantes',
          enviromentClienteId: clienteId,
          items: detalleComprobante
        })
      }
    }
    const productoAfectadoAuditoria = await getItemSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      filters: {
        movimientoAfectado: new ObjectId(movimientoId), productoId: new ObjectId(productoId), lote
      }
    })
    upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'ajuste' }, update: { $set: { contador } } })
    return res.status(200).json({ status: 'Movimiento guardado exitosamente', productoAfectadoAuditoria })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de realizar el movimiento de ajuste ' + e.message })
  }
}
export const updateCostoMovimiento = async (req, res) => {
  const { clienteId, productoId, costoAnterior, tipoAjusteCosto, nuevoCosto, movimientoId, productoNombre } = req.body
  const almacenAuditoria = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Auditoria' } })
  const tieneContabilidad = hasContabilidad({ clienteId })
  const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
  const movimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'movimientos' })
  const producto = await getItemSD({ nameCollection: 'productos', enviromentClienteId: clienteId, filters: new ObjectId(productoId) })
  const detalleMovimientoAuditado = await agreggateCollectionsSD({
    nameCollection: 'productosPorAlmacen',
    enviromentClienteId: clienteId,
    pipeline: [
      {
        $match:
        {
          productoId: new ObjectId(productoId),
          almacenId: almacenAuditoria._id,
          $or:
          [
            { movimientoId: new ObjectId(movimientoId) },
            { movimientoAfectado: new ObjectId(movimientoId) }
          ]
        }
      },
      {
        $lookup: {
          from: movimientosCollection,
          localField: 'movimientoId',
          foreignField: '_id',
          as: 'detalleMovimiento'
        }
      },
      { $unwind: { path: '$detalleMovimiento', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          movimientoId: '$movimientoId',
          cantidad: '$cantidad',
          almacenDestinoNombre: '$almacenDestinoNombre',
          tipo: '$tipo',
          costoUnitario: '$costoUnitario',
          creadoPor: '$personas.nombre',
          fechaMovimiento: '$fechaMovimiento',
          afecta: '$afecta',
          movimientoAfectado: '$movimientoAfectado',
          tipoAuditoria: '$tipoAuditoria',
          productoId: '$productoId',
          almacenId: '$almacenId',
          detalleMovimiento: '$detalleMovimiento',
          tipoMovimiento: '$tipoMovimiento',
          almacenDestino: '$almacenDestino'
        }
      }
    ]
  })
  const asientosContables = []
  const bulkWriteProdutoPorAlmacen = []
  const cantidadAlmacenAuditoria = detalleMovimientoAuditado.reduce((acumulado, e) => {
    if (e.tipo === 'movimiento') {
      return acumulado + e.cantidad
    } else {
      return acumulado - e.cantidad
    }
  }, 0)
  console.log(cantidadAlmacenAuditoria)
  let comprobante = null
  let periodo = null
  console.log(detalleMovimientoAuditado)
  if (tieneContabilidad) {
    periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment().toDate() }, fechaFin: { $gte: moment().toDate() } } })
    const mesPeriodo = moment().format('YYYY/MM')
    comprobante = await getItemSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      filters: { codigo: ajusteInventario.codigoComprobanteAjuste, periodoId: periodo._id, mesPeriodo }
    })
    if (!comprobante) {
      comprobante = await upsertItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: ajusteInventario.codigoComprobanteAjuste, periodoId: periodo._id, mesPeriodo },
        update: {
          $set: {
            nombre: 'Ajuste de inventario',
            isBloqueado: false,
            fechaCreacion: moment().toDate()
          }
        }
      })
    }
  }
  let movimientoPrincipal = null
  for (const detalle of detalleMovimientoAuditado) {
    if (detalle.tipo === 'movimiento') {
      movimientoPrincipal = detalle
    }
    if (detalle.tipoAuditoria === 'faltante') {
      if (tipoAjusteCosto === 'perdida') {
        if (detalle.afecta === 'Perdida') {
          if (tieneContabilidad) {
            const cuentaAjuste = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteInventario.cuentaPerdidasAjusteInventario) }
            })
            const costoAnteriorMovimiento = detalle.cantidad * costoAnterior
            const costoNuevoMovimiento = detalle.cantidad * nuevoCosto
            const asientos = [
              {
                cuentaId: cuentaAjuste._id,
                cuentaCodigo: cuentaAjuste.codigo,
                cuentaNombre: cuentaAjuste.descripcion,
                comprobanteId: comprobante._id,
                periodoId: periodo._id,
                descripcion: `
                Ajuste de costo unitario ${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
                fecha: moment().toDate(),
                debe: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
                haber: 0,
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                documento: {
                  docReferencia: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                  docFecha: moment().toDate()
                }
              }
            ]
            asientosContables.push(...asientos)
          }
          bulkWriteProdutoPorAlmacen.push({
            updateOne: {
              filter: { _id: detalle._id },
              update: {
                $set: {
                  costoUnitario: nuevoCosto
                }
              }
            }
          })
        }
        if (detalle.afecta === 'Almacen') {
          if (tieneContabilidad) {
            const cuentaAjuste = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteInventario.cuentaPerdidasAjusteInventario) }
            })
            const categoriaPorAlmacen = await getItemSD({
              nameCollection: 'categoriaPorAlmacen',
              enviromentClienteId: clienteId,
              filters: { categoriaId: producto.categoria, almacenId: detalle.almacenDestino }
            })
            const cuentaCategoria = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(categoriaPorAlmacen.cuentaId) }
            })
            const costoAnteriorMovimiento = detalle.cantidad * costoAnterior
            const costoNuevoMovimiento = detalle.cantidad * nuevoCosto
            const asientos = [
              {
                cuentaId: cuentaAjuste._id,
                cuentaCodigo: cuentaAjuste.codigo,
                cuentaNombre: cuentaAjuste.descripcion,
                comprobanteId: comprobante._id,
                periodoId: periodo._id,
                descripcion: `
                Ajuste de costo unitario ${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
                fecha: moment().toDate(),
                debe: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
                haber: 0,
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                documento: {
                  docReferencia: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                  docFecha: moment().toDate()
                }
              },
              {
                cuentaId: cuentaCategoria._id,
                cuentaCodigo: cuentaCategoria.codigo,
                cuentaNombre: cuentaCategoria.descripcion,
                comprobanteId: comprobante._id,
                periodoId: periodo._id,
                descripcion: `
                Ajuste de costo unitario ${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
                fecha: moment().toDate(),
                debe: 0,
                haber: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                documento: {
                  docReferencia: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                  docFecha: moment().toDate()
                }
              }
            ]
            asientosContables.push(...asientos)
          }
        }
      }
      if (tipoAjusteCosto === 'ganancia') {
        if (detalle.afecta === 'Perdida') {
          if (tieneContabilidad) {
            const cuentaAjuste = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteInventario.cuentaPerdidasAjusteInventario) }
            })
            const costoAnteriorMovimiento = detalle.cantidad * costoAnterior
            const costoNuevoMovimiento = detalle.cantidad * nuevoCosto
            const asientos = [
              {
                cuentaId: cuentaAjuste._id,
                cuentaCodigo: cuentaAjuste.codigo,
                cuentaNombre: cuentaAjuste.descripcion,
                comprobanteId: comprobante._id,
                periodoId: periodo._id,
                descripcion: `
                Ajuste de costo unitario ${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
                fecha: moment().toDate(),
                debe: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
                haber: 0,
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                documento: {
                  docReferencia: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                  docFecha: moment().toDate()
                }
              }
            ]
            asientosContables.push(...asientos)
          }
          bulkWriteProdutoPorAlmacen.push({
            updateOne: {
              filter: { _id: detalle._id },
              update: {
                $set: {
                  costoUnitario: nuevoCosto
                }
              }
            }
          })
        }
        if (detalle.afecta === 'Almacen') {
          if (tieneContabilidad) {
            const cuentaAjuste = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteInventario.cuentaPerdidasAjusteInventario) }
            })
            const categoriaPorAlmacen = await getItemSD({
              nameCollection: 'categoriaPorAlmacen',
              enviromentClienteId: clienteId,
              filters: { categoriaId: producto.categoria, almacenId: detalle.almacenDestino }
            })
            const cuentaCategoria = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(categoriaPorAlmacen.cuentaId) }
            })
            const costoAnteriorMovimiento = detalle.cantidad * costoAnterior
            const costoNuevoMovimiento = detalle.cantidad * nuevoCosto
            const asientos = [
              {
                cuentaId: cuentaAjuste._id,
                cuentaCodigo: cuentaAjuste.codigo,
                cuentaNombre: cuentaAjuste.descripcion,
                comprobanteId: comprobante._id,
                periodoId: periodo._id,
                descripcion: `
                Ajuste de costo unitario ${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
                fecha: moment().toDate(),
                debe: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
                haber: 0,
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                documento: {
                  docReferencia: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                  docFecha: moment().toDate()
                }
              },
              {
                cuentaId: cuentaCategoria._id,
                cuentaCodigo: cuentaCategoria.codigo,
                cuentaNombre: cuentaCategoria.descripcion,
                comprobanteId: comprobante._id,
                periodoId: periodo._id,
                descripcion: `
                Ajuste de costo unitario ${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
                fecha: moment().toDate(),
                debe: 0,
                haber: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                documento: {
                  docReferencia: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                  docFecha: moment().toDate()
                }
              }
            ]
            asientosContables.push(...asientos)
          }
        }
      }
    }
    if (detalle.tipoAuditoria === 'sobrante') {
      if (tipoAjusteCosto === 'perdida') {
        if (detalle.afecta === 'Ganancia') {
          if (tieneContabilidad) {
            const cuentaAjuste = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteInventario.cuentaUtilidadAjusteInventario) }
            })
            const costoAnteriorMovimiento = detalle.cantidad * costoAnterior
            const costoNuevoMovimiento = detalle.cantidad * nuevoCosto
            const asientos = [
              {
                cuentaId: cuentaAjuste._id,
                cuentaCodigo: cuentaAjuste.codigo,
                cuentaNombre: cuentaAjuste.descripcion,
                comprobanteId: comprobante._id,
                periodoId: periodo._id,
                descripcion: `
                Ajuste de costo unitario ${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
                fecha: moment().toDate(),
                debe: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
                haber: 0,
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                documento: {
                  docReferencia: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                  docFecha: moment().toDate()
                }
              }
            ]
            asientosContables.push(...asientos)
          }
          bulkWriteProdutoPorAlmacen.push({
            updateOne: {
              filter: { _id: detalle._id },
              update: {
                $set: {
                  costoUnitario: nuevoCosto
                }
              }
            }
          })
        }
        if (detalle.afecta === 'Almacen') {
          if (tieneContabilidad) {
            const cuentaAjuste = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteInventario.cuentaPerdidasAjusteInventario) }
            })
            const categoriaPorAlmacen = await getItemSD({
              nameCollection: 'categoriaPorAlmacen',
              enviromentClienteId: clienteId,
              filters: { categoriaId: producto.categoria, almacenId: detalle.almacenDestino }
            })
            const cuentaCategoria = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(categoriaPorAlmacen.cuentaId) }
            })
            const costoAnteriorMovimiento = detalle.cantidad * costoAnterior
            const costoNuevoMovimiento = detalle.cantidad * nuevoCosto
            const asientos = [
              {
                cuentaId: cuentaAjuste._id,
                cuentaCodigo: cuentaAjuste.codigo,
                cuentaNombre: cuentaAjuste.descripcion,
                comprobanteId: comprobante._id,
                periodoId: periodo._id,
                descripcion: `
                Ajuste de costo unitario ${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
                fecha: moment().toDate(),
                debe: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
                haber: 0,
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                documento: {
                  docReferencia: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                  docFecha: moment().toDate()
                }
              },
              {
                cuentaId: cuentaCategoria._id,
                cuentaCodigo: cuentaCategoria.codigo,
                cuentaNombre: cuentaCategoria.descripcion,
                comprobanteId: comprobante._id,
                periodoId: periodo._id,
                descripcion: `
                Ajuste de costo unitario ${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
                fecha: moment().toDate(),
                debe: 0,
                haber: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                documento: {
                  docReferencia: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                  docFecha: moment().toDate()
                }
              }
            ]
            asientosContables.push(...asientos)
          }
        }
      }
      if (tipoAjusteCosto === 'ganancia') {
        if (detalle.afecta === 'Ganancia') {
          if (tieneContabilidad) {
            const cuentaAjuste = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteInventario.cuentaUtilidadAjusteInventario) }
            })
            const costoAnteriorMovimiento = detalle.cantidad * costoAnterior
            const costoNuevoMovimiento = detalle.cantidad * nuevoCosto
            const asientos = [
              {
                cuentaId: cuentaAjuste._id,
                cuentaCodigo: cuentaAjuste.codigo,
                cuentaNombre: cuentaAjuste.descripcion,
                comprobanteId: comprobante._id,
                periodoId: periodo._id,
                descripcion: `
                Ajuste de costo unitario ${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
                fecha: moment().toDate(),
                debe: 0,
                haber: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                documento: {
                  docReferencia: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                  docFecha: moment().toDate()
                }
              }
            ]
            asientosContables.push(...asientos)
          }
          bulkWriteProdutoPorAlmacen.push({
            updateOne: {
              filter: { _id: detalle._id },
              update: {
                $set: {
                  costoUnitario: nuevoCosto
                }
              }
            }
          })
        }
        if (detalle.afecta === 'Almacen') {
          if (tieneContabilidad) {
            const cuentaAjuste = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteInventario.cuentaUtilidadAjusteInventario) }
            })
            const categoriaPorAlmacen = await getItemSD({
              nameCollection: 'categoriaPorAlmacen',
              enviromentClienteId: clienteId,
              filters: { categoriaId: producto.categoria, almacenId: detalle.almacenDestino }
            })
            const cuentaCategoria = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(categoriaPorAlmacen.cuentaId) }
            })
            const costoAnteriorMovimiento = detalle.cantidad * costoAnterior
            const costoNuevoMovimiento = detalle.cantidad * nuevoCosto
            const asientos = [
              {
                cuentaId: cuentaAjuste._id,
                cuentaCodigo: cuentaAjuste.codigo,
                cuentaNombre: cuentaAjuste.descripcion,
                comprobanteId: comprobante._id,
                periodoId: periodo._id,
                descripcion: `
                Ajuste de costo unitario ${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
                fecha: moment().toDate(),
                debe: 0,
                haber: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                documento: {
                  docReferencia: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                  docFecha: moment().toDate()
                }
              },
              {
                cuentaId: cuentaCategoria._id,
                cuentaCodigo: cuentaCategoria.codigo,
                cuentaNombre: cuentaCategoria.descripcion,
                comprobanteId: comprobante._id,
                periodoId: periodo._id,
                descripcion: `
                Ajuste de costo unitario ${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
                fecha: moment().toDate(),
                debe: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
                haber: 0,
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                documento: {
                  docReferencia: `AJ-COSTO-${tipoMovimientosShort[detalle.detalleMovimiento.tipo]}-${detalle.detalleMovimiento.numeroMovimiento}`,
                  docFecha: moment().toDate()
                }
              }
            ]
            asientosContables.push(...asientos)
          }
        }
      }
    }
  }
  if (movimientoPrincipal) {
    if (tieneContabilidad) {
      if (movimientoPrincipal.tipoAuditoria === 'faltante') {
        if (tipoAjusteCosto === 'perdida') {
          const categoriaPorAlmacen = await getItemSD({
            nameCollection: 'categoriaPorAlmacen',
            enviromentClienteId: clienteId,
            filters: { categoriaId: producto.categoria, almacenId: almacenAuditoria._id }
          })
          const cuentaCategoria = await getItemSD({
            nameCollection: 'planCuenta',
            enviromentClienteId: clienteId,
            filters: { _id: new ObjectId(categoriaPorAlmacen.cuentaId) }
          })
          const cuentaAjuste = await getItemSD({
            nameCollection: 'planCuenta',
            enviromentClienteId: clienteId,
            filters: { _id: new ObjectId(ajusteInventario.cuentaPerdidasAjusteInventario) }
          })
          const costoAnteriorMovimiento = cantidadAlmacenAuditoria * costoAnterior
          const costoNuevoMovimiento = cantidadAlmacenAuditoria * nuevoCosto
          const asientos = [
            {
              cuentaId: cuentaAjuste._id,
              cuentaCodigo: cuentaAjuste.codigo,
              cuentaNombre: cuentaAjuste.descripcion,
              comprobanteId: comprobante._id,
              periodoId: periodo._id,
              descripcion: `
              Ajuste de costo unitario ${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
              fecha: moment().toDate(),
              debe: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `AJ-COSTO-${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento}`,
                docFecha: moment().toDate()
              }
            },
            {
              cuentaId: cuentaCategoria._id,
              cuentaCodigo: cuentaCategoria.codigo,
              cuentaNombre: cuentaCategoria.descripcion,
              comprobanteId: comprobante._id,
              periodoId: periodo._id,
              descripcion: `
              Ajuste de costo unitario ${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
              fecha: moment().toDate(),
              debe: 0,
              haber: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `AJ-COSTO-${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento}`,
                docFecha: moment().toDate()
              }
            }
          ]
          asientosContables.push(...asientos)
        }
        if (tipoAjusteCosto === 'ganancia') {
          const categoriaPorAlmacen = await getItemSD({
            nameCollection: 'categoriaPorAlmacen',
            enviromentClienteId: clienteId,
            filters: { categoriaId: producto.categoria, almacenId: almacenAuditoria._id }
          })
          const cuentaCategoria = await getItemSD({
            nameCollection: 'planCuenta',
            enviromentClienteId: clienteId,
            filters: { _id: new ObjectId(categoriaPorAlmacen.cuentaId) }
          })
          const cuentaAjuste = await getItemSD({
            nameCollection: 'planCuenta',
            enviromentClienteId: clienteId,
            filters: { _id: new ObjectId(ajusteInventario.cuentaPerdidasAjusteInventario) }
          })
          const costoAnteriorMovimiento = cantidadAlmacenAuditoria * costoAnterior
          const costoNuevoMovimiento = cantidadAlmacenAuditoria * nuevoCosto
          const asientos = [
            {
              cuentaId: cuentaAjuste._id,
              cuentaCodigo: cuentaAjuste.codigo,
              cuentaNombre: cuentaAjuste.descripcion,
              comprobanteId: comprobante._id,
              periodoId: periodo._id,
              descripcion: `
              Ajuste de costo unitario ${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
              fecha: moment().toDate(),
              haber: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
              debe: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `AJ-COSTO-${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento}`,
                docFecha: moment().toDate()
              }
            },
            {
              cuentaId: cuentaCategoria._id,
              cuentaCodigo: cuentaCategoria.codigo,
              cuentaNombre: cuentaCategoria.descripcion,
              comprobanteId: comprobante._id,
              periodoId: periodo._id,
              descripcion: `
              Ajuste de costo unitario ${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
              fecha: moment().toDate(),
              haber: 0,
              debe: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `AJ-COSTO-${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento}`,
                docFecha: moment().toDate()
              }
            }
          ]
          asientosContables.push(...asientos)
        }
      }
      if (movimientoPrincipal.tipoAuditoria === 'sobrante') {
        if (tipoAjusteCosto === 'perdida') {
          const categoriaPorAlmacen = await getItemSD({
            nameCollection: 'categoriaPorAlmacen',
            enviromentClienteId: clienteId,
            filters: { categoriaId: producto.categoria, almacenId: almacenAuditoria._id }
          })
          const cuentaCategoria = await getItemSD({
            nameCollection: 'planCuenta',
            enviromentClienteId: clienteId,
            filters: { _id: new ObjectId(categoriaPorAlmacen.cuentaId) }
          })
          const cuentaAjuste = await getItemSD({
            nameCollection: 'planCuenta',
            enviromentClienteId: clienteId,
            filters: { _id: new ObjectId(ajusteInventario.cuentaPerdidasAjusteInventario) }
          })
          const costoAnteriorMovimiento = cantidadAlmacenAuditoria * costoAnterior
          const costoNuevoMovimiento = cantidadAlmacenAuditoria * nuevoCosto
          const asientos = [
            {
              cuentaId: cuentaAjuste._id,
              cuentaCodigo: cuentaAjuste.codigo,
              cuentaNombre: cuentaAjuste.descripcion,
              comprobanteId: comprobante._id,
              periodoId: periodo._id,
              descripcion: `
              Ajuste de costo unitario ${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
              fecha: moment().toDate(),
              haber: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
              debe: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `AJ-COSTO-${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento}`,
                docFecha: moment().toDate()
              }
            },
            {
              cuentaId: cuentaCategoria._id,
              cuentaCodigo: cuentaCategoria.codigo,
              cuentaNombre: cuentaCategoria.descripcion,
              comprobanteId: comprobante._id,
              periodoId: periodo._id,
              descripcion: `
              Ajuste de costo unitario ${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento} del ${productoNombre}`,
              fecha: moment().toDate(),
              haber: 0,
              debe: Math.abs(costoAnteriorMovimiento - costoNuevoMovimiento),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `AJ-COSTO-${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `AJ-COSTO-${tipoMovimientosShort[movimientoPrincipal.detalleMovimiento.tipo]}-${movimientoPrincipal.detalleMovimiento.numeroMovimiento}`,
                docFecha: moment().toDate()
              }
            }
          ]
          asientosContables.push(...asientos)
        }
      }
    }
  }
}
export const getMovimientosParaDevoluciones = async (req, res) => {
  console.log(req.body)
  try {
    const { clienteId, fechaDesde, fechaHasta, numeroMovimiento, tipoMovimiento, itemsPorPagina, pagina } = req.body
    const fechaInit = moment(fechaDesde).startOf('day').toDate()
    const fechaEnd = moment(fechaHasta).endOf('day').toDate()
    const detalleMovimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleMovimientos' })
    const productosPorAlmacensCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
    const zonaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonas' })
    const almacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const configMatch = {
      // fecha: { $gte: fechaInit, $lte: fechaEnd },
      estado: 'recibido'
    }
    if (numeroMovimiento) {
      configMatch.numeroMovimiento = { $eq: Number(numeroMovimiento) }
    }
    if (fechaDesde) {
      configMatch.fecha = { $gte: fechaInit }
    }
    if (fechaHasta) {
      configMatch.fecha = { $lte: fechaHasta }
    }
    if (fechaDesde && fechaHasta) {
      configMatch.fecha = { $gte: fechaInit, $lte: fechaEnd }
    }
    if (tipoMovimiento) {
      configMatch.tipo = { $eq: tipoMovimiento }
    }
    console.log(configMatch)
    const movimientos = await agreggateCollectionsSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: configMatch },
        { $sort: { fecha: -1 } },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) },
        {
          $lookup: {
            from: detalleMovimientosCollection,
            localField: '_id',
            foreignField: 'movimientoId',
            let: { almacenDestino: '$almacenDestino', zonaDestino: '$zona' },
            pipeline: [
              {
                $lookup: {
                  from: productosPorAlmacensCollection,
                  localField: 'movimientoId',
                  foreignField: 'movimientoId',
                  let: { productoId: '$productoId' },
                  pipeline: [
                    {
                      $match:
                      {
                        tipoMovimiento: 'entrada',
                        $expr: {
                          $and: [
                            { $eq: ['$productoId', '$$productoId'] },
                            {
                              $or: [
                                { $eq: ['$almacenId', '$$almacenDestino'] },
                                { $eq: ['$zonaId', '$$zonaDestino'] }
                              ]
                            }
                          ]
                        }
                      }
                    }
                  ],
                  as: 'detalleProductoPorAlmacen'
                }
              },
              { $unwind: { path: '$detalleProductoPorAlmacen', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  productoPorAlmacenId: '$detalleProductoPorAlmacen._id',
                  lote: '$detalleProductoPorAlmacen.lote',
                  costoUnitario: '$detalleProductoPorAlmacen.costoUnitario',
                  tipoMovimiento: '$detalleProductoPorAlmacen.tipoMovimiento',
                  // cantidadAux: '$detalleProductoPorAlmacen.cantidad',
                  cantidadPorLote: { $subtract: ['$detalleProductoPorAlmacen.cantidad', { $ifNull: ['$detalleProductoPorAlmacen.cantidadDevueltaPorLote', 0] }] },
                  cantidadDevueltaPorLote: '$detalleProductoPorAlmacen.cantidadDevueltaPorLote',
                  fechaVencimientoLote: '$detalleProductoPorAlmacen.fechaVencimiento',
                  fechaIngresoLote: '$detalleProductoPorAlmacen.fechaIngreso',
                  cantidadRecibido: '$cantidadRecibido',
                  cantidad: '$cantidad',
                  codigo: '$codigo',
                  descripcion: '$descripcion',
                  observacion: '$observacion',
                  movimientoId: '$movimientoId',
                  nombre: '$nombre',
                  productoId: '$productoId',
                  unidad: '$unidad'
                }
              },
              { $match: { cantidadPorLote: { $gt: 0 } } }
            ],
            as: 'detalleMovimientos'
          }
        },
        {
          $addFields: {
            detalleMovimientoLenght: { $size: '$detalleMovimientos' }
          }
        },
        { $match: { detalleMovimientoLenght: { $gte: 0 } } },
        {
          $lookup: {
            from: zonaCollection,
            localField: 'zona',
            foreignField: '_id',
            as: 'zona'
          }
        },
        { $unwind: { path: '$zona', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: almacenCollection,
            localField: 'almacenOrigen',
            foreignField: '_id',
            as: 'almacenOrigen'
          }
        },
        { $unwind: { path: '$almacenOrigen', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: almacenCollection,
            localField: 'almacenDestino',
            foreignField: '_id',
            as: 'almacenDestino'
          }
        },
        { $unwind: { path: '$almacenDestino', preserveNullAndEmptyArrays: true } }
      ]
    })
    const countMovimientos = await agreggateCollectionsSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: configMatch },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ movimientos, countMovimientos: countMovimientos.length ? countMovimientos[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de bucar datos de los movimientos ' + e.message })
  }
}
export const createDevolucion = async (req, res) => {
  try {
    const { clienteId, fechaDevolucion, fecha, zonaOrigen, almacenDestino, almacenOrigen, movimientoAfectado, detalleMovimiento } = req.body
    let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'devolucion' } }))?.contador
    // console.log(contador)
    if (contador) ++contador
    if (!contador) contador = 1
    const devolucion = await createItemSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      item: {
        fecha: moment(fecha).toDate(),
        fechaDevolucion: moment(fechaDevolucion).toDate(),
        tipo: 'devolucion',
        almacenOrigen: almacenOrigen ? new ObjectId(almacenOrigen._id) : null,
        almacenDestino: almacenDestino ? new ObjectId(almacenDestino._id) : null,
        zonaOrigen: zonaOrigen ? new ObjectId(zonaOrigen._id) : null,
        estado: 'devolucion',
        numeroMovimiento: contador,
        movimientoDevolucion: new ObjectId(movimientoAfectado),
        creadoPor: new ObjectId(req.uid)
      }
    })
    upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'devolucion' }, update: { $set: { contador } } })
    const detalleNewMovimiento = []
    const cantidadDevueltaProducto = []
    const updateProductoPorAlmacenDevolucion = []
    const newProductoPorAlmacen = []
    const saldoContabilidad = {}
    for (const detalle of detalleMovimiento) {
      if (!saldoContabilidad[detalle.productoId]) saldoContabilidad[detalle.productoId] = 0
      saldoContabilidad[detalle.productoId] += Number(detalle?.cantidadDevolver || 0) * Number(detalle?.costoUnitario || 0)
      const indexDetalle = detalleNewMovimiento.findIndex(e => e.productoId.toString() === detalle.productoId.toString())
      if (indexDetalle !== -1) {
        detalleNewMovimiento[indexDetalle].cantidad += Number(detalle.cantidadDevolver)
      } else {
        detalleNewMovimiento.push({
          movimientoId: devolucion.insertedId,
          productoId: new ObjectId(detalle.productoId),
          codigo: detalle.codigo,
          descripcion: detalle.descripcion,
          nombre: detalle.nombre,
          observacion: detalle.observacion,
          unidad: detalle.unidad,
          cantidad: Number(detalle.cantidadDevolver)
        })
      }
      const indexUpdateCantidadDevoler = cantidadDevueltaProducto.findIndex(e => e._id === detalle._id)
      if (indexUpdateCantidadDevoler !== -1) {
        cantidadDevueltaProducto[indexUpdateCantidadDevoler].cantidadDevolver += Number(detalle.cantidadDevolver)
      } else {
        cantidadDevueltaProducto.push({
          _id: detalle._id,
          cantidadDevolver: Number(detalle.cantidadDevolver)
        })
      }
      const indexCantidadDevueltaPorAlmacen = updateProductoPorAlmacenDevolucion.findIndex(e => e._id === detalle.productoPorAlmacenId)
      if (indexCantidadDevueltaPorAlmacen !== -1) {
        updateProductoPorAlmacenDevolucion[indexCantidadDevueltaPorAlmacen].cantidadDevueltaPorLote += Number(detalle.cantidadDevolver)
      } else {
        updateProductoPorAlmacenDevolucion.push({
          _id: detalle.productoPorAlmacenId,
          cantidadDevueltaPorLote: Number(detalle.cantidadDevolver) + Number(detalle?.cantidadDevueltaPorLote || 0)
        })
      }
      if (almacenOrigen && almacenOrigen._id) {
        newProductoPorAlmacen.push({
          productoId: new ObjectId(detalle.productoId),
          movimientoId: devolucion.insertedId,
          cantidad: Number(detalle.cantidadDevolver),
          almacenId: new ObjectId(almacenDestino._id),
          almacenOrigen: new ObjectId(almacenOrigen._id),
          almacenDestino: new ObjectId(almacenDestino._id),
          tipo: 'devolucion',
          tipoMovimiento: 'entrada',
          lote: detalle.lote,
          fechaVencimiento: moment(detalle.fechaVencimientoLote).toDate(),
          fechaIngreso: moment(detalle.fechaIngresoLote).toDate(),
          fechaMovimiento: moment(fecha).toDate(),
          costoUnitario: detalle.costoUnitario,
          creadoPor: new ObjectId(req.uid)
        }, {
          productoId: new ObjectId(detalle.productoId),
          movimientoId: devolucion.insertedId,
          cantidad: Number(detalle.cantidadDevolver),
          almacenId: new ObjectId(almacenOrigen._id),
          almacenOrigen: new ObjectId(almacenOrigen._id),
          almacenDestino: new ObjectId(almacenDestino._id),
          tipo: 'devolucion',
          tipoMovimiento: 'salida',
          lote: detalle.lote,
          fechaVencimiento: moment(detalle.fechaVencimientoLote).toDate(),
          fechaIngreso: moment(detalle.fechaIngresoLote).toDate(),
          fechaMovimiento: moment(fecha).toDate(),
          costoUnitario: detalle.costoUnitario,
          creadoPor: new ObjectId(req.uid)
        })
      }
      if (zonaOrigen && zonaOrigen._id) {
        newProductoPorAlmacen.push({
          productoId: new ObjectId(detalle.productoId),
          movimientoId: devolucion.insertedId,
          cantidad: Number(detalle.cantidadDevolver),
          almacenId: new ObjectId(almacenDestino._id),
          zonaOrigen: new ObjectId(zonaOrigen._id),
          almacenDestino: new ObjectId(almacenDestino._id),
          tipo: 'devolucion',
          tipoMovimiento: 'entrada',
          lote: detalle.lote,
          fechaVencimiento: moment(detalle.fechaVencimientoLote).toDate(),
          fechaIngreso: moment(detalle.fechaIngresoLote).toDate(),
          fechaMovimiento: moment(fecha).toDate(),
          costoUnitario: detalle.costoUnitario,
          creadoPor: new ObjectId(req.uid)
        }, {
          productoId: new ObjectId(detalle.productoId),
          movimientoId: devolucion.insertedId,
          cantidad: Number(detalle.cantidadDevolver),
          zonaId: new ObjectId(zonaOrigen._id),
          zonaOrigen: new ObjectId(zonaOrigen._id),
          almacenDestino: new ObjectId(almacenDestino._id),
          tipo: 'devolucion',
          tipoMovimiento: 'salida',
          lote: detalle.lote,
          fechaVencimiento: moment(detalle.fechaVencimientoLote).toDate(),
          fechaIngreso: moment(detalle.fechaIngresoLote).toDate(),
          fechaMovimiento: moment(fecha).toDate(),
          costoUnitario: detalle.costoUnitario,
          creadoPor: new ObjectId(req.uid)
        })
      }
    }
    // console.log({ cantidadDevueltaProducto, detalleNewMovimiento, updateProductoPorAlmacenDevolucion, newProductoPorAlmacen, saldoContabilidad })
    const tieneContabilidad = await hasContabilidad({ clienteId })
    if (tieneContabilidad) {
      const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
      const periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fechaDevolucion).toDate() }, fechaFin: { $gte: moment(fechaDevolucion).toDate() } } })
      // console.log({ periodo })
      if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha de envio o de recepción')
      const mesPeriodo = moment(fechaDevolucion).format('YYYY/MM')
      let comprobante = await getItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: ajusteInventario.codigoComprobanteMovimientos, periodoId: periodo._id, mesPeriodo }
      })
      if (!comprobante) {
        comprobante = await upsertItemSD({
          nameCollection: 'comprobantes',
          enviromentClienteId: clienteId,
          filters: { codigo: ajusteInventario.codigoComprobanteMovimientos, periodoId: periodo._id, mesPeriodo },
          update: {
            $set: {
              nombre: 'Movimientos de inventario',
              isBloqueado: false,
              fechaCreacion: moment().toDate()
            }
          }
        })
      }
      const categoriaPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorAlmacen' })
      const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
      const productList = await agreggateCollectionsSD({
        nameCollection: 'productos',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { _id: { $in: detalleNewMovimiento.map(e => new ObjectId(e.productoId)) } } },
          {
            $lookup: {
              from: categoriaPorAlmacenCollection,
              localField: 'categoria',
              foreignField: 'categoriaId',
              pipeline: [
                { $match: { almacenId: new ObjectId(almacenOrigen._id) } },
                { $project: { cuentaId: '$cuentaId' } }
              ],
              as: 'almacenOrigen'
            }
          },
          { $unwind: { path: '$almacenOrigen', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: categoriaPorAlmacenCollection,
              localField: 'categoria',
              foreignField: 'categoriaId',
              pipeline: [
                { $match: { almacenId: new ObjectId(almacenDestino._id) } },
                { $project: { cuentaId: '$cuentaId' } }
              ],
              as: 'almacenDestino'
            }
          },
          { $unwind: { path: '$almacenDestino', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: planCuentaCollection,
              localField: 'almacenOrigen.cuentaId',
              foreignField: '_id',
              as: 'cuentaAlmacenOrigen'
            }
          },
          { $unwind: { path: '$cuentaAlmacenOrigen', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: planCuentaCollection,
              localField: 'almacenDestino.cuentaId',
              foreignField: '_id',
              as: 'cuentaAlmacenDestino'
            }
          },
          { $unwind: { path: '$cuentaAlmacenDestino', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              nombre: '$nombre',
              codigo: '$codigo',
              cuentaAlmacenOrigenId: '$cuentaAlmacenOrigen._id',
              cuentaAlmacenOrigenCodigo: '$cuentaAlmacenOrigen.codigo',
              cuentaAlmacenOrigenNombre: '$cuentaAlmacenOrigen.descripcion',
              cuentaAlmacenODestinoId: '$cuentaAlmacenDestino._id',
              cuentaAlmacenDestinoCodigo: '$cuentaAlmacenDestino.codigo',
              cuentaAlmacenDestinoNombre: '$cuentaAlmacenDestino.descripcion'
            }
          }
        ]
      })
      const cuentaZona = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(zonaOrigen?.cuentaId) } })
      const asientosContables = []
      for (const producto of productList) {
        asientosContables.push({
          cuentaId: producto.cuentaAlmacenODestinoId,
          cuentaCodigo: producto.cuentaAlmacenDestinoCodigo,
          cuentaNombre: producto.cuentaAlmacenDestinoNombre,
          comprobanteId: new ObjectId(comprobante._id),
          periodoId: new ObjectId(periodo._id),
          descripcion: `MOV ${tipoMovimientosShort.devolucion}-${contador} DESDE ${almacenOrigen?.nombre ? almacenOrigen?.nombre : zonaOrigen?.nombre} HASTA ${almacenDestino.nombre}`,
          fecha: moment(fechaDevolucion).toDate(),
          debe: saldoContabilidad[producto._id.toString()],
          haber: 0,
          fechaCreacion: moment().toDate(),
          docReferenciaAux: `MOV-${tipoMovimientosShort.devolucion}-${contador}`,
          documento: {
            docReferencia: `MOV-${tipoMovimientosShort.devolucion}-${contador}`,
            docFecha: moment(fechaDevolucion).toDate()
          }
        }, {
          cuentaId: cuentaZona ? cuentaZona._id : producto.cuentaAlmacenOrigenId,
          cuentaCodigo: cuentaZona ? cuentaZona.codigo : producto.cuentaAlmacenOrigenCodigo,
          cuentaNombre: cuentaZona ? cuentaZona.descripcion : producto.cuentaAlmacenOrigenNombre,
          comprobanteId: new ObjectId(comprobante._id),
          periodoId: new ObjectId(periodo._id),
          descripcion: `MOV ${tipoMovimientosShort.devolucion}-${contador} DESDE ${almacenOrigen?.nombre ? almacenOrigen?.nombre : zonaOrigen?.nombre} HASTA ${almacenDestino.nombre}`,
          fecha: moment(fechaDevolucion).toDate(),
          debe: 0,
          haber: saldoContabilidad[producto._id.toString()],
          fechaCreacion: moment().toDate(),
          docReferenciaAux: `MOV-${tipoMovimientosShort.devolucion}-${contador}`,
          documento: {
            docReferencia: `MOV-${tipoMovimientosShort.devolucion}-${contador}`,
            docFecha: moment(fechaDevolucion).toDate()
          }
        })
      }
      createManyItemsSD({
        nameCollection: 'detallesComprobantes',
        enviromentClienteId: clienteId,
        items: asientosContables
      })
      // console.log({ saldoContabilidad, asientosContables })
    }
    bulkWriteSD({
      nameCollection: 'detalleMovimientos',
      enviromentClienteId: clienteId,
      pipeline: cantidadDevueltaProducto.map(e => ({ updateOne: { filter: { _id: new ObjectId(e._id) }, update: { $set: { cantidadDevuelto: e.cantidadDevolver } } } }))
    })
    createManyItemsSD({
      nameCollection: 'detalleMovimientos',
      enviromentClienteId: clienteId,
      items: detalleNewMovimiento
    })
    createManyItemsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      items: newProductoPorAlmacen
    })
    bulkWriteSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: updateProductoPorAlmacenDevolucion.map(e => ({ updateOne: { filter: { _id: new ObjectId(e._id) }, update: { $set: { cantidadDevueltaPorLote: e.cantidadDevueltaPorLote } } } }))
    })
    createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        idMovimiento: devolucion.insertedId,
        categoria: 'creado',
        tipo: 'Movimiento',
        fecha: moment().toDate(),
        descripcion: `Movimiento ${tipoMovimientosShort.devolucion}-${contador} creado`,
        creadoPor: new ObjectId(req.uid)
      }
    })
    createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        idMovimiento: new ObjectId(movimientoAfectado),
        categoria: 'editado',
        tipo: 'Movimiento',
        fecha: moment().toDate(),
        descripcion: `Devolucion ${tipoMovimientosShort.devolucion}-${contador} efectuada.`,
        creadoPor: new ObjectId(req.uid)
      }
    })
    return res.status(200).json({ message: 'Devolucion creada correctamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de bucar datos de los movimientos ' + e.message })
  }
}
export const getDevoluciones = async (req, res) => {
  const { clienteId } = req.body
  try {
    const detalleMovimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleMovimientos' })
    const zonaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonas' })
    const almacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const movimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'movimientos' })
    const movimientos = await agreggateCollectionsSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado: 'devolucion' } },
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
            from: zonaCollection,
            localField: 'zonaOrigen',
            foreignField: '_id',
            as: 'zonaOrigen'
          }
        },
        { $unwind: { path: '$zonaOrigen', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: almacenCollection,
            localField: 'almacenOrigen',
            foreignField: '_id',
            as: 'almacenOrigen'
          }
        },
        { $unwind: { path: '$almacenOrigen', preserveNullAndEmptyArrays: true } },
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
          $lookup: {
            from: movimientosCollection,
            localField: 'movimientoDevolucion',
            foreignField: '_id',
            as: 'movimientoAfectado'
          }
        },
        { $unwind: { path: '$movimientoAfectado', preserveNullAndEmptyArrays: true } }
      ]
    })
    return res.status(200).json({ movimientos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de bucar datos de los movimientos ' + e.message })
  }
}
