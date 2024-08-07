import moment from 'moment'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, createManyItemsSD, formatCollectionName, getItemSD, updateItemSD, updateManyItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'
import { subDominioName, tipoMovimientosShort } from '../../constants.js'
import { hasContabilidad, validMovimientoAuditoria, validMovimientoPenditeEnvio, validMovimientoPenditeRecepcion, validProductosRecepcionCompras } from '../../utils/hasContabilidad.js'
import { deleteImg, uploadImg } from '../../utils/cloudImage.js'
export const getDataMovimientos = async (req, res) => {
  const { clienteId, estado } = req.body
  try {
    const detalleMovimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleMovimientos' })
    const zonaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonas' })
    const almacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const matchEstados = estado === 'recibido' ? { estado } : { estado, tipo: { $ne: 'solicitudCompra ' } }
    console.log(estado, matchEstados)
    const movimientos = await agreggateCollectionsSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { ...matchEstados } },
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
        numeroMovimiento: contador,
        creadoPor: new ObjectId(req.uid)
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
  const { clienteId, movimientoId, observacion, fechaCancelado } = req.body
  try {
    const movimiento = await updateItemSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(movimientoId) },
      update: { $set: { estado: 'Cancelado', observacion, fechaCancelado: moment(fechaCancelado).toDate() } }
    })
    // deleteManyItemsSD({ nameCollection: 'productosPorAlmacen', enviromentClienteId: clienteId, filters: { movimientoId: new ObjectId(movimientoId) } })
    const almacenAuditoria = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Auditoria' } })
    const almacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const productosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productos' })
    const categoriaPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorAlmacen' })
    const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
    const productosPorAlmacen = await agreggateCollectionsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { movimientoId: new ObjectId(movimientoId) } },
        {
          $lookup: {
            from: almacenCollection,
            localField: 'almacenId',
            foreignField: '_id',
            as: 'almacen'
          }
        },
        { $unwind: { path: '$almacen', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: productosCollection,
            localField: 'productoId',
            foreignField: '_id',
            as: 'producto'
          }
        },
        { $unwind: { path: '$producto', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: categoriaPorAlmacenCollection,
            localField: 'producto.categoria',
            foreignField: 'categoriaId',
            let: { almacenId: '$almacen._id' },
            pipeline: [
              { $match: { $expr: { $eq: ['$almacenId', '$$almacenId'] } } },
              { $project: { cuentaId: 1 } }
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
        { $unwind: { path: '$cuentaTransito', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: categoriaPorAlmacenCollection,
            localField: 'producto.categoria',
            foreignField: 'categoriaId',
            pipeline: [
              { $match: { almacenId: { $eq: almacenAuditoria._id } } },
              { $project: { cuentaId: 1 } }
            ],
            as: 'categoriaAlmacenAuditoria'
          }
        },
        { $unwind: { path: '$categoriaAlmacenAuditoria', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: planCuentaCollection,
            localField: 'categoriaAlmacenAuditoria.cuentaId',
            foreignField: '_id',
            as: 'cuentaAuditoria'
          }
        },
        { $unwind: { path: '$cuentaAuditoria', preserveNullAndEmptyArrays: true } }
      ]
    })
    console.log(productosPorAlmacen)
    const movimientoProdutoAlmacen = []
    const asientosContables = []
    const tieneContabilidad = await hasContabilidad({ clienteId })
    let periodo = null
    let comprobante = null
    if (productosPorAlmacen) {
      if (tieneContabilidad) {
        const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
        periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fechaCancelado).toDate() }, fechaFin: { $gte: moment(fechaCancelado).toDate() } } })
        console.log({ periodo })
        if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha de envio o de recepción')
        const mesPeriodo = moment(fechaCancelado).format('YYYY/MM')
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
      for (const producto of productosPorAlmacen) {
        movimientoProdutoAlmacen.push({
          productoId: new ObjectId(producto.productoId),
          movimientoId: new ObjectId(producto.movimientoId),
          cantidad: Number(producto.cantidad),
          almacenId: almacenAuditoria._id,
          almacenOrigen: new ObjectId(producto.almacen._id),
          almacenDestino: almacenAuditoria._id,
          tipo: 'movimiento',
          tipoMovimiento: 'entrada',
          lote: producto.lote,
          fechaVencimiento: moment(producto.fechaVencimiento).toDate(),
          fechaIngreso: moment(producto.fechaIngreso).toDate(),
          tipoAuditoria: 'faltante',
          fechaMovimiento: moment().toDate(),
          costoUnitario: producto.costoUnitario,
          costoPromedio: producto.costoPromedio,
          creadoPor: new ObjectId(req.uid)
        }, {
          productoId: new ObjectId(producto.productoId),
          movimientoId: new ObjectId(producto.movimientoId),
          cantidad: Number(producto.cantidad),
          almacenId: new ObjectId(producto.almacen._id),
          almacenOrigen: new ObjectId(producto.almacen._id),
          almacenDestino: almacenAuditoria._id,
          tipo: 'movimiento',
          tipoMovimiento: 'salida',
          lote: producto.lote,
          fechaVencimiento: moment(producto.fechaVencimiento).toDate(),
          fechaIngreso: moment(producto.fechaIngreso).toDate(),
          // tipoAuditoria: 'faltante',
          fechaMovimiento: moment().toDate(),
          costoUnitario: producto.costoUnitario,
          costoPromedio: producto.costoPromedio,
          creadoPor: new ObjectId(req.uid)
        })
        if (tieneContabilidad) {
          asientosContables.push({
            cuentaId: new ObjectId(producto.cuentaAuditoria._id),
            cuentaCodigo: producto.cuentaAuditoria.codigo,
            cuentaNombre: producto.cuentaAuditoria.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} CANCELADO`,
            fecha: moment(fechaCancelado).toDate(),
            debe: Number(producto.cantidad) * Number(producto.costoPromedio),
            haber: 0,
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
            documento: {
              docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              docFecha: moment(fechaCancelado).toDate()
            }
          }, {
            cuentaId: new ObjectId(producto.cuentaTransito._id),
            cuentaCodigo: producto.cuentaTransito.codigo,
            cuentaNombre: producto.cuentaTransito.descripcion,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} CANCELADO`,
            fecha: moment(fechaCancelado).toDate(),
            debe: 0,
            haber: Number(producto.cantidad) * Number(producto.costoPromedio),
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
            documento: {
              docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              docFecha: moment(fechaCancelado).toDate()
            }
          })
        }
      }
    }
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
    if (movimientoProdutoAlmacen[0]) {
      createManyItemsSD({
        nameCollection: 'productosPorAlmacen',
        enviromentClienteId: clienteId,
        items: movimientoProdutoAlmacen
      })
    }
    if (tieneContabilidad && asientosContables[0]) {
      createManyItemsSD({
        nameCollection: 'detallesComprobantes',
        enviromentClienteId: clienteId,
        items: asientosContables
      })
    }
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
              fechaIngreso: '$fechaIngreso',
              costoPromedio: '$costoPromedio'
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
            costoPromedio: '$_id.costoPromedio',
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
        costoProductoTotal += movimientos.costoPromedio * Number(movimientos.cantidad)
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
          costoPromedio: movimientos.costoPromedio,
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
          costoPromedio: movimientos.costoPromedio,
          creadoPor: new ObjectId(uid)
        })
        detalle.cantidad -= movimientos.cantidad
        continue
      }
      if (detalle.cantidad < movimientos.cantidad) {
        costoProductoTotal += movimientos.costoPromedio * detalle.cantidad
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
          costoPromedio: movimientos.costoPromedio,
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
          costoPromedio: movimientos.costoPromedio,
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
    let ultimoCostoPromedio = 0
    let ultimoLote = ''
    let ultimaFechaVencimiento = ''
    let UltimaFechaIngreso = ''
    for (const movimientos of detallesMovimientosPorProducto) {
      ultimoCosto = movimientos.costoUnitario
      ultimoCostoPromedio = movimientos.costoPromedio
      ultimaFechaVencimiento = movimientos.fechaVencimiento
      UltimaFechaIngreso = movimientos.fechaIngreso
      ultimoLote = movimientos.lote
      console.log({ 2: movimientos.fechaIngreso })
      if (detalle.cantidadRecibido === 0 && movimientos.cantidad) {
        costoAlmacenAuditoria += movimientos.costoPromedio * Number(movimientos.cantidad)
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
          costoPromedio: movimientos.costoPromedio,
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
          costoPromedio: movimientos.costoPromedio,
          creadoPor: new ObjectId(uid)
        })
        continue
      }
      if (detalle.cantidadRecibido === 0) break
      if (detalle.cantidadRecibido >= movimientos.cantidad) {
        costoProductosPorAlmacen += movimientos.costoPromedio * movimientos.cantidad
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
            costoPromedio: movimientos.costoPromedio,
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
            costoPromedio: movimientos.costoPromedio,
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
          costoPromedio: movimientos.costoPromedio,
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
            costoPromedio: movimientos.costoPromedio,
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
            costoPromedio: movimientos.costoPromedio,
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
          costoPromedio: movimientos.costoPromedio,
          creadoPor: new ObjectId(uid)
        })
        const sumaRecibida = Number(detalle.cantidadRecibido) * movimientos.costoPromedio
        costoProductosPorAlmacen += sumaRecibida
        const faltante = Number(movimientos.cantidad) - Number(detalle.cantidadRecibido)
        if (faltante > 0) {
          costoAlmacenAuditoria += movimientos.costoPromedio * Number(faltante)
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
            costoPromedio: movimientos.costoPromedio,
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
            costoPromedio: movimientos.costoPromedio,
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
        costoPromedio: ultimoCostoPromedio,
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
          costoPromedio: ultimoCostoPromedio,
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
          costoPromedio: ultimoCostoPromedio,
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
          haber: ultimoCostoPromedio * detalle.cantidadRecibido,
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
  // console.log({ asientosContables })
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
  const { clienteId, cantidad, tipoAjuste, almacen, fechaRegistro, movimientoId, productoId, costoUnitario, costoPromedio, tipoAuditoria, lote, fechaVencimiento, fechaIngreso } = req.body
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
            costoPromedio: Number(costoPromedio),
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
            costoPromedio: Number(costoPromedio),
            // movimientoAfectado: new ObjectId(movimientoId),
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
            costoPromedio: Number(costoPromedio),
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
            costoPromedio: Number(costoPromedio),
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
            costoPromedio: Number(costoPromedio),
            creadoPor: new ObjectId(req.uid)
          }
        ]
        createManyItemsSD({
          nameCollection: 'productosPorAlmacen',
          enviromentClienteId: clienteId,
          items: detallesCrear
        })
        /* if (almacen) {
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
            costoPromedio: Number(costoPromedio),
            creadoPor: new ObjectId(req.uid)
          })
        } */
        console.log({ detallesCrear })
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
            costoPromedio: Number(costoPromedio),
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
              debe: Number(cantidad) * Number(costoPromedio),
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
              haber: Number(cantidad) * Number(costoPromedio),
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
              debe: Number(cantidad) * Number(costoPromedio),
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
              haber: Number(cantidad) * Number(costoPromedio),
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
            debe: Number(cantidad) * Number(costoPromedio),
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
            haber: Number(cantidad) * Number(costoPromedio),
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
            debe: Number(cantidad) * Number(costoPromedio),
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
            haber: Number(cantidad) * Number(costoPromedio),
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
                  costoPromedio: '$detalleProductoPorAlmacen.costoPromedio',
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
      saldoContabilidad[detalle.productoId] += Number(detalle?.cantidadDevolver || 0) * Number(detalle?.costoPromedio || 0)
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
          costoPromedio: detalle.costoPromedio,
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
          costoPromedio: detalle.costoPromedio,
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
          costoPromedio: detalle.costoPromedio,
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
          costoPromedio: detalle.costoPromedio,
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
export const getComprasForRecepcion = async (req, res) => {
  const { clienteId, pagina, itemsPorPagina } = req.body
  try {
    console.log(itemsPorPagina)
    const pagination = []
    if (itemsPorPagina > 0 && pagina) {
      pagination.push(
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) }
      )
    }
    const detalleMovimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleMovimientos' })
    const almacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const comprasPendienteRecepcion = await agreggateCollectionsSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo: 'recepcion' } },
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
        ...pagination
        /* { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) } */
      ]
    })
    const count = await agreggateCollectionsSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo: 'recepcion' } },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ comprasPendienteRecepcion, count: count && count[0] ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las compras pendientes por recibir ' + e.message })
  }
}
export const getDataCompraRecepcion = async (req, res) => {
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
            pipeline: [
              { $match: { tipo: 'producto' } },
              {
                $addFields: {
                  cantValid: { $subtract: ['$cantidad', '$recibido'] }
                }
              },
              { $match: { cantValid: { $ne: 0 } } }
            ],
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
export const recepcionInventarioCompra = async (req, res) => {
  const { clienteId, _id: movimientoId, detalleMovimientos, almacenDestino, fechaActual, facturasAsociadas } = req.body
  console.log({ movimientoId, detalleMovimientos })
  try {
    if (detalleMovimientos[0]) {
      const tieneContabilidad = await hasContabilidad({ clienteId })
      const detalleUpdate = []
      const productoPorAlmacen = []
      const productosUpdate = []
      const updateAllCostoPromedioPoducto = []
      const almacenDevoluciones = await getItemSD({
        nameCollection: 'almacenes',
        enviromentClienteId: clienteId,
        filters: { nombre: 'Devoluciones' }
      })
      let totalPorPagarProveedor = 0
      const asientosContable = []
      const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
      let periodo = null
      let comprobante = null
      if (tieneContabilidad) {
        const validContabilidad = await validProductosRecepcionCompras({ clienteId, movimientoId, detalleMovimientos, almacenDestino })
        if (validContabilidad && validContabilidad.message) {
          return res.status(500).json({ error: 'Error al momento de validar información contable: ' + validContabilidad.message })
        }
        periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fechaActual).toDate() }, fechaFin: { $gte: moment(fechaActual).toDate() } } })
        // console.log({ periodo })
        if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha de envio o de recepción')
        const mesPeriodo = moment(fechaActual).format('YYYY/MM')
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
      const productosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productos' })
      const categoriaPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorAlmacen' })
      const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
      const movimiento = await getItemSD({ nameCollection: 'movimientos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(movimientoId) } })
      for (const detalle of detalleMovimientos) {
        let totalDevolucionesProducto = 0
        if (detalle?.cantidaLotes) {
          const inventarioAnterior = await agreggateCollectionsSD({
            nameCollection: 'productosPorAlmacen',
            enviromentClienteId: clienteId,
            pipeline: [
              {
                $match:
                {
                  productoId: new ObjectId(detalle.productoId),
                  $or: [
                    { $and: [{ movimientoId: { $ne: new ObjectId(movimientoId) } }] }
                  ]
                }
              },
              {
                $group: {
                  _id: {
                    // costoUnitario: '$costoUnitario',
                    productoId: '$productoId',
                    // almacenId: '$almacenId',
                    costoPromedio: '$costoPromedio'
                  },
                  // lote: { $first: '$lote' },
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
                $lookup: {
                  from: productosCollection,
                  localField: '_id.productoId',
                  foreignField: '_id',
                  as: 'detalleProducto'
                }
              },
              { $unwind: { path: '$detalleProducto', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  _id: 0,
                  producto: '$detalleProducto.nombre',
                  costoPromedio: '$_id.costoPromedio',
                  productoId: '$_id.productoId',
                  // almacenId: '$_id.almacenId',
                  cantidad: { $subtract: ['$entrada', '$salida'] } // cantidad de producto en el almacen de origen
                  // almacenNombre: '$detalleAlmacen.nombre'
                }
              },
              { $match: { cantidad: { $gt: 0 } } }
            ]
          })
          console.log({ inventarioAnterior })
          /** Calculando costo promedio */
          const costoPromedioTotalAnterior = (inventarioAnterior[0]?.costoPromedio || 0) * (inventarioAnterior[0]?.cantidad || 0)
          // const costoPromedioTotalActualizado = ((detalle?.recibe || 0) * (detalle?.costoUnitario || 0)) + costoPromedioTotalAnterior
          let costoPromedio = inventarioAnterior[0]?.costoPromedio || 0 // costoPromedioTotalActualizado / (Number(detalle?.recibe || 0) + Number(inventarioAnterior[0]?.cantidad || 0))
          let diferencia = Number(detalle?.cantidad || 0) - Number(detalle?.recibido || 0)
          if (diferencia >= Number(detalle?.recibe)) {
            const costoPromedioTotalActualizado = (Number(detalle?.recibe) * (detalle?.costoUnitario || 0)) + costoPromedioTotalAnterior
            costoPromedio = costoPromedioTotalActualizado / (Number(detalle?.recibe) + Number(inventarioAnterior[0]?.cantidad || 0))
            // console.log({ costoPromedioTotalActualizado })
          } else if (diferencia > 0 && diferencia < Number(detalle?.recibe)) {
            const costoPromedioTotalActualizado = (diferencia * (detalle?.costoUnitario || 0)) + costoPromedioTotalAnterior
            costoPromedio = costoPromedioTotalActualizado / (diferencia + Number(inventarioAnterior[0]?.cantidad || 0))
            // console.log({ costoPromedioTotalActualizado })
          }
          // console.log({ costoPromedioTotalAnterior, costoPromedio })
          /** */
          // console.log({ diferencia })
          for (const lote of detalle.cantidaLotes) {
            const verifyLote = await getItemSD({
              nameCollection: 'productosPorAlmacen',
              enviromentClienteId: clienteId,
              filters: { productoId: new ObjectId(detalle.productoId), lote: lote.lote }
            })
            if (verifyLote) return res.status(400).json({ error: 'Ya se encuentra un lote con el mismo codigo guardado en este producto' })
            if (diferencia > 0 && diferencia >= Number(lote.cantidad)) {
              totalPorPagarProveedor += (lote.cantidad * detalle.costoUnitario)
              diferencia -= Number(lote.cantidad)
              console.log({ lote, diferencia })
              productoPorAlmacen.push({
                productoId: new ObjectId(detalle.productoId),
                movimientoId: new ObjectId(detalle.movimientoId),
                cantidad: Number(lote.cantidad),
                almacenId: new ObjectId(almacenDestino._id),
                almacenOrigen: null, // new ObjectId(almacenTransito._id),
                almacenDestino: new ObjectId(almacenDestino._id),
                tipo: 'movimiento',
                tipoMovimiento: 'entrada',
                lote: lote.lote,
                fechaVencimiento: moment(lote.fechaVencimiento).toDate(),
                fechaIngreso: moment(fechaActual).toDate(),
                fechaMovimiento: moment().toDate(),
                costoUnitario: detalle.costoUnitario,
                costoPromedio: Number(costoPromedio.toFixed(2)),
                creadoPor: new ObjectId(req.uid)
              }
              /* {
                productoId: new ObjectId(detalle.productoId),
                movimientoId: new ObjectId(detalle.movimientoId),
                cantidad: Number(lote.cantidad),
                almacenId: new ObjectId(almacenTransito._id),
                almacenOrigen: new ObjectId(almacenTransito._id),
                almacenDestino: new ObjectId(almacenDestino._id),
                tipo: 'movimiento',
                tipoMovimiento: 'salida',
                lote: null, // lote.lote,
                fechaVencimiento: moment(lote.fechaVencimiento).toDate(),
                fechaIngreso: moment(fechaActual).toDate(),
                fechaMovimiento: moment().toDate(),
                costoUnitario: detalle.costoUnitario,
                costoPromedio: detalle.costoUnitario,
                creadoPor: new ObjectId(req.uid)
              } */)
            } else if (diferencia > 0 && diferencia < Number(lote.cantidad)) {
              const diferenciaLote = Number(lote.cantidad) - diferencia
              console.log({ diferenciaLote })
              totalPorPagarProveedor += ((lote.cantidad - diferenciaLote) * detalle.costoUnitario)
              productoPorAlmacen.push({
                productoId: new ObjectId(detalle.productoId),
                movimientoId: new ObjectId(detalle.movimientoId),
                cantidad: Number(lote.cantidad), // Number(diferencia),
                almacenId: new ObjectId(almacenDestino._id),
                almacenOrigen: null, // new ObjectId(almacenTransito._id),
                almacenDestino: new ObjectId(almacenDestino._id),
                tipo: 'movimiento',
                tipoMovimiento: 'entrada',
                lote: lote.lote,
                fechaVencimiento: moment(lote.fechaVencimiento).toDate(),
                fechaIngreso: moment(fechaActual).toDate(),
                fechaMovimiento: moment().toDate(),
                costoUnitario: detalle.costoUnitario,
                costoPromedio: Number(costoPromedio.toFixed(2)),
                creadoPor: new ObjectId(req.uid)
              }
              /* {
                productoId: new ObjectId(detalle.productoId),
                movimientoId: new ObjectId(detalle.movimientoId),
                cantidad: Number(diferencia),
                almacenId: new ObjectId(almacenTransito._id),
                almacenOrigen: new ObjectId(almacenTransito._id),
                almacenDestino: new ObjectId(almacenDestino._id),
                tipo: 'movimiento',
                tipoMovimiento: 'salida',
                lote: null, // lote.lote,
                fechaVencimiento: moment(lote.fechaVencimiento).toDate(),
                fechaIngreso: moment(fechaActual).toDate(),
                fechaMovimiento: moment().toDate(),
                costoUnitario: detalle.costoUnitario,
                costoPromedio: detalle.costoUnitario,
                creadoPor: new ObjectId(req.uid)
              } */)
              if (diferenciaLote > 0) {
                totalDevolucionesProducto += (diferenciaLote * detalle.costoUnitario)
                productoPorAlmacen.push({
                  productoId: new ObjectId(detalle.productoId),
                  movimientoId: new ObjectId(detalle.movimientoId),
                  cantidad: Number(diferenciaLote),
                  almacenId: new ObjectId(almacenDevoluciones._id),
                  almacenOrigen: null, // new ObjectId(almacenTransito._id),
                  almacenDestino: new ObjectId(almacenDevoluciones._id),
                  tipo: 'movimiento',
                  tipoMovimiento: 'entrada',
                  tipoAuditoria: 'sobrante',
                  tipoDevolucion: 'compra',
                  lote: lote.lote,
                  fechaVencimiento: moment(lote.fechaVencimiento).toDate(),
                  fechaIngreso: moment(fechaActual).toDate(),
                  fechaMovimiento: moment().toDate(),
                  costoUnitario: detalle.costoUnitario,
                  costoPromedio: Number(costoPromedio.toFixed(2)),
                  creadoPor: new ObjectId(req.uid)
                }
                /* {
                  productoId: new ObjectId(detalle.productoId),
                  movimientoId: new ObjectId(detalle.movimientoId),
                  cantidad: Number(diferenciaLote),
                  almacenId: new ObjectId(almacenTransito._id),
                  almacenOrigen: new ObjectId(almacenTransito._id),
                  almacenDestino: new ObjectId(almacenDevoluciones._id),
                  tipo: 'movimiento',
                  tipoMovimiento: 'salida',
                  lote: null, // lote.lote,
                  fechaVencimiento: moment(lote.fechaVencimiento).toDate(),
                  fechaIngreso: moment(fechaActual).toDate(),
                  fechaMovimiento: moment().toDate(),
                  costoUnitario: detalle.costoUnitario,
                  costoPromedio: detalle.costoUnitario,
                  creadoPor: new ObjectId(req.uid)
                } */)
              }
            } else if (diferencia <= 0) {
              console.log({ diferenciaMenor: diferencia })
              totalDevolucionesProducto += (Number(lote.cantidad) * detalle.costoUnitario)
              diferencia -= lote.cantidad
              productoPorAlmacen.push({
                productoId: new ObjectId(detalle.productoId),
                movimientoId: new ObjectId(detalle.movimientoId),
                cantidad: Number(lote.cantidad),
                almacenId: new ObjectId(almacenDestino._id),
                almacenOrigen: null, // new ObjectId(almacenTransito._id),
                almacenDestino: new ObjectId(almacenDestino._id),
                tipo: 'movimiento',
                tipoMovimiento: 'entrada',
                lote: lote.lote,
                fechaVencimiento: moment(lote.fechaVencimiento).toDate(),
                fechaIngreso: moment(fechaActual).toDate(),
                fechaMovimiento: moment().toDate(),
                costoUnitario: detalle.costoUnitario,
                costoPromedio: Number(costoPromedio.toFixed(2)),
                creadoPor: new ObjectId(req.uid)
              }, {
                productoId: new ObjectId(detalle.productoId),
                movimientoId: new ObjectId(detalle.movimientoId),
                cantidad: Number(lote.cantidad),
                almacenId: new ObjectId(almacenDevoluciones._id),
                // almacenOrigen: new ObjectId(almacenTransito._id),
                almacenDestino: new ObjectId(almacenDevoluciones._id),
                tipo: 'movimiento',
                tipoMovimiento: 'entrada',
                lote: lote.lote,
                fechaVencimiento: moment(lote.fechaVencimiento).toDate(),
                fechaIngreso: moment(fechaActual).toDate(),
                tipoAuditoria: 'sobrante',
                tipoDevolucion: 'compra',
                fechaMovimiento: moment().toDate(),
                costoUnitario: detalle.costoUnitario,
                costoPromedio: Number(costoPromedio.toFixed(2)),
                creadoPor: new ObjectId(req.uid)
              })
            }
            if (tieneContabilidad) {
              const infoProducto = await agreggateCollectionsSD({
                nameCollection: 'productos',
                enviromentClienteId: clienteId,
                pipeline: [
                  {
                    $match:
                    {
                      _id: new ObjectId(detalle.productoId)
                    }
                  },
                  {
                    $lookup: {
                      from: categoriaPorAlmacenCollection,
                      localField: 'categoria',
                      foreignField: 'categoriaId',
                      pipeline: [
                        { $match: { almacenId: new ObjectId(almacenDestino._id) } }
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
                      as: 'cuantaDestino'
                    }
                  },
                  { $unwind: { path: '$cuantaDestino', preserveNullAndEmptyArrays: true } },
                  {
                    $lookup: {
                      from: categoriaPorAlmacenCollection,
                      localField: 'categoria',
                      foreignField: 'categoriaId',
                      pipeline: [
                        { $match: { almacenId: new ObjectId(almacenDevoluciones._id) } }
                      ],
                      as: 'categoriaAlmacenDevoluciones'
                    }
                  },
                  { $unwind: { path: '$categoriaAlmacenDevoluciones', preserveNullAndEmptyArrays: true } },
                  {
                    $lookup: {
                      from: planCuentaCollection,
                      localField: 'categoriaAlmacenDevoluciones.cuentaId',
                      foreignField: '_id',
                      as: 'cuentaDevoluciones'
                    }
                  },
                  { $unwind: { path: '$cuentaDevoluciones', preserveNullAndEmptyArrays: true } },
                  {
                    $project: {
                      _id: 0,
                      producto: '$nombre',
                      productoId: '$_id',
                      // almacenId: '$_id.almacenId',
                      cuentaId: '$cuantaDestino._id',
                      cuentaCodigo: '$cuantaDestino.codigo',
                      cuntaNombre: '$cuantaDestino.descripcion',
                      cuentaDevolucionesId: '$cuentaDevoluciones._id',
                      cuentaDevolucionesCodigo: '$cuentaDevoluciones.codigo',
                      cuntaDevolucionesNombre: '$cuentaDevoluciones.descripcion'
                    }
                  }
                ]
              })
              asientosContable.push({
                cuentaId: new ObjectId(infoProducto[0].cuentaId),
                cuentaCodigo: infoProducto[0].cuentaCodigo,
                cuentaNombre: infoProducto[0].cuntaNombre,
                comprobanteId: new ObjectId(comprobante._id),
                periodoId: new ObjectId(periodo._id),
                descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} RECEPCIPON DE ${inventarioAnterior[0].producto}`,
                fecha: moment(fechaActual).toDate(),
                debe: Number(detalle.costoUnitario) * Number(detalle.cantidad),
                haber: 0,
                fechaCreacion: moment().toDate(),
                docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
                documento: {
                  docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
                  docFecha: moment(fechaActual).toDate()
                }
              })
              if (totalDevolucionesProducto) {
                asientosContable.push({
                  cuentaId: new ObjectId(infoProducto[0].cuentaDevolucionesId),
                  cuentaCodigo: infoProducto[0].cuentaDevolucionesCodigo,
                  cuentaNombre: infoProducto[0].cuntaDevolucionesNombre,
                  comprobanteId: new ObjectId(comprobante._id),
                  periodoId: new ObjectId(periodo._id),
                  descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} RECEPCIPON DE ${inventarioAnterior[0].producto}`,
                  fecha: moment(fechaActual).toDate(),
                  debe: 0,
                  haber: totalDevolucionesProducto,
                  fechaCreacion: moment().toDate(),
                  docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
                  documento: {
                    docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
                    docFecha: moment(fechaActual).toDate()
                  }
                })
              }
            }
          }
          detalleUpdate.push({
            updateOne: {
              filter: { _id: new ObjectId(detalle._id) },
              update: { $set: { recibido: Number(detalle?.recibe || 0) + Number(detalle?.recibido || 0) } }
            }
          })
          productosUpdate.push({
            updateOne: {
              filter: { _id: new ObjectId(detalle.productoId) },
              update: { $set: { costoPromedio: Number(costoPromedio.toFixed(2)) } }
            }
          })
          updateAllCostoPromedioPoducto.push({
            updateMany: {
              filter: { productoId: new ObjectId(detalle.productoId) },
              update: { $set: { costoPromedio: Number(costoPromedio.toFixed(2)) } }
            }
          })
        }
      }
      // console.log({ productoPorAlmacen, detalleUpdate, productosUpdate, updateAllCostoPromedioPoducto })
      if (detalleUpdate[0]) {
        const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
        const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
        if (tieneContabilidad) {
          const detalleCompra = await agreggateCollectionsSD({
            nameCollection: 'compras',
            enviromentClienteId: clienteId,
            pipeline: [
              { $match: { _id: new ObjectId(movimiento.compraId) } },
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
          const cuentaProveedor = await getItemSD({
            nameCollection: 'planCuenta',
            enviromentClienteId: clienteId,
            filters: { _id: new ObjectId(detalleCompra[0].detalleProveedor?.detalleCategoria?.cuentaId) }
          })
          let terceroProveedor = await getItemSD({
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
          if (totalPorPagarProveedor > 0) {
            asientosContable.push({
              cuentaId: new ObjectId(cuentaProveedor._id),
              cuentaCodigo: cuentaProveedor.codigo,
              cuentaNombre: cuentaProveedor.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              fecha: moment(fechaActual).toDate(),
              debe: 0,
              haber: totalPorPagarProveedor,
              fechaCreacion: moment().toDate(),
              terceroId: new ObjectId(terceroProveedor._id),
              terceroNombre: terceroProveedor.nombre,
              docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
                docFecha: moment(fechaActual).toDate()
              }
            })
          }
        }
        if (asientosContable[0]) {
          createManyItemsSD({
            nameCollection: 'detallesComprobantes',
            enviromentClienteId: clienteId,
            items: asientosContable
          })
        }
        updateItemSD({
          nameCollection: 'movimientos',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(movimientoId) },
          update: { $set: { facturasAsociadas } }
        })
        bulkWriteSD({ nameCollection: 'detalleMovimientos', enviromentClienteId: clienteId, pipeline: detalleUpdate })
        bulkWriteSD({ nameCollection: 'productos', enviromentClienteId: clienteId, pipeline: productosUpdate })
        createItemSD({
          nameCollection: 'historial',
          enviromentClienteId: clienteId,
          item: {
            idMovimiento: new ObjectId(movimientoId),
            categoria: 'creado',
            tipo: 'Recepcion de inventario',
            fecha: moment().toDate(),
            descripcion: 'Inventario recibido parcialmente',
            creadoPor: new ObjectId(req.uid)
          }
        })
        if (productoPorAlmacen[0]) {
          await createManyItemsSD({
            nameCollection: 'productosPorAlmacen',
            enviromentClienteId: clienteId,
            items: productoPorAlmacen
          })
          bulkWriteSD({ nameCollection: 'productosPorAlmacen', enviromentClienteId: clienteId, pipeline: updateAllCostoPromedioPoducto })
        }
      }
    }
    return res.status(200).json({ status: 'Inventario recibido exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de recibir inventario ' + e.message })
  }
}
export const cerrarRecepcionCompra = async (req, res) => {
  const { clienteId, detalleMovimientos, _id: movimientoId, observacion, fechaActual, facturasAsociadas } = req.body
  console.log(req.body)
  try {
    const tieneContabilidad = await hasContabilidad({ clienteId })
    const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
    let periodo = null
    let comprobante = null
    const movimiento = await getItemSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(movimientoId) }
    })
    let cuentaProveedor = null
    let terceroProveedor = null
    if (tieneContabilidad) {
      const validContabilidad = await validProductosRecepcionCompras({ clienteId, movimientoId, detalleMovimientos, tipo: 'cerrar' })
      if (validContabilidad && validContabilidad.message) {
        return res.status(500).json({ error: 'Error al momento de validar información contable: ' + validContabilidad.message })
      }
      periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fechaActual).toDate() }, fechaFin: { $gte: moment(fechaActual).toDate() } } })
      // console.log({ periodo })
      if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha de envio o de recepción')
      const mesPeriodo = moment(fechaActual).format('YYYY/MM')
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
      const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
      const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
      const detalleCompra = await agreggateCollectionsSD({
        nameCollection: 'compras',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { _id: new ObjectId(movimiento.compraId) } },
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
    }
    if (detalleMovimientos[0]) {
      const diferencia = detalleMovimientos.some(e => e.cantidad !== e.recibo)
      const almacenDevoluciones = await getItemSD({
        nameCollection: 'almacenes',
        enviromentClienteId: clienteId,
        filters: { nombre: 'Devoluciones' }
      })
      const productosPorAlmacen = []
      const asientosContables = []
      let totalPorPagarProveedor = 0
      /** Preguntarle a marco cual seria la otra cuenta contable para el cierre de recepcion */
      for (const detalle of detalleMovimientos) {
        if (Number(detalle.recibido) < detalle.cantidad) {
          console.log('entramos al for', detalle)
          const categoriaPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorAlmacen' })
          const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
          const producto = await agreggateCollectionsSD({
            nameCollection: 'productos',
            enviromentClienteId: clienteId,
            pipeline: [
              { $match: { _id: new ObjectId(detalle.productoId) } },
              {
                $lookup: {
                  from: categoriaPorAlmacenCollection,
                  localField: 'categoria',
                  foreignField: 'categoriaId',
                  pipeline: [
                    { $match: { almacenId: new ObjectId(almacenDevoluciones._id) } }
                  ],
                  as: 'categoriaAlmacenDevoluciones'
                }
              },
              { $unwind: { path: '$categoriaAlmacenDevoluciones', preserveNullAndEmptyArrays: true } },
              {
                $lookup: {
                  from: planCuentaCollection,
                  localField: 'categoriaAlmacenDevoluciones.cuentaId',
                  foreignField: '_id',
                  as: 'cuentaDevoluciones'
                }
              },
              { $unwind: { path: '$cuentaDevoluciones', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  _id: 0,
                  producto: '$nombre',
                  productoId: '$_id',
                  cuentaDevolucionesId: '$cuentaDevoluciones._id',
                  cuentaDevolucionesCodigo: '$cuentaDevoluciones.codigo',
                  cuntaDevolucionesNombre: '$cuentaDevoluciones.descripcion',
                  costoPromedio: '$costoPromedio'
                }
              }
            ]
          })
          productosPorAlmacen.push({
            productoId: new ObjectId(detalle.productoId),
            movimientoId: new ObjectId(detalle.movimientoId),
            cantidad: Number(detalle.cantidad) - Number(detalle.recibido),
            almacenId: new ObjectId(almacenDevoluciones._id),
            // almacenOrigen: new ObjectId(almacenTransito._id),
            almacenDestino: new ObjectId(almacenDevoluciones._id),
            tipo: 'movimiento',
            tipoMovimiento: 'entrada',
            tipoAuditoria: 'faltante',
            tipoDevolucion: 'compra',
            lote: null,
            fechaVencimiento: null,
            fechaIngreso: moment(fechaActual).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: detalle.costoUnitario,
            costoPromedio: producto[0].costoPromedio,
            creadoPor: new ObjectId(req.uid)
          } /* {
            productoId: new ObjectId(detalle.productoId),
            movimientoId: new ObjectId(detalle.movimientoId),
            cantidad: Number(detalle.cantidad) - Number(detalle.recibido),
            almacenId: new ObjectId(almacenTransito._id),
            almacenOrigen: new ObjectId(almacenTransito._id),
            almacenDestino: new ObjectId(almacenDevoluciones._id),
            tipo: 'movimiento',
            tipoMovimiento: 'salida',
            lote: null,
            fechaVencimiento: null,
            fechaIngreso: moment(fechaActual).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: detalle.costoUnitario,
            costoPromedio: producto.costoPromedio,
            creadoPor: new ObjectId(req.uid)
          } */)
          if (tieneContabilidad) {
            totalPorPagarProveedor += Number(detalle.costoUnitario) * Number(detalle.cantidad)
            // coolocar contra proveedor igual por el haber
            asientosContables.push({
              cuentaId: new ObjectId(producto[0].cuentaDevolucionesId),
              cuentaCodigo: producto[0].cuentaDevolucionesCodigo,
              cuentaNombre: producto[0].cuntaDevolucionesNombre,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} RECEPCIPON DE ${producto[0].producto}`,
              fecha: moment(fechaActual).toDate(),
              debe: Number(detalle.costoUnitario) * Number(detalle.cantidad),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
                docFecha: moment(fechaActual).toDate()
              }
            })
          }
        }
      }
      if (productosPorAlmacen[0]) {
        createManyItemsSD({
          nameCollection: 'productosPorAlmacen',
          enviromentClienteId: clienteId,
          items: productosPorAlmacen
        })
      }
      updateItemSD({
        nameCollection: 'movimientos',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(movimientoId) },
        update: { $set: { estado: 'recibido', observacion, estadoRecepcion: diferencia ? 'Con diferencia' : 'Satisfactorio', statusInventario: 'Recibido', facturasAsociadas } }
      })
      if (tieneContabilidad && asientosContables[0]) {
        asientosContables.push({
          cuentaId: new ObjectId(cuentaProveedor._id),
          cuentaCodigo: cuentaProveedor.codigo,
          cuentaNombre: cuentaProveedor.descripcion,
          comprobanteId: new ObjectId(comprobante._id),
          periodoId: new ObjectId(periodo._id),
          descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} RECEPCIPON`,
          fecha: moment(fechaActual).toDate(),
          debe: 0,
          haber: totalPorPagarProveedor,
          fechaCreacion: moment().toDate(),
          terceroId: new ObjectId(terceroProveedor._id),
          terceroNombre: terceroProveedor.nombre,
          docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
          documento: {
            docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
            docFecha: moment(fechaActual).toDate()
          }
        })
        createManyItemsSD({
          nameCollection: 'detallesComprobantes',
          enviromentClienteId: clienteId,
          items: asientosContables
        })
      }
      if (movimiento && movimiento.compraId) {
        updateItemSD({
          nameCollection: 'compras',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(movimiento.compraId) },
          update: { $set: { statusInventario: 'Recibido' } }
        })
        createItemSD({
          nameCollection: 'historial',
          enviromentClienteId: clienteId,
          item: {
            idMovimiento: new ObjectId(movimientoId),
            categoria: 'creado',
            tipo: 'Recepcion de inventario',
            fecha: moment().toDate(),
            descripcion: 'Recepción de inventario cerrada',
            creadoPor: new ObjectId(req.uid)
          }
        })
      }
      // console.log({ prueba })
      return res.status(200).json({ status: 'Recepción cerrada exitosamente ' })
    }
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de recibir inventario ' + e.message })
  }
}
export const saveAjusteAlmacenDevoluciones = async (req, res) => {
  const {
    clienteId,
    cantidad,
    tipoAjuste,
    almacen,
    fechaRegistro,
    movimientoId,
    productoId,
    costoUnitario,
    costoPromedio,
    tipoAuditoria,
    lote,
    fechaVencimiento,
    fechaIngreso
  } = req.body
  try {
    console.log({ 3: fechaIngreso })
    console.log(req.body)
    const tieneContabilidad = await hasContabilidad({ clienteId })
    /* if (tieneContabilidad) {
      const validContabilidad = validMovimientoAuditoria({ clienteId, tipoAjuste, almacen, productoId })
      if (validContabilidad && validContabilidad.message) {
        return res.status(500).json({ error: 'Error al momento de validar información contable: ' + validContabilidad.message })
      }
    } */
    const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
    let periodo = null
    let comprobante = null
    if (tieneContabilidad) {
      periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fechaRegistro).toDate() }, fechaFin: { $gte: moment(fechaRegistro).toDate() } } })
      // console.log({ periodo })
      if (!periodo) throw new Error('No se encontró periodo, por favor verifique la fecha de envio o de recepción')
      const mesPeriodo = moment(fechaRegistro).format('YYYY/MM')
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
    const almacenDevoluciones = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Devoluciones' } })
    const categoriaPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorAlmacen' })
    const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
    const producto = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { _id: new ObjectId(productoId) } },
        {
          $lookup: {
            from: categoriaPorAlmacenCollection,
            localField: 'categoria',
            foreignField: 'categoriaId',
            pipeline: [
              { $match: { almacenId: new ObjectId(almacenDevoluciones._id) } },
              {
                $lookup: {
                  from: planCuentaCollection,
                  localField: 'cuentaId',
                  foreignField: '_id',
                  as: 'cuenta'
                }
              },
              { $unwind: { path: '$cuenta', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  cuentaIdDevoluciones: '$cuenta._id',
                  cuentaCodigoDevoluciones: '$cuenta.codigo',
                  cuentaNombreDevoluciones: '$cuenta.descripcion'
                }
              }
            ],
            as: 'categoriaAlmacenDevoluciones'
          }
        },
        { $unwind: { path: '$categoriaAlmacenDevoluciones', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: categoriaPorAlmacenCollection,
            localField: 'categoria',
            foreignField: 'categoriaId',
            pipeline: [
              { $match: { almacenId: new ObjectId(almacen._id) } },
              {
                $lookup: {
                  from: planCuentaCollection,
                  localField: 'cuentaId',
                  foreignField: '_id',
                  as: 'cuenta'
                }
              },
              { $unwind: { path: '$cuenta', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  cuentaIdAlmacen: '$cuenta._id',
                  cuentaCodigoAlmacen: '$cuenta.codigo',
                  cuentaNombreAlmacen: '$cuenta.descripcion'
                }
              }
            ],
            as: 'categoriaAlmacen'
          }
        },
        { $unwind: { path: '$categoriaAlmacen', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            codigo: 1,
            descripcion: 1,
            nombre: 1,
            observacion: 1,
            unidad: 1,
            cuentaIdDevoluciones: '$categoriaAlmacenDevoluciones.cuentaIdDevoluciones',
            cuentaCodigoDevoluciones: '$categoriaAlmacenDevoluciones.cuentaCodigoDevoluciones',
            cuentaNombreDevoluciones: '$categoriaAlmacenDevoluciones.cuentaNombreDevoluciones',
            cuentaIdAlmacen: '$categoriaAlmacen.cuentaIdAlmacen',
            cuentaCodigoAlmacen: '$categoriaAlmacen.cuentaCodigoAlmacen',
            cuentaNombreAlmacen: '$categoriaAlmacen.cuentaNombreAlmacen'
          }
        }
      ]
    })
    let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'devolucion' } }))?.contador
    if (contador) ++contador
    if (!contador) contador = 1
    const movimiento = await createItemSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      item: {
        fecha: moment().toDate(),
        fechaVencimiento: moment().toDate(),
        tipo: 'devolucion',
        almacenOrigen: almacenDevoluciones?._id,
        estado: 'devolucion',
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
        codigo: producto[0].codigo,
        descripcion: producto[0].descripcion,
        nombre: producto[0].nombre,
        observacion: producto[0].observacion,
        unidad: producto[0].unidad,
        cantidad: Number(cantidad)
      }
    })
    const detalleMovimientoAfectado = await getItemSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      filters: { movimientoId: new ObjectId(movimientoId), lote, almacenId: { $ne: almacenDevoluciones._id } }
    })
    /* const almacenDestino = await getItemSD({
      nameCollection: 'almacenes',
      enviromentClienteId: clienteId,
      filters: { _id: detalleMovimientoAfectado.almacenDestino }
    }) */
    if (tipoAuditoria === 'sobrante') {
      if (tipoAjuste === 'Almacen') {
        const detallesCrear = [
          {
            productoId: new ObjectId(productoId),
            movimientoId: movimiento.insertedId,
            cantidad: Number(cantidad),
            almacenId: almacenDevoluciones._id,
            almacenOrigen: almacenDevoluciones._id,
            almacenDestino: almacen ? new ObjectId(almacen._id) : null,
            tipoAuditoria,
            tipo: 'ajuste',
            tipoMovimiento: 'salida',
            lote,
            fechaVencimiento: moment(fechaVencimiento).toDate(),
            fechaIngreso: moment(fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: Number(costoUnitario),
            costoPromedio: Number(costoPromedio),
            movimientoAfectado: new ObjectId(movimientoId),
            afecta: tipoAjuste,
            creadoPor: new ObjectId(req.uid),
            fechaCreacion: moment().toDate()
          },
          {
            productoId: new ObjectId(productoId),
            movimientoId: movimiento.insertedId,
            cantidad: Number(cantidad),
            almacenId: almacen ? new ObjectId(almacen._id) : null,
            almacenOrigen: almacen ? new ObjectId(almacen._id) : null,
            almacenDestino: /* almacen ? new ObjectId(almacen._id) : */null,
            tipoAuditoria,
            tipo: 'ajuste',
            tipoMovimiento: 'salida',
            lote,
            fechaVencimiento: moment(fechaVencimiento).toDate(),
            fechaIngreso: moment(fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: Number(costoUnitario),
            costoPromedio: Number(costoPromedio),
            // movimientoAfectado: new ObjectId(movimientoId),
            afecta: tipoAjuste,
            creadoPor: new ObjectId(req.uid),
            fechaCreacion: moment().toDate()
          }
        ]
        if (tieneContabilidad) {
          const asientosContables = [{
            cuentaId: new ObjectId(producto[0].cuentaIdDevoluciones),
            cuentaCodigo: producto[0].cuentaCodigoDevoluciones,
            cuentaNombre: producto[0].cuentaNombreDevoluciones,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} AJUSTE DE ${producto[0].descripcion}`,
            fecha: moment(fechaRegistro).toDate(),
            debe: Number(costoUnitario) * Number(cantidad),
            haber: 0,
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
            documento: {
              docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              docFecha: moment(fechaRegistro).toDate()
            }
          }, {
            cuentaId: new ObjectId(producto[0].cuentaIdAlmacen),
            cuentaCodigo: producto[0].cuentaCodigoAlmacen,
            cuentaNombre: producto[0].cuentaNombreAlmacen,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} AJUSTE DE ${producto[0].descripcion}`,
            fecha: moment(fechaRegistro).toDate(),
            debe: 0,
            haber: Number(costoUnitario) * Number(cantidad),
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
            documento: {
              docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              docFecha: moment(fechaRegistro).toDate()
            }
          }]
          createManyItemsSD({
            nameCollection: 'detallesComprobantes',
            enviromentClienteId: clienteId,
            items: asientosContables
          })
        }
        createManyItemsSD({
          nameCollection: 'productosPorAlmacen',
          enviromentClienteId: clienteId,
          items: detallesCrear
        })
      }
      if (tipoAjuste === 'Descuento en compra' || tipoAjuste === 'Por pagar proveedor') {
        let nuevoCostoPromedio = costoPromedio
        if (tipoAjuste === 'Por pagar proveedor') {
          /* Ajustaremos el costo promedio del producto porque la mercancia sobrante se le pagará al proveedor */
          const inventarioAnterior = await agreggateCollectionsSD({
            nameCollection: 'productosPorAlmacen',
            enviromentClienteId: clienteId,
            pipeline: [
              {
                $match:
                {
                  productoId: new ObjectId(productoId),
                  almacenId: { $ne: almacenDevoluciones._id }
                }
              },
              {
                $group: {
                  _id: {
                    // costoUnitario: '$costoUnitario',
                    productoId: '$productoId',
                    // almacenId: '$almacenId',
                    costoPromedio: '$costoPromedio'
                  },
                  // lote: { $first: '$lote' },
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
                  costoPromedio: '$_id.costoPromedio',
                  productoId: '$_id.productoId',
                  // almacenId: '$_id.almacenId',
                  cantidad: { $subtract: ['$entrada', '$salida'] } // cantidad de producto en el almacen de origen
                  // almacenNombre: '$detalleAlmacen.nombre'
                }
              },
              { $match: { cantidad: { $gt: 0 } } }
            ]
          })
          const costoPromedioTotalAnterior = (inventarioAnterior[0]?.costoPromedio || 0) * (inventarioAnterior[0].cantidad || 0)
          const costoPromedioTotalActualizado = (Number(cantidad) * (costoUnitario || 0)) + costoPromedioTotalAnterior
          nuevoCostoPromedio = costoPromedioTotalActualizado / (Number(inventarioAnterior[0]?.cantidad || 0))
          /** */
        }
        const detallesCrear = [
          {
            productoId: new ObjectId(productoId),
            movimientoId: movimiento.insertedId,
            cantidad: Number(cantidad),
            almacenId: almacenDevoluciones._id,
            almacenOrigen: almacenDevoluciones._id,
            almacenDestino: almacen ? new ObjectId(almacen._id) : null,
            tipoAuditoria,
            tipo: 'ajuste',
            tipoMovimiento: 'salida',
            lote,
            fechaVencimiento: moment(fechaVencimiento).toDate(),
            fechaIngreso: moment(fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: Number(costoUnitario),
            costoPromedio: Number(nuevoCostoPromedio),
            movimientoAfectado: new ObjectId(movimientoId),
            afecta: tipoAjuste,
            fechaCreacion: moment().toDate(),
            creadoPor: new ObjectId(req.uid)
          }
        ]
        updateManyItemSD({
          nameCollection: 'productosPorAlmacen',
          enviromentClienteId: clienteId,
          filters: { productoId: new ObjectId(productoId) },
          update: { $set: { costoPromedio: Number(nuevoCostoPromedio) } }
        })
        updateItemSD({
          nameCollection: 'productos',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(productoId) },
          update: { $set: { costoPromedio: Number(nuevoCostoPromedio) } }
        })
        if (tieneContabilidad) {
          if (tipoAjuste === 'Descuento en compra') {
            /** crear un setting para una cuenta de descuento en compra  y cambiar el nombre de ganancia por descuento en compra en el inventario de devoluciones */
            const cuentaDescuento = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteInventario.cuentaDescuentoCompra) }
            })
            const asientosContables = [{
              cuentaId: new ObjectId(producto[0].cuentaIdDevoluciones),
              cuentaCodigo: producto[0].cuentaCodigoDevoluciones,
              cuentaNombre: producto[0].cuentaNombreDevoluciones,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} AJUSTE DE ${producto[0].descripcion}`,
              fecha: moment(fechaRegistro).toDate(),
              debe: Number(costoUnitario) * Number(cantidad),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
                docFecha: moment(fechaRegistro).toDate()
              }
            }, {
              cuentaId: new ObjectId(cuentaDescuento._id),
              cuentaCodigo: cuentaDescuento.codigo,
              cuentaNombre: cuentaDescuento.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} AJUSTE DE ${producto[0].descripcion}`,
              fecha: moment(fechaRegistro).toDate(),
              debe: 0,
              haber: Number(costoUnitario) * Number(cantidad),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
                docFecha: moment(fechaRegistro).toDate()
              }
            }]
            createManyItemsSD({
              nameCollection: 'detallesComprobantes',
              enviromentClienteId: clienteId,
              items: asientosContables
            })
          }
          if (tipoAjuste === 'Por pagar proveedor') {
            /* cuando recibimos en por pagar tenemos que actualizar el costo promedio del producto segun el sobrante */
            const detalleCompra = await agreggateCollectionsSD({
              nameCollection: 'compras',
              enviromentClienteId: clienteId,
              pipeline: [
                { $match: { _id: new ObjectId(detalleMovimientoAfectado.compraId) } },
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
            const cuentaProveedor = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(detalleCompra[0].detalleProveedor?.detalleCategoria?.cuentaId) }
            })
            let terceroProveedor = await getItemSD({
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
            const asientosContables = [{
              cuentaId: new ObjectId(producto[0].cuentaIdDevoluciones),
              cuentaCodigo: producto[0].cuentaCodigoDevoluciones,
              cuentaNombre: producto[0].cuentaNombreDevoluciones,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} AJUSTE DE ${producto[0].descripcion}`,
              fecha: moment(fechaRegistro).toDate(),
              debe: Number(costoUnitario) * Number(cantidad),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
                docFecha: moment(fechaRegistro).toDate()
              }
            }, {
              cuentaId: new ObjectId(cuentaProveedor._id),
              cuentaCodigo: cuentaProveedor.codigo,
              cuentaNombre: cuentaProveedor.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} AJUSTE DE ${producto[0].descripcion}`,
              fecha: moment(fechaRegistro).toDate(),
              debe: 0,
              haber: Number(costoUnitario) * Number(cantidad),
              fechaCreacion: moment().toDate(),
              terceroId: new ObjectId(terceroProveedor._id),
              terceroNombre: terceroProveedor.nombre,
              docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
                docFecha: moment(fechaRegistro).toDate()
              }
            }]
            createManyItemsSD({
              nameCollection: 'detallesComprobantes',
              enviromentClienteId: clienteId,
              items: asientosContables
            })
          }
        }
        createManyItemsSD({
          nameCollection: 'productosPorAlmacen',
          enviromentClienteId: clienteId,
          items: detallesCrear
        })
      }
    }
    if (tipoAuditoria === 'faltante') {
      if (tipoAjuste === 'Almacen') {
        const detalleProductoAlmacen = await agreggateCollectionsSD({
          nameCollection: 'productosPorAlmacen',
          enviromentClienteId: clienteId,
          pipeline: [
            {
              $match:
              {
                productoId: new ObjectId(productoId),
                almacenId: { $nin: [new ObjectId(almacenDevoluciones?._id), null, undefined] },
                movimientoId: new ObjectId(movimientoId),
                lote: { $ne: null }
              }
            },
            { $sort: { fechaIngreso: -1 } },
            { $limit: 1 }
          ]
        })
        /* Ajustaremos el costo promedio del producto porque la mercancia sobrante se le pagará al proveedor */
        const inventarioAnterior = await agreggateCollectionsSD({
          nameCollection: 'productosPorAlmacen',
          enviromentClienteId: clienteId,
          pipeline: [
            {
              $match:
              {
                productoId: new ObjectId(productoId),
                almacenId: { $ne: almacenDevoluciones._id }
              }
            },
            {
              $group: {
                _id: {
                  productoId: '$productoId',
                  costoPromedio: '$costoPromedio'
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
                costoPromedio: '$_id.costoPromedio',
                productoId: '$_id.productoId',
                // almacenId: '$_id.almacenId',
                cantidad: { $subtract: ['$entrada', '$salida'] } // cantidad de producto en el almacen de origen
                // almacenNombre: '$detalleAlmacen.nombre'
              }
            },
            { $match: { cantidad: { $gt: 0 } } }
          ]
        })
        const costoPromedioTotalAnterior = (inventarioAnterior[0]?.costoPromedio || 0) * (inventarioAnterior[0].cantidad || 0)
        const costoPromedioTotalActualizado = (Number(cantidad) * (costoUnitario || 0)) + costoPromedioTotalAnterior
        const nuevoCostoPromedio = costoPromedioTotalActualizado / (Number(inventarioAnterior[0]?.cantidad || 0))
        /** */
        console.log({ detalleProductoAlmacen })
        const detallesCrear = [
          {
            productoId: new ObjectId(productoId),
            movimientoId: movimiento.insertedId,
            cantidad: Number(cantidad),
            almacenId: almacenDevoluciones._id,
            almacenOrigen: almacenDevoluciones._id,
            almacenDestino: almacen ? new ObjectId(almacen._id) : null,
            tipoAuditoria,
            tipo: 'ajuste',
            tipoMovimiento: 'salida',
            lote: null, // detalleProductoAlmacen[0]?.lote,
            fechaVencimiento: null, // moment(detalleProductoAlmacen[0]?.fechaVencimiento).toDate(),
            fechaIngreso: null, // moment(detalleProductoAlmacen[0]?.fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: Number(costoUnitario),
            costoPromedio: Number(nuevoCostoPromedio),
            movimientoAfectado: new ObjectId(movimientoId),
            afecta: tipoAjuste,
            creadoPor: new ObjectId(req.uid),
            fechaCreacion: moment().toDate()
          },
          {
            productoId: new ObjectId(productoId),
            movimientoId: new ObjectId(movimiento.insertedId),
            cantidad: Number(cantidad),
            almacenId: new ObjectId(almacen._id),
            almacenOrigen: almacenDevoluciones._id,
            almacenDestino: new ObjectId(almacen._id),
            tipo: 'ajuste',
            tipoMovimiento: 'entrada',
            lote: detalleProductoAlmacen[0]?.lote,
            fechaVencimiento: moment(detalleProductoAlmacen[0]?.fechaVencimiento).toDate(),
            fechaIngreso: moment(detalleProductoAlmacen[0]?.fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: Number(costoUnitario),
            costoPromedio: Number(nuevoCostoPromedio),
            creadoPor: new ObjectId(req.uid),
            fechaCreacion: moment().toDate()
          }
        ]
        if (tieneContabilidad) {
          const asientosContables = [{
            cuentaId: new ObjectId(producto[0].cuentaIdAlmacen),
            cuentaCodigo: producto[0].cuentaCodigoAlmacen,
            cuentaNombre: producto[0].cuentaNombreAlmacen,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} AJUSTE DE ${producto[0].descripcion}`,
            fecha: moment(fechaRegistro).toDate(),
            debe: Number(costoUnitario) * Number(cantidad),
            haber: 0,
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
            documento: {
              docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              docFecha: moment(fechaRegistro).toDate()
            }
          }, {
            cuentaId: new ObjectId(producto[0].cuentaIdDevoluciones),
            cuentaCodigo: producto[0].cuentaCodigoDevoluciones,
            cuentaNombre: producto[0].cuentaNombreDevoluciones,
            comprobanteId: new ObjectId(comprobante._id),
            periodoId: new ObjectId(periodo._id),
            descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} AJUSTE DE ${producto[0].descripcion}`,
            fecha: moment(fechaRegistro).toDate(),
            debe: 0,
            haber: Number(costoUnitario) * Number(cantidad),
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
            documento: {
              docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              docFecha: moment(fechaRegistro).toDate()
            }
          }]
          createManyItemsSD({
            nameCollection: 'detallesComprobantes',
            enviromentClienteId: clienteId,
            items: asientosContables
          })
        }
        await createManyItemsSD({
          nameCollection: 'productosPorAlmacen',
          enviromentClienteId: clienteId,
          items: detallesCrear
        })
        updateManyItemSD({
          nameCollection: 'productosPorAlmacen',
          enviromentClienteId: clienteId,
          filters: { productoId: new ObjectId(productoId) },
          update: { $set: { costoPromedio: Number(nuevoCostoPromedio) } }
        })
        updateItemSD({
          nameCollection: 'productos',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(productoId) },
          update: { $set: { costoPromedio: Number(nuevoCostoPromedio) } }
        })
        console.log({ detallesCrear })
      }
      if (tipoAjuste === 'Cobrar al proveedor' || tipoAjuste === 'Perdida') {
        const detallesCrear = [
          {
            productoId: new ObjectId(productoId),
            movimientoId: movimiento.insertedId,
            cantidad: Number(cantidad),
            almacenId: almacenDevoluciones._id,
            almacenOrigen: almacenDevoluciones._id,
            almacenDestino: almacen ? new ObjectId(almacen._id) : null,
            tipoAuditoria,
            tipo: 'ajuste',
            tipoMovimiento: 'salida',
            lote: null,
            fechaVencimiento: null, // moment(fechaVencimiento).toDate(),
            fechaIngreso: null, // moment(fechaIngreso).toDate(),
            fechaMovimiento: moment().toDate(),
            costoUnitario: Number(costoUnitario),
            costoPromedio: Number(costoPromedio),
            movimientoAfectado: new ObjectId(movimientoId),
            afecta: tipoAjuste,
            creadoPor: new ObjectId(req.uid),
            fechaCreacion: moment().toDate()
          }
        ]
        if (tieneContabilidad) {
          /** cambiar descuento por algo de proveedor y se reduce la cuenta por pagar contra el inventario */
          if (tipoAjuste === 'Perdida') {
            const cuentaPerdida = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(ajusteInventario.cuentaPerdidaAcum) }
            })
            const asientosContables = [{
              cuentaId: new ObjectId(cuentaPerdida._id),
              cuentaCodigo: cuentaPerdida.codigo,
              cuentaNombre: cuentaPerdida.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} AJUSTE DE ${producto[0].descripcion}`,
              fecha: moment(fechaRegistro).toDate(),
              debe: Number(costoUnitario) * Number(cantidad),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
                docFecha: moment(fechaRegistro).toDate()
              }
            }, {
              cuentaId: new ObjectId(producto[0].cuentaIdDevoluciones),
              cuentaCodigo: producto[0].cuentaCodigoDevoluciones,
              cuentaNombre: producto[0].cuentaNombreDevoluciones,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} AJUSTE DE ${producto[0].descripcion}`,
              fecha: moment(fechaRegistro).toDate(),
              debe: 0,
              haber: Number(costoUnitario) * Number(cantidad),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
                docFecha: moment(fechaRegistro).toDate()
              }
            }]
            createManyItemsSD({
              nameCollection: 'detallesComprobantes',
              enviromentClienteId: clienteId,
              items: asientosContables
            })
          }
          if (tipoAjuste === 'Cobrar al proveedor') {
            /* cuando recibimos en por pagar tenemos que actualizar el costo promedio del producto segun el sobrante */
            const detalleCompra = await agreggateCollectionsSD({
              nameCollection: 'compras',
              enviromentClienteId: clienteId,
              pipeline: [
                { $match: { _id: new ObjectId(detalleMovimientoAfectado.compraId) } },
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
            const cuentaProveedor = await getItemSD({
              nameCollection: 'planCuenta',
              enviromentClienteId: clienteId,
              filters: { _id: new ObjectId(detalleCompra[0].detalleProveedor?.detalleCategoria?.cuentaId) }
            })
            let terceroProveedor = await getItemSD({
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
            const asientosContables = [{
              cuentaId: new ObjectId(cuentaProveedor._id),
              cuentaCodigo: cuentaProveedor.codigo,
              cuentaNombre: cuentaProveedor.descripcion,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} AJUSTE DE ${producto[0].descripcion}`,
              fecha: moment(fechaRegistro).toDate(),
              debe: Number(costoUnitario) * Number(cantidad),
              haber: 0,
              fechaCreacion: moment().toDate(),
              terceroId: new ObjectId(terceroProveedor._id),
              terceroNombre: terceroProveedor.nombre,
              docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
                docFecha: moment(fechaRegistro).toDate()
              }
            }, {
              cuentaId: new ObjectId(producto[0].cuentaIdDevoluciones),
              cuentaCodigo: producto[0].cuentaCodigoDevoluciones,
              cuentaNombre: producto[0].cuentaNombreDevoluciones,
              comprobanteId: new ObjectId(comprobante._id),
              periodoId: new ObjectId(periodo._id),
              descripcion: `MOV ${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento} AJUSTE DE ${producto[0].descripcion}`,
              fecha: moment(fechaRegistro).toDate(),
              debe: 0,
              haber: Number(costoUnitario) * Number(cantidad),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
              documento: {
                docReferencia: `MOV-${tipoMovimientosShort[movimiento.tipo]}-${movimiento.numeroMovimiento}`,
                docFecha: moment(fechaRegistro).toDate()
              }
            }]
            createManyItemsSD({
              nameCollection: 'detallesComprobantes',
              enviromentClienteId: clienteId,
              items: asientosContables
            })
          }
        }
        await createManyItemsSD({
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
        descripcion: `Movimiento DEV-${contador} creado`,
        creadoPor: new ObjectId(req.uid)
      }
    })
    /* if (tieneContabilidad) {
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
        *
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
              debe: Number(cantidad) * Number(costoPromedio),
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
              haber: Number(cantidad) * Number(costoPromedio),
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
              debe: Number(cantidad) * Number(costoPromedio),
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
              haber: Number(cantidad) * Number(costoPromedio),
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
            debe: Number(cantidad) * Number(costoPromedio),
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
            haber: Number(cantidad) * Number(costoPromedio),
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
            debe: Number(cantidad) * Number(costoPromedio),
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
            haber: Number(cantidad) * Number(costoPromedio),
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
    } */
    const productoAfectadoAuditoria = await agreggateCollectionsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { movimientoAfectado: new ObjectId(movimientoId), productoId: new ObjectId(productoId), lote } },
        { $sort: { fechaCreacion: -1 } },
        { $limit: 1 }
      ]
    })
    console.log({ productoAfectadoAuditoria })
    upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'devolucion' }, update: { $set: { contador } } })
    return res.status(200).json({ status: 'Movimiento guardado exitosamente', productoAfectadoAuditoria: productoAfectadoAuditoria[0] })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de realizar el movimiento de ajuste ' + e.message })
  }
}
export const getDataOrdenCompra = async (req, res) => {
  const { clienteId, ordenId } = req.body
  console.log(req.body)
  try {
    const movimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'movimientos' })
    const almacenesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const productosPorAlmacensCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
    const detalleMovimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleMovimientos' })
    const almacenDevoluciones = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Devoluciones' } })
    const ordenCompra = await agreggateCollectionsSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { _id: new ObjectId(ordenId) } },
        {
          $lookup: {
            from: movimientosCollection,
            localField: '_id',
            foreignField: 'compraId',
            as: 'movimientoRecepcion'
          }
        },
        { $unwind: { path: '$movimientoRecepcion', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: detalleMovimientosCollection,
            localField: 'movimientoRecepcion._id',
            foreignField: 'movimientoId',
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
                        almacenId: { $ne: almacenDevoluciones._id },
                        $expr: {
                          $and: [
                            { $eq: ['$productoId', '$$productoId'] }
                          ]
                        }
                      }
                    },
                    {
                      $lookup: {
                        from: almacenesCollection,
                        localField: 'almacenId',
                        foreignField: '_id',
                        as: 'almacen'
                      }
                    },
                    { $unwind: { path: '$almacen', preserveNullAndEmptyArrays: true } }
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
                  costoPromedio: '$detalleProductoPorAlmacen.costoPromedio',
                  tipoMovimiento: '$detalleProductoPorAlmacen.tipoMovimiento',
                  almacen: '$detalleProductoPorAlmacen.almacen',
                  // cantidadAux: '$detalleProductoPorAlmacen.cantidad',
                  cantidadPorLote: { $subtract: ['$detalleProductoPorAlmacen.cantidad', { $ifNull: ['$detalleProductoPorAlmacen.cantidadDevueltaPorLote', 0] }] },
                  cantidadDevueltaPorLote: '$detalleProductoPorAlmacen.cantidadDevueltaPorLote',
                  fechaVencimientoLote: '$detalleProductoPorAlmacen.fechaVencimiento',
                  fechaIngresoLote: '$detalleProductoPorAlmacen.fechaIngreso',
                  recibido: '$recibido',
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
        }
      ]
    })
    console.log({ ordenCompra })
    return res.status(200).json({ ordenCompra: ordenCompra[0] })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la informacion de la orden de compra ' + e.message })
  }
}
export const createDevolucionCompra = async (req, res) => {
  console.log(req.body)
  try {
    const { clienteId, fechaDevolucion, fecha, compraId, detalleMovimiento, movimientoRecepcion } = req.body
    let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'devolucion' } }))?.contador
    const almacenDevolucion = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Devoluciones' } })
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
        almacenOrigen: null,
        almacenDestino: null,
        zonaOrigen: null,
        estado: 'devolucion',
        numeroMovimiento: contador,
        movimientoDevolucion: new ObjectId(movimientoRecepcion),
        compraId: new ObjectId(compraId),
        creadoPor: new ObjectId(req.uid)
      }
    })
    upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'devolucion' }, update: { $set: { contador } } })
    const detalleNewMovimiento = []
    const cantidadDevueltaProducto = []
    const updateProductoPorAlmacenDevolucion = []
    const newProductoPorAlmacen = []
    // const saldoContabilidad = {}
    for (const detalle of detalleMovimiento) {
      /* if (!saldoContabilidad[detalle.productoId]) saldoContabilidad[detalle.productoId] = 0
      saldoContabilidad[detalle.productoId] += Number(detalle?.cantidadDevolver || 0) * Number(detalle?.costoPromedio || 0) */
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
      newProductoPorAlmacen.push({
        productoId: new ObjectId(detalle.productoId),
        movimientoId: devolucion.insertedId,
        cantidad: Number(detalle.cantidadDevolver),
        almacenId: new ObjectId(almacenDevolucion._id),
        almacenOrigen: new ObjectId(detalle.almacen._id),
        almacenDestino: new ObjectId(almacenDevolucion._id),
        tipo: 'devolucion',
        tipoMovimiento: 'entrada',
        tipoAuditoria: 'faltante',
        lote: detalle.lote,
        fechaVencimiento: moment(detalle.fechaVencimientoLote).toDate(),
        fechaIngreso: moment(detalle.fechaIngresoLote).toDate(),
        fechaMovimiento: moment(fecha).toDate(),
        costoUnitario: detalle.costoUnitario,
        costoPromedio: detalle.costoPromedio,
        creadoPor: new ObjectId(req.uid)
      }, {
        productoId: new ObjectId(detalle.productoId),
        movimientoId: devolucion.insertedId,
        cantidad: Number(detalle.cantidadDevolver),
        almacenId: new ObjectId(detalle.almacen._id),
        almacenOrigen: new ObjectId(detalle.almacen._id),
        almacenDestino: new ObjectId(almacenDevolucion._id),
        tipo: 'devolucion',
        tipoMovimiento: 'salida',
        lote: detalle.lote,
        fechaVencimiento: moment(detalle.fechaVencimientoLote).toDate(),
        fechaIngreso: moment(detalle.fechaIngresoLote).toDate(),
        fechaMovimiento: moment(fecha).toDate(),
        costoUnitario: detalle.costoUnitario,
        costoPromedio: detalle.costoPromedio,
        creadoPor: new ObjectId(req.uid)
      })
    }
    console.log({ cantidadDevueltaProducto, detalleNewMovimiento, updateProductoPorAlmacenDevolucion, newProductoPorAlmacen })
    // const tieneContabilidad = await hasContabilidad({ clienteId })
    /* if (tieneContabilidad) {
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
    } */
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
        idMovimiento: new ObjectId(movimientoRecepcion),
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
    return res.status(500).json({ error: 'Error de servidor al momento de craar esta devolución ' + e.message })
  }
}
export const deleteImgMovimiento = async (req, res) => {
  const { clienteId, movimientoId, imgId } = req.body
  try {
    await updateItemSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(movimientoId) },
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

export const addImagenMovimiento = async (req, res) => {
  const { clienteId, movimientoId } = req.body
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
      const itemsAnterior = (await getItemSD({ nameCollection: 'movimientos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(movimientoId) } })).documentosAdjuntos
      if (itemsAnterior) {
        documentosAdjuntos.push(...itemsAnterior)
      }
      const movimiento = await updateItemSD({
        nameCollection: 'movimientos',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(movimientoId) },
        update: { $set: { documentosAdjuntos } }
      })
      return res.status(200).json({ status: 'Imagenes guardada exitosamente', movimiento })
    }
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar las imagenes del almacen ' + e.message })
  }
}
