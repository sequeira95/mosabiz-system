import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, createManyItemsSD, deleteItemSD, formatCollectionName, getCollectionSD, getItemSD, updateItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { subDominioName } from '../../constants.js'
import moment from 'moment'
import { hasContabilidad } from '../../utils/hasContabilidad.js'

export const getProductos = async (req, res) => {
  const { clienteId, almacenOrigen } = req.body
  try {
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
    const ivaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'iva' })
    const matchAlmacen = almacenOrigen ? { almacenId: new ObjectId(almacenOrigen) } : {}
    const productos = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      pipeline: [
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
              { $match: { ...matchAlmacen } },
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
            cantidad: '$detalleCantidadProducto.cantidad',
            entrada: '$detalleCantidadProducto.entrada',
            salida: '$detalleCantidadProducto.salida',
            moneda: '$moneda',
            isExento: '$isExento',
            precioVenta: '$precioVenta',
            ivaId: '$iva',
            iva: '$detalleIva.iva'
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
            fechaMovimiento: moment().toDate(),
            creadoPor: new ObjectId(req.uid)
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
  const { clienteId, productoId, almacen, cantidad, costoUnitario, tipo, periodoId } = req.body
  const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
  const tieneContabilidad = await hasContabilidad({ clienteId })
  if (tieneContabilidad) {
    if (ajusteInventario && !ajusteInventario.codigoComprobanteAjuste) return res.status(400).json({ error: 'No existe enm ajuste el codigo del comprobante para realizar ajuste' })
  }
  if (tipo === 'Ingreso') {
    await createItemSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      item: {
        productoId: new ObjectId(productoId),
        almacenId: new ObjectId(almacen._id),
        cantidad: Number(cantidad),
        costoUnitario: Number(costoUnitario),
        tipoMovimiento: 'entrada',
        tipo: 'ajuste',
        almacenDestino: new ObjectId(almacen._id),
        creadoPor: new ObjectId(req.uid)
      }
    })
    if (tieneContabilidad) {
      // aquí va la contabilidad preguntar en que comprobante iria el ajuste
      // const perido = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(periodoId) } })
      const mesPeriodo = moment().format('YYYY/MM')
      let comprobante = await getItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: ajusteInventario.codigoComprobanteAjuste, periodoId: new ObjectId(periodoId), mesPeriodo }
      })
      if (!comprobante) {
        comprobante = await upsertItemSD({
          nameCollection: 'comprobantes',
          enviromentClienteId: clienteId,
          filters: { codigo: ajusteInventario.codigoComprobanteAjuste, periodoId: new ObjectId(periodoId), mesPeriodo },
          update: {
            $set: {
              nombre: 'Ajuste de inventario',
              isBloqueado: false,
              fechaCreacion: moment().toDate()
            }
          }
        })
      }
      const categoriasPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorAlmacen' })
      const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
      const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
      const dataParaDetalle = await agreggateCollectionsSD({
        nameCollection: 'productos',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { _id: new ObjectId(productoId) } },
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
              from: categoriasPorAlmacenCollection,
              localField: 'categoria',
              foreignField: 'categoriaId',
              as: 'detalleCategoriaPorAlmacen'
            }
          },
          { $unwind: { path: '$detalleCategoriaPorAlmacen', preserveNullAndEmptyArrays: true } },
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
              nombre: '$nombre',
              codigo: '$codigo',
              categoriaId: '$categoria',
              categoria: '$detalleCategoria.nombre',
              cuentaId: '$detalleCuenta._id',
              cuentaNombre: '$detalleCuenta.descripcion',
              cuentaCodigo: '$detalleCuenta.codigo'
            }
          }
        ]
      })
      /* const producto = await getItemSD({ nameCollection: 'productos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(productoId) } })
      const cuentaPorAlmacen = await getItemSD({
        nameCollection: 'categoriaPorAlmacen',
        enviromentClienteId: clienteId,
        filters: { almacenId: new ObjectId(almacen._id), categoriaId: producto.categoria }
      }) */
      const cuentaAjuste = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: ajusteInventario.cuentaUtilidadAjusteInventario } })
      const detalleComprobante = [
        {
          cuentaId: dataParaDetalle[0].cuentaId,
          cuentaCodigo: dataParaDetalle[0].cuentaCodigo,
          cuentaNombre: dataParaDetalle[0].cuentaNombre,
          comprobanteId: comprobante._id,
          periodoId: new ObjectId(periodoId),
          descripcion: `Ajuste de inventario ${dataParaDetalle[0].nombre} ${dataParaDetalle[0].categoria}`,
          fecha: moment().toDate(),
          debe: Number(cantidad) * Number(costoUnitario),
          haber: 0,
          fechaCreacion: moment().toDate(),
          docReferenciaAux: 'AJUSTE',
          documento: {
            docReferencia: 'AJUSTE',
            docFecha: moment().toDate()
          }
        },
        {
          cuentaId: cuentaAjuste._id,
          cuentaCodigo: cuentaAjuste.codigo,
          cuentaNombre: cuentaAjuste.descripcion,
          comprobanteId: comprobante._id,
          periodoId: new ObjectId(periodoId),
          descripcion: `Ajuste de inventario ${dataParaDetalle[0].nombre} ${dataParaDetalle[0].categoria}`,
          fecha: moment().toDate(),
          debe: 0,
          haber: Number(cantidad) * Number(costoUnitario),
          fechaCreacion: moment().toDate(),
          docReferenciaAux: 'AJUSTE',
          documento: {
            docReferencia: 'AJUSTE',
            docFecha: moment().toDate()
          }
        }
      ]
      createManyItemsSD({
        nameCollection: 'detalleComprobantes',
        enviromentClienteId: clienteId,
        items: detalleComprobante
      })
    }
    return res.status(200).json({ status: 'Ajuste guardado exitosamente' })
  }
  if (tipo === 'Salida') {
    await createItemSD({
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
    if (tieneContabilidad) {
      // aquí va la contabilidad preguntar en que comprobante iria el ajuste
      // const perido = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(periodoId) } })
      const mesPeriodo = moment().format('YYYY/MM')
      let comprobante = await getItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: ajusteInventario.codigoComprobanteAjuste, periodoId: new ObjectId(periodoId), mesPeriodo }
      })
      if (!comprobante) {
        comprobante = await upsertItemSD({
          nameCollection: 'comprobantes',
          enviromentClienteId: clienteId,
          filters: { codigo: ajusteInventario.codigoComprobanteAjuste, periodoId: new ObjectId(periodoId), mesPeriodo },
          update: {
            $set: {
              nombre: 'Ajuste de inventario',
              isBloqueado: false,
              fechaCreacion: moment().toDate()
            }
          }
        })
      }
      const categoriasPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorAlmacen' })
      const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
      const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
      const dataParaDetalle = await agreggateCollectionsSD({
        nameCollection: 'productos',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { _id: new ObjectId(productoId) } },
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
              from: categoriasPorAlmacenCollection,
              localField: 'categoria',
              foreignField: 'categoriaId',
              as: 'detalleCategoriaPorAlmacen'
            }
          },
          { $unwind: { path: '$detalleCategoriaPorAlmacen', preserveNullAndEmptyArrays: true } },
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
              nombre: '$nombre',
              codigo: '$codigo',
              categoriaId: '$categoria',
              categoria: '$detalleCategoria.nombre',
              cuentaId: '$detalleCuenta._id',
              cuentaNombre: '$detalleCuenta.descripcion',
              cuentaCodigo: '$detalleCuenta.codigo'
            }
          }
        ]
      })
      /* const producto = await getItemSD({ nameCollection: 'productos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(productoId) } })
      const cuentaPorAlmacen = await getItemSD({
        nameCollection: 'categoriaPorAlmacen',
        enviromentClienteId: clienteId,
        filters: { almacenId: new ObjectId(almacen._id), categoriaId: producto.categoria }
      }) */
      const cuentaAjuste = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: ajusteInventario.cuentaPerdidasAjusteInventario } })
      const detalleComprobante = [
        {
          cuentaId: cuentaAjuste._id,
          cuentaCodigo: cuentaAjuste.codigo,
          cuentaNombre: cuentaAjuste.descripcion,
          comprobanteId: comprobante._id,
          periodoId: new ObjectId(periodoId),
          descripcion: `Ajuste de inventario ${dataParaDetalle[0].nombre} ${dataParaDetalle[0].categoria}`,
          fecha: moment().toDate(),
          debe: Number(cantidad) * Number(costoUnitario),
          haber: 0,
          fechaCreacion: moment().toDate(),
          docReferenciaAux: 'AJUSTE',
          documento: {
            docReferencia: 'AJUSTE',
            docFecha: moment().toDate()
          }
        },
        {
          cuentaId: dataParaDetalle[0].cuentaId,
          cuentaCodigo: dataParaDetalle[0].cuentaCodigo,
          cuentaNombre: dataParaDetalle[0].cuentaNombre,
          comprobanteId: comprobante._id,
          periodoId: new ObjectId(periodoId),
          descripcion: `Ajuste de inventario ${dataParaDetalle[0].nombre} ${dataParaDetalle[0].categoria}`,
          fecha: moment().toDate(),
          debe: 0,
          haber: Number(cantidad) * Number(costoUnitario),
          fechaCreacion: moment().toDate(),
          docReferenciaAux: 'AJUSTE',
          documento: {
            docReferencia: 'AJUSTE',
            docFecha: moment().toDate()
          }
        }
      ]
      createManyItemsSD({
        nameCollection: 'detalleComprobantes',
        enviromentClienteId: clienteId,
        items: detalleComprobante
      })
    }
    return res.status(200).json({ status: 'Ajuste guardado exitosamente' })
  }
}
export const saveProductosVentas = async (req, res) => {
  const { nombre, descripcion, unidad, categoriaVentas, observacion, clienteId, _id, moneda, isExento, precioVenta, iva } = req.body
  console.log(req.body, 1)
  try {
    const producto = await updateItemSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          nombre,
          descripcion,
          unidad,
          categoria: new ObjectId(categoriaVentas),
          moneda: new ObjectId(moneda),
          isExento,
          precioVenta: Number(precioVenta),
          iva: iva ? new ObjectId(iva) : null,
          observacion
        }
      }
    })
    return res.status(200).json({ status: 'Producto guardado exitosamente', producto })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el producto ' + e.message })
  }
}
export const updatePrecioProducto = async (req, res) => {
  const { clienteId, _id, utilidad, descuento } = req.body
  try {
    const productos = await getCollectionSD({ nameCollection: 'inventario', enviromentClienteId: clienteId, filters: { categoria: new ObjectId(_id) } })
    const productosBulkWrite = []
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de actualizar los productos ' + e.message })
  }
}
