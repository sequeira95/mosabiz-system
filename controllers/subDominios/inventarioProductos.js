import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, createManyItemsSD, deleteItemSD, formatCollectionName, getItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { subDominioName } from '../../constants.js'
import moment from 'moment'
import { hasContabilidad } from '../../utils/hasContabilidad.js'

export const getProductos = async (req, res) => {
  const { clienteId, almacenOrigen } = req.body
  try {
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
    const matchAlmacen = almacenOrigen ? { almacenId: new ObjectId(almacenOrigen) } : {}
    const productos = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
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
            from: productorPorAlamcenCollection,
            localField: '_id',
            foreignField: 'productoId',
            pipeline: [
              { $match: { ...matchAlmacen } },
              {
                $group: {
                  _id: '$tipoMovimiento',
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
            observacion: '$observacion',
            cantidad: '$detalleCantidadProducto.cantidad',
            entrada: '$detalleCantidadProducto.entrada',
            salida: '$detalleCantidadProducto.salida'
          }
        },
        { $match: { cantidad: { $gt: 0 } } }
      ]
    })
    console.log(productos)
    return res.status(200).json({ productos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtner datos de los productos' + e.message })
  }
}
export const saveProducto = async (req, res) => {
  const { codigo, nombre, descripcion, unidad, categoria, observacion, clienteId, _id, cantidadPorAlmacen } = req.body
  try {
    if (!_id) {
      const verify = await getItemSD({
        nameCollection: 'productos',
        enviromentClienteId: clienteId,
        filters: {
          codigo,
          nombre
        }
      })
      if (verify) return res.status(400).json({ error: 'Ya existe un producto con este código y nombre' })
    }
    const producto = await upsertItemSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          codigo,
          nombre,
          descripcion,
          unidad,
          categoria: new ObjectId(categoria),
          observacion
        }
      }
    })
    if (!_id) {
      if (cantidadPorAlmacen[0]) {
        const datosParaAlmacen = cantidadPorAlmacen.map(e => {
          return {
            cantidad: Number(e.cantidad),
            almacenDestino: e.almacen._id ? new ObjectId(e.almacen._id) : null,
            almacenDestinoNombre: e.almacen._id ? e.almacen.nombre : null,
            almacenId: e.almacen._id ? new ObjectId(e.almacen._id) : null,
            // almacenOrigen: e.almacen._id ? new ObjectId(e.almacen._id) : null,
            // almacenOrigenNombre: e.almacen._id ? e.almacen.nombre : null,
            tipo: 'inicial',
            tipoMovimiento: 'entrada',
            productoId: producto._id,
            costoUnitario: Number(e.costoUnitario),
            fechaMovimiento: moment().toDate()
          }
        })
        createManyItemsSD({ nameCollection: 'productosPorAlmacen', enviromentClienteId: clienteId, items: datosParaAlmacen })
      }
    }
    return res.status(200).json({ status: 'Producto guardado exitosamente', producto })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el producto ' + e.message })
  }
}
export const deleteProducto = async (req, res) => {
  const { _id, clienteId } = req.body
  try {
    await deleteItemSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) }
    })
    return res.status(200).json({ status: 'Producto eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar el producto ' + e.message })
  }
}
export const saveToArray = async (req, res) => {
  const { clienteId, productos } = req.body
  try {
    if (!productos[0]) return res.status(400).json({ error: 'Hubo un error al momento de procesar la lista de productos' })
    const bulkWrite = productos.map(e => {
      return {
        updateOne: {
          filter: { nombre: e.nombre, codigo: e.codigo },
          update: {
            $set: {
              descripcion: e.descripcion,
              unidad: e.unidad,
              categoria: e.categoria ? new ObjectId(e.categoria) : null,
              observacion: e.observacion
            }
          },
          upsert: true
        }
      }
    })
    await bulkWriteSD({ nameCollection: 'productos', enviromentClienteId: clienteId, pipeline: bulkWrite })
    return res.status(200).json({ status: 'Productos guardados exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar los productos ' + e.message })
  }
}
export const getDetalleCantidad = async (req, res) => {
  const { clienteId, productoId } = req.body
  try {
    const almacenesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const cantidadPorALmacen = await agreggateCollectionsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { productoId: new ObjectId(productoId) } },
        {
          $group: {
            _id: '$almacenId',
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
            from: almacenesCollection,
            localField: '_id',
            foreignField: '_id',
            as: 'detalleAlmacen'
          }
        },
        { $unwind: { path: '$detalleAlmacen', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            cantidad: { $subtract: ['$entrada', '$salida'] },
            almacenNombre: '$detalleAlmacen.nombre',
            entrada: '$entrada',
            salida: '$salida'
          }
        }
      ]
    })
    return res.status(200).json({ cantidadPorALmacen })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtner el detalle del producto' + e.message })
  }
}
export const getListCostos = async (req, res) => {
  const { clienteId, productoId, almacenId } = req.body
  try {
    const costosPorAlmacen = await agreggateCollectionsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { productoId: new ObjectId(productoId), almacenId: new ObjectId(almacenId) } },
        {
          $group: {
            _id: '$costoUnitario',
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
            costosUnitarios: '$_id'
          }
        }
      ]
    })
    return res.status(200).json({ costosPorAlmacen })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtner la listas de costos del almacen' + e.message })
  }
}
export const saveAjusteAlmacen = async (req, res) => {
  const { clienteId, productoId, almacen, cantidad, costoUnitario, tipo } = req.body
  if (tipo === 'Ingreso') {
    const newMovimiento = await createItemSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      item: {
        productoId: new ObjectId(productoId),
        almacenId: new ObjectId(almacen._id),
        cantidad: Number(cantidad),
        costoUnitario: Number(costoUnitario),
        tipoMovimiento: 'entrada',
        tipo: 'ajuste',
        almacenDestino: new ObjectId(almacen._id)
      }
    })
    if (await hasContabilidad({ clienteId })) {
      // aquí va la contabilidad preguntar en que comprobante iria el ajuste
    }
    return res.status(200).json({ status: 'Ajuste guardado exitosamente' })
  }
  if (tipo === 'Salida') {
    const newMovimiento = await createItemSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      item: {
        productoId: new ObjectId(productoId),
        almacenId: new ObjectId(almacen._id),
        cantidad: Number(cantidad),
        costoUnitario: Number(costoUnitario.costosUnitarios),
        tipoMovimiento: 'salida',
        tipo: 'ajuste',
        almacenOrigen: new ObjectId(almacen._id)
      }
    })
    if (await hasContabilidad({ clienteId })) {
      // aquí va la contabilidad preguntar en que comprobante iria el ajuste
    }
    return res.status(200).json({ status: 'Ajuste guardado exitosamente' })
  }
}
