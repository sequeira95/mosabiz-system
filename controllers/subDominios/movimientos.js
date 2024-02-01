import moment from 'moment'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, createManyItemsSD, formatCollectionName, getItemSD, updateItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'
import { subDominioName } from '../../constants.js'
export const getDataMovimientos = async (req, res) => {
  const { clienteId, estado } = req.body
  try {
    const detalleMovimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleMovimientos' })
    const zonaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonas' })
    const almacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const movimientos = await agreggateCollectionsSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { estado } },
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
export const createMovimientos = async (req, res) => {
  const { clienteId, movimiento, estado, detalleMovimiento } = req.body
  try {
    let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'movimiento' } }))?.contador
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
        descripcion: `Movimiento N° ${contador} creado`,
        creadoPor: new ObjectId(req.uid)
      }
    })
    upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'movimiento' }, update: { $set: { contador } } })
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
    }
    await updateItemSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: { $set: { estado, ...updateMovimiento } }
    })
    let descripcion = ''
    if (estado === 'recepcionPendiente') {
      descripcion = 'Cambió estado a pendiente por recibir'
      updateMovimientoSalida({ detalleMovimientos, almacenOrigen, almacenDestino, clienteId })
    }
    if (estado === 'recibido') {
      descripcion = 'Cambió estado a recibido'
      updateMovimientoEntrada({ detalleMovimientos, almacenOrigen, almacenDestino, clienteId })
    }
    if (estado === 'recibido') {
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
    createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        creadoPor: new ObjectId(req.uid),
        idMovimiento: new ObjectId(movimientoId),
        categoria: 'editado',
        tipo: 'Movimiento',
        fecha: moment().toDate(),
        descripcion: `Movimiento ${movimiento.movimiento} cancelado`
      }
    })
    return res.status(200).json({ status: 'Movimiento cancelado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de cancelar el movimiento ' + e.message })
  }
}
const updateMovimientoSalida = async ({ detalleMovimientos, almacenOrigen, almacenDestino, clienteId }) => {
  // console.log({ detalleMovimientos, almacenOrigen, almacenDestino })
  const detallesCrear = []
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
              fechaMovimiento: '$fechaMovimiento'
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
            fechaMovimiento: '$_id.fechaMovimiento',
            cantidad: { $subtract: ['$entrada', '$salida'] } // cantidad de producto en el almacen de origen
          }
        },
        { $sort: { fechaMovimiento: 1 } }
      ]
    })
    console.log({ datosMovivientoPorProducto })
    for (const movimientos of datosMovivientoPorProducto) {
      if (detalle.cantidad === 0) break
      if (detalle.cantidad >= movimientos.cantidad) {
        detallesCrear.push({
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(movimientos.cantidad),
          almacenId: new ObjectId(almacenOrigen._id),
          almacenOrigen: new ObjectId(almacenOrigen._id),
          almacenDestino: new ObjectId(almacenDestino._id),
          tipo: 'movimiento',
          tipoMovimiento: 'salida',
          fechaMovimiento: moment().toDate(),
          costoUnitario: movimientos.costoUnitario
        })
        detalle.cantidad -= movimientos.cantidad
        continue
      }
      if (detalle.cantidad < movimientos.cantidad) {
        detallesCrear.push({
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(detalle.cantidad),
          almacenId: new ObjectId(almacenOrigen._id),
          almacenOrigen: new ObjectId(almacenOrigen._id),
          almacenDestino: new ObjectId(almacenDestino._id),
          tipo: 'movimiento',
          tipoMovimiento: 'salida',
          fechaMovimiento: moment().toDate(),
          costoUnitario: movimientos.costoUnitario
        })
        detalle.cantidad = 0
        break
      }
    }
  }
  createManyItemsSD({
    nameCollection: 'productosPorAlmacen',
    enviromentClienteId: clienteId,
    items: detallesCrear
  })
}
const updateMovimientoEntrada = async ({ detalleMovimientos, almacenOrigen, almacenDestino, clienteId }) => {
  const detallesCrear = []
  for (const detalle of detalleMovimientos) {
    console.log(detalle)
    const detallesMovimientosPorProducto = await agreggateCollectionsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { productoId: new ObjectId(detalle.productoId), movimientoId: new ObjectId(detalle.movimientoId), tipoMovimiento: 'salida' } }
      ]
    })
    for (const movimientos of detallesMovimientosPorProducto) {
      if (detalle.cantidadRecibido === 0) break
      if (detalle.cantidadRecibido >= movimientos.cantidad) {
        detallesCrear.push({
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(movimientos.cantidad),
          almacenId: new ObjectId(almacenDestino._id),
          almacenOrigen: new ObjectId(almacenOrigen._id),
          almacenDestino: new ObjectId(almacenDestino._id),
          tipo: 'movimiento',
          tipoMovimiento: 'entrada',
          fechaMovimiento: moment().toDate(),
          costoUnitario: movimientos.costoUnitario
        })
        detalle.cantidadRecibido -= movimientos.cantidad
        continue
      }
      if (detalle.cantidadRecibido < movimientos.cantidad) {
        detallesCrear.push({
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(detalle.cantidadRecibido),
          almacenId: new ObjectId(almacenDestino._id),
          almacenOrigen: new ObjectId(almacenOrigen._id),
          almacenDestino: new ObjectId(almacenDestino._id),
          tipo: 'movimiento',
          tipoMovimiento: 'entrada',
          fechaMovimiento: moment().toDate(),
          costoUnitario: movimientos.costoUnitario
        })
        detalle.cantidadRecibido = 0
        break
      }
    }
    console.log({ detallesMovimientosPorProducto })
  }
  createManyItemsSD({
    nameCollection: 'productosPorAlmacen',
    enviromentClienteId: clienteId,
    items: detallesCrear
  })
}
