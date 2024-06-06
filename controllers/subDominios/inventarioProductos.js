import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, createManyItemsSD, formatCollectionName, getCollectionSD, getItemSD, updateItemSD, updateManyItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { subDominioName } from '../../constants.js'
import moment from 'moment'
import { hasContabilidad, validAjustesContablesForAjusteProducto, validUpdateCostoPorLoteProducto } from '../../utils/hasContabilidad.js'
// import { hasContabilidad } from '../../utils/hasContabilidad.js'

export const getProductos = async (req, res) => {
  const { clienteId, almacenOrigen } = req.body
  try {
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
    const ivaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'iva' })
    const matchAlmacen = almacenOrigen ? { almacenId: new ObjectId(almacenOrigen) } : {}
    const alamcenesInvalid = await getCollectionSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Auditoria'] } } })
    const productos = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { activo: { $ne: false } } },
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
              { $match: { ...matchAlmacen, almacenId: { $nin: [null, ...alamcenesInvalid.map(e => e._id)] } } },
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
        }
        // { $match: { cantidad: { $gte: 0 } } }
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
  const { codigo, nombre, descripcion, unidad, categoria, observacion, clienteId, _id } = req.body
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
    return res.status(200).json({ status: 'Producto guardado exitosamente', producto })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el producto ' + e.message })
  }
}
export const deleteProducto = async (req, res) => {
  const { _id, clienteId } = req.body
  try {
    await updateItemSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          activo: false
        }
      }
    })
    /* await deleteItemSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) }
    }) */
    return res.status(200).json({ status: 'Producto desactivado exitosamente' })
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
    const alamcenesInvalid = await getCollectionSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Auditoria'] } } })
    const almacenesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const cantidadPorALmacen = await agreggateCollectionsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { productoId: new ObjectId(productoId), almacenId: { $nin: [null, ...alamcenesInvalid.map(e => e._id)] } } },
        {
          $group: {
            _id: {
              almacenId: '$almacenId',
              lote: '$lote'
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
          $addFields: {
            matchCantidad: { $subtract: ['$entrada', '$salida'] }
          }
        },
        { $match: { matchCantidad: { $gt: 0 } } },
        {
          $group: {
            _id: '$_id.almacenId',
            entrada: { $sum: '$entrada' },
            salida: { $sum: '$salida' },
            lotes: { $sum: 1 }
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
            salida: '$salida',
            lotes: '$lotes'
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
            _id: {
              costoUnitario: '$costoUnitario',
              lote: '$lote',
              fechaIngreso: '$fechaIngreso',
              fechaVencimiento: '$fechaVencimiento'
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
            cantidad: { $subtract: ['$entrada', '$salida'] },
            costoUnitario: '$_id.costoUnitario',
            fechaIngreso: '$_id.fechaIngreso',
            fechaVencimiento: '$_id.fechaVencimiento',
            lote: '$_id.lote'
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
  const { clienteId, productoId, almacen, cantidad, costoUnitario, tipo, lote, fechaAjuste, fechaVencimiento, fechaIngreso } = req.body
  console.log({ body: req.body })
  if (tipo === 'Ingreso') {
    const validProductoPorAlmacen = await getItemSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      filters: { productoId: new ObjectId(productoId), lote }
    })
    if (validProductoPorAlmacen) return res.status(400).json({ error: 'Ya existe el lote en este producto.' })
  }
  // console.log(req.body)
  const tieneContabilidad = await hasContabilidad({ clienteId })
  const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
  if (tieneContabilidad) {
    const validContabilidad = await validAjustesContablesForAjusteProducto({ clienteId, tipo, productoId, almacen })
    if (validContabilidad && validContabilidad.message) {
      return res.status(500).json({ error: 'Error al momento de validar información contable: ' + validContabilidad.message })
    }
  }
  // const fechaAjusteFormat = moment(fechaAjuste, configuacionFecha || 'YYYY/MM/DD').toDate()
  // const fechaVencimientoFormat = moment(fechaVencimiento, configuacionFecha || 'YYYY/MM/DD').toDate()
  let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'ajuste' } }))?.contador
  if (contador) ++contador
  if (!contador) contador = 1
  const producto = await getItemSD({ nameCollection: 'productos', enviromentClienteId: clienteId, filters: new ObjectId(productoId) })
  if (tipo === 'Ingreso') {
    const movimiento = await createItemSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      item: {
        fecha: moment(fechaAjuste).toDate(),
        fechaVencimiento: moment(fechaVencimiento).toDate(),
        tipo: 'Ajuste',
        almacenOrigen: null,
        almacenDestino: new ObjectId(almacen._id) || null,
        zona: null,
        numeroMovimiento: contador,
        creadoPor: new ObjectId(req.uid)
      }
    })
    createItemSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      item: {
        productoId: new ObjectId(productoId),
        almacenId: new ObjectId(almacen._id),
        cantidad: Number(cantidad),
        costoUnitario: Number(costoUnitario),
        movimientoId: movimiento.insertedId,
        tipoMovimiento: 'entrada',
        tipo: 'ajuste',
        lote,
        fechaIngreso: moment(fechaIngreso).toDate(),
        fechaVencimiento: moment(fechaVencimiento).toDate(),
        fechaMovimiento: moment(fechaAjuste).toDate(),
        almacenDestino: new ObjectId(almacen._id),
        creadoPor: new ObjectId(req.uid),
        fechaCreacion: moment().toDate()
      }
    })
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
    if (tieneContabilidad) {
      // aquí va la contabilidad preguntar en que comprobante iria el ajuste
      const perido = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fechaAjuste).toDate() }, fechaFin: { $gte: moment(fechaAjuste).toDate() } } })
      const mesPeriodo = moment(fechaAjuste).format('YYYY/MM')
      let comprobante = await getItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: ajusteInventario.codigoComprobanteAjuste, periodoId: perido._id, mesPeriodo }
      })
      if (!comprobante) {
        comprobante = await upsertItemSD({
          nameCollection: 'comprobantes',
          enviromentClienteId: clienteId,
          filters: { codigo: ajusteInventario.codigoComprobanteAjuste, periodoId: perido._id, mesPeriodo },
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
              pipeline: [
                { $match: { almacenId: new ObjectId(almacen._id) } }
              ],
              as: 'detalleCategoriaPorAlmacen'
            }
          },
          { $unwind: { path: '$detalleCategoriaPorAlmacen', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: planCuentaCollection,
              localField: 'detalleCategoriaPorAlmacen.cuentaId',
              foreignField: '_id',
              as: 'detalleCuenta'
            }
          },
          { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              nombre: '$nombre',
              codigo: '$codigo',
              descripcion: '$descripcion',
              unidad: '$unidad',
              categoriaId: '$categoria',
              observacion: '$observacion',
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
      // console.log({ dataParaDetalle })
      const cuentaAjuste = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: ajusteInventario.cuentaUtilidadAjusteInventario } })
      const detalleComprobante = [
        {
          cuentaId: dataParaDetalle[0].cuentaId,
          cuentaCodigo: dataParaDetalle[0].cuentaCodigo,
          cuentaNombre: dataParaDetalle[0].cuentaNombre,
          comprobanteId: comprobante._id,
          periodoId: perido._id,
          descripcion: `Ajuste #${contador} de inventario ${dataParaDetalle[0].nombre} ${dataParaDetalle[0].categoria}`,
          fecha: moment(fechaAjuste).toDate(),
          debe: Number(cantidad) * Number(costoUnitario),
          haber: 0,
          fechaCreacion: moment().toDate(),
          docReferenciaAux: `MOV-AJ-${contador}`,
          documento: {
            docReferencia: `MOV-AJ-${contador}`,
            docFecha: moment(fechaAjuste).toDate()
          }
        },
        {
          cuentaId: cuentaAjuste._id,
          cuentaCodigo: cuentaAjuste.codigo,
          cuentaNombre: cuentaAjuste.descripcion,
          comprobanteId: comprobante._id,
          periodoId: perido._id,
          descripcion: `Ajuste #${contador} de inventario ${dataParaDetalle[0].nombre} ${dataParaDetalle[0].categoria}`,
          fecha: moment(fechaAjuste).toDate(),
          debe: 0,
          haber: Number(cantidad) * Number(costoUnitario),
          fechaCreacion: moment().toDate(),
          docReferenciaAux: `MOV-AJ-${contador}`,
          documento: {
            docReferencia: `MOV-AJ-${contador}`,
            docFecha: moment(fechaAjuste).toDate()
          }
        }
      ]
      createManyItemsSD({
        nameCollection: 'detallesComprobantes',
        enviromentClienteId: clienteId,
        items: detalleComprobante
      })
    }
    upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'ajuste' }, update: { $set: { contador } } })
    return res.status(200).json({ status: 'Ajuste guardado exitosamente' })
  }
  if (tipo === 'Salida') {
    const movimiento = await createItemSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      item: {
        fecha: moment(fechaAjuste).toDate(),
        fechaVencimiento: moment(fechaVencimiento).toDate(),
        tipo: 'Ajuste',
        almacenOrigen: null,
        almacenDestino: new ObjectId(almacen._id) || null,
        zona: null,
        numeroMovimiento: contador
      }
    })
    await createItemSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      item: {
        productoId: new ObjectId(productoId),
        almacenId: new ObjectId(almacen._id),
        movimientoId: movimiento.insertedId,
        cantidad: Number(cantidad),
        costoUnitario: Number(costoUnitario),
        tipoMovimiento: 'salida',
        tipo: 'ajuste',
        lote: lote.lote,
        fechaIngreso: moment(fechaIngreso).toDate(),
        fechaVencimiento: moment(fechaVencimiento).toDate(),
        fechaMovimiento: moment(fechaAjuste).toDate(),
        almacenOrigen: new ObjectId(almacen._id),
        creadoPor: new ObjectId(req.uid),
        fechaCreacion: moment().toDate()
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
      // aquí va la contabilidad preguntar en que comprobante iria el ajuste
      const perido = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fechaAjuste).toDate() }, fechaFin: { $gte: moment(fechaAjuste).toDate() } } })
      const mesPeriodo = moment(fechaAjuste).format('YYYY/MM')
      let comprobante = await getItemSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        filters: { codigo: ajusteInventario.codigoComprobanteAjuste, periodoId: perido._id, mesPeriodo }
      })
      if (!comprobante) {
        comprobante = await upsertItemSD({
          nameCollection: 'comprobantes',
          enviromentClienteId: clienteId,
          filters: { codigo: ajusteInventario.codigoComprobanteAjuste, periodoId: perido._id, mesPeriodo },
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
              pipeline: [
                { $match: { almacenId: new ObjectId(almacen._id) } }
              ],
              as: 'detalleCategoriaPorAlmacen'
            }
          },
          { $unwind: { path: '$detalleCategoriaPorAlmacen', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: planCuentaCollection,
              localField: 'detalleCategoriaPorAlmacen.cuentaId',
              foreignField: '_id',
              as: 'detalleCuenta'
            }
          },
          { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              nombre: '$nombre',
              codigo: '$codigo',
              descripcion: '$descripcion',
              unidad: '$unidad',
              categoriaId: '$categoria',
              observacion: '$observacion',
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
          periodoId: perido._id,
          descripcion: `Ajuste #${contador} de inventario ${dataParaDetalle[0].nombre} ${dataParaDetalle[0].categoria}`,
          fecha: moment(fechaAjuste).toDate(),
          debe: Number(cantidad) * Number(costoUnitario),
          haber: 0,
          fechaCreacion: moment().toDate(),
          docReferenciaAux: `MOV-AJ-${contador}`,
          documento: {
            docReferencia: `MOV-AJ-${contador}`,
            docFecha: moment(fechaAjuste).toDate()
          }
        },
        {
          cuentaId: dataParaDetalle[0].cuentaId,
          cuentaCodigo: dataParaDetalle[0].cuentaCodigo,
          cuentaNombre: dataParaDetalle[0].cuentaNombre,
          comprobanteId: comprobante._id,
          periodoId: perido._id,
          descripcion: `Ajuste #${contador} de inventario ${dataParaDetalle[0].nombre} ${dataParaDetalle[0].categoria}`,
          fecha: moment(fechaAjuste).toDate(),
          debe: 0,
          haber: Number(cantidad) * Number(costoUnitario),
          fechaCreacion: moment().toDate(),
          docReferenciaAux: `MOV-AJ-${contador}`,
          documento: {
            docReferencia: `MOV-AJ-${contador}`,
            docFecha: moment(fechaAjuste).toDate()
          }
        }
      ]
      createManyItemsSD({
        nameCollection: 'detallesComprobantes',
        enviromentClienteId: clienteId,
        items: detalleComprobante
      })
    }
    upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'ajuste' }, update: { $set: { contador } } })
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
export const saveDataInicial = async (req, res) => {
  const { clienteId, cantidadPorAlmacen, productoId } = req.body
  const datosParaAlmacen = []
  if (cantidadPorAlmacen[0]) {
    for (const cantidad of cantidadPorAlmacen) {
      const verifyLote = await getItemSD({
        nameCollection: 'productosPorAlmacen',
        enviromentClienteId: clienteId,
        filters: { productoId: new ObjectId(productoId), lote: cantidad.lote }
      })
      if (verifyLote) return res.status(400).json({ error: 'Ya se encuentra un lote con el mismo codigo guardado en este producto' })
      datosParaAlmacen.push({
        cantidad: Number(cantidad.cantidad),
        almacenDestino: cantidad.almacen._id ? new ObjectId(cantidad.almacen._id) : null,
        almacenDestinoNombre: cantidad.almacen._id ? cantidad.almacen.nombre : null,
        almacenId: cantidad.almacen._id ? new ObjectId(cantidad.almacen._id) : null,
        tipo: 'inicial',
        lote: cantidad.lote,
        tipoMovimiento: 'entrada',
        productoId: new ObjectId(productoId),
        fechaVencimiento: moment(cantidad.fechaVencimiento).toDate(),
        fechaIngreso: moment(cantidad.fechaIngreso).toDate(),
        costoUnitario: Number(cantidad.costoUnitario),
        fechaMovimiento: moment().toDate(),
        creadoPor: new ObjectId(req.uid)
      })
    }
    /* const datosParaAlmacen = cantidadPorAlmacen.map(e => {
      return {
        cantidad: Number(e.cantidad),
        almacenDestino: e.almacen._id ? new ObjectId(e.almacen._id) : null,
        almacenDestinoNombre: e.almacen._id ? e.almacen.nombre : null,
        almacenId: e.almacen._id ? new ObjectId(e.almacen._id) : null,
        tipo: 'inicial',
        lote: e.lote,
        tipoMovimiento: 'entrada',
        productoId: new ObjectId(productoId),
        fechaVencimiento: moment(e.fechaVencimiento).toDate(),
        fechaIngreso: moment(e.fechaIngreso).toDate(),
        costoUnitario: Number(e.costoUnitario),
        fechaMovimiento: moment().toDate(),
        creadoPor: new ObjectId(req.uid)
      }
    }) */
    await createManyItemsSD({ nameCollection: 'productosPorAlmacen', enviromentClienteId: clienteId, items: datosParaAlmacen })
  }
  return res.status(200).json({ status: 'Datos iniciales guardados exitosamente' })
}
export const updateCostoPorLote = async (req, res) => {
  const { clienteId, productoId, nuevoCostoUnitario, lote, tipoAjuste, fechaActual } = req.body
  console.log(req.body)
  const almacenAuditoria = await getItemSD({
    nameCollection: 'almacenes',
    enviromentClienteId: clienteId,
    filters: { nombre: 'Auditoria' }
  })
  try {
    const tieneContabilidad = hasContabilidad({ clienteId })
    if (tieneContabilidad) {
      const validContabilidad = await validUpdateCostoPorLoteProducto({ clienteId, productoId, lote })
      if (validContabilidad && validContabilidad.message) {
        return res.status(500).json({ error: 'Error al momento de validar información contable: ' + validContabilidad.message })
      }
    }
    const productosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productos' })
    const almacenesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const categoriaPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorAlmacen' })
    const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
    const datosMovivientoPorProducto = await agreggateCollectionsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { productoId: new ObjectId(productoId), lote, almacenId: { $ne: almacenAuditoria._id } } },
        {
          $group: {
            _id: {
              costoUnitario: '$costoUnitario',
              productoId: '$productoId',
              almacenId: '$almacenId'
            },
            lote: { $first: '$lote' },
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
          $lookup: {
            from: almacenesCollection,
            localField: '_id.almacenId',
            foreignField: '_id',
            as: 'detalleAlmacen'
          }
        },
        { $unwind: { path: '$detalleAlmacen', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: categoriaPorAlmacenCollection,
            let: { categoriaId: '$detalleProducto.categoria', almacenId: '$_id.almacenId' },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ['$categoriaId', '$$categoriaId'] }, { $eq: ['$almacenId', '$$almacenId'] }] } } },
              { $project: { cuentaId: 1 } }
            ],
            as: 'detalleCategoriaPorAlmacen'
          }
        },
        { $unwind: { path: '$detalleCategoriaPorAlmacen', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: planCuentaCollection,
            localField: 'detalleCategoriaPorAlmacen.cuentaId',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  descripcion: 1,
                  codigo: 1
                }
              }
            ],
            as: 'detalleCuenta'
          }
        },
        { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            lote: '$lote',
            costoUnitario: '$_id.costoUnitario',
            productoId: '$_id.productoId',
            almacenId: '$_id.almacenId',
            cantidad: { $subtract: ['$entrada', '$salida'] }, // cantidad de producto en el almacen de origen
            productoCategoria: '$detalleProducto.categoria',
            productoNombre: '$detalleProducto.nombre',
            cuentaId: '$detalleCuenta._id',
            cuentaNombre: '$detalleCuenta.descripcion',
            cuentaCodigo: '$detalleCuenta.codigo',
            almacenNombre: '$detalleAlmacen.nombre'
          }
        },
        { $match: { cantidad: { $gt: 0 } } }
      ]
    })
    const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
    const asientosContables = []
    if (tieneContabilidad) {
      const cuentaUtilidad = await getItemSD({
        nameCollection: 'planCuenta',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(ajusteInventario.cuentaUtilidadAjusteInventario) }
      })
      const cuentaPerdida = await getItemSD({
        nameCollection: 'planCuenta',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(ajusteInventario.cuentaPerdidasAjusteInventario) }
      })
      const periodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { fechaInicio: { $lte: moment(fechaActual).toDate() }, fechaFin: { $gte: moment(fechaActual).toDate() } } })
      const mesPeriodo = moment().format('YYYY/MM')
      let comprobante = await getItemSD({
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
        console.log(2, comprobante)
      }
      for (const movimiento of datosMovivientoPorProducto) {
        if (tipoAjuste === 'perdida') {
          const costoActual = Number(movimiento.costoUnitario) * Number(movimiento.cantidad)
          const nuevoCosto = Number(nuevoCostoUnitario) * Number(movimiento.cantidad)
          const diferencia = costoActual - nuevoCosto
          const asientos = [
            {
              cuentaId: cuentaPerdida._id,
              cuentaCodigo: cuentaPerdida.codigo,
              cuentaNombre: cuentaPerdida.descripcion,
              comprobanteId: comprobante._id,
              periodoId: periodo._id,
              descripcion: `Ajuste de costo ${movimiento.productoNombre} lote ${lote} en almacen ${movimiento.almacenNombre}`,
              fecha: moment(fechaActual).toDate(),
              debe: Number(diferencia),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: 'AJ-COSTO-PRODUCTO',
              documento: {
                docReferencia: 'AJ-COSTO-PRODUCTO',
                docFecha: moment(fechaActual).toDate()
              }
            },
            {
              cuentaId: movimiento.cuentaId,
              cuentaCodigo: movimiento.cuentaCodigo,
              cuentaNombre: movimiento.cuentaNombre,
              comprobanteId: comprobante._id,
              periodoId: periodo._id,
              descripcion: `Ajuste de costo ${movimiento.productoNombre} lote ${lote} en almacen ${movimiento.almacenNombre}`,
              fecha: moment(fechaActual).toDate(),
              debe: 0,
              haber: Number(diferencia),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: 'AJ-COSTO-PRODUCTO',
              documento: {
                docReferencia: 'AJ-COSTO-PRODUCTO',
                docFecha: moment(fechaActual).toDate()
              }
            }
          ]
          asientosContables.push(...asientos)
        }
        if (tipoAjuste === 'ganancia') {
          const costoActual = Number(movimiento.costoUnitario) * Number(movimiento.cantidad)
          const nuevoCosto = Number(nuevoCostoUnitario) * Number(movimiento.cantidad)
          const diferencia = nuevoCosto - costoActual
          const asientos = [
            {
              cuentaId: movimiento.cuentaId,
              cuentaCodigo: movimiento.cuentaCodigo,
              cuentaNombre: movimiento.cuentaNombre,
              comprobanteId: comprobante._id,
              periodoId: periodo._id,
              descripcion: `Ajuste de costo ${movimiento.productoNombre} lote ${lote} en almacen ${movimiento.almacenNombre}`,
              fecha: moment(fechaActual).toDate(),
              debe: Number(diferencia),
              haber: 0,
              fechaCreacion: moment().toDate(),
              docReferenciaAux: 'AJ-COSTO-PRODUCTO',
              documento: {
                docReferencia: 'AJ-COSTO-PRODUCTO',
                docFecha: moment(fechaActual).toDate()
              }
            },
            {
              cuentaId: cuentaUtilidad._id,
              cuentaCodigo: cuentaUtilidad.codigo,
              cuentaNombre: cuentaUtilidad.descripcion,
              comprobanteId: comprobante._id,
              periodoId: periodo._id,
              descripcion: `Ajuste de costo ${movimiento.productoNombre} lote ${lote} en almacen ${movimiento.almacenNombre}`,
              fecha: moment(fechaActual).toDate(),
              debe: 0,
              haber: Number(diferencia),
              fechaCreacion: moment().toDate(),
              docReferenciaAux: 'AJ-COSTO-PRODUCTO',
              documento: {
                docReferencia: 'AJ-COSTO-PRODUCTO',
                docFecha: moment(fechaActual).toDate()
              }
            }
          ]
          asientosContables.push(...asientos)
        }
      }
      const productosAlmacenAuditoria = await agreggateCollectionsSD({
        nameCollection: 'productosPorAlmacen',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { lote, productoId: new ObjectId(productoId), almacenId: almacenAuditoria._id } },
          {
            $group: {
              _id: {
                tipoAuditoria: '$tipoAuditoria',
                costoUnitario: '$costoUnitario',
                productoId: '$productoId',
                almacenId: '$almacenId'
              },
              lote: { $first: '$lote' },
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
            $lookup: {
              from: almacenesCollection,
              localField: '_id.almacenId',
              foreignField: '_id',
              as: 'detalleAlmacen'
            }
          },
          { $unwind: { path: '$detalleAlmacen', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: categoriaPorAlmacenCollection,
              let: { categoriaId: '$detalleProducto.categoria', almacenId: '$_id.almacenId' },
              pipeline: [
                { $match: { $expr: { $and: [{ $eq: ['$categoriaId', '$$categoriaId'] }, { $eq: ['$almacenId', '$$almacenId'] }] } } },
                { $project: { cuentaId: 1 } }
              ],
              as: 'detalleCategoriaPorAlmacen'
            }
          },
          { $unwind: { path: '$detalleCategoriaPorAlmacen', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: planCuentaCollection,
              localField: 'detalleCategoriaPorAlmacen.cuentaId',
              foreignField: '_id',
              pipeline: [
                {
                  $project: {
                    descripcion: 1,
                    codigo: 1
                  }
                }
              ],
              as: 'detalleCuenta'
            }
          },
          { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              lote: '$lote',
              tipoAuditoria: '$_id.tipoAuditoria',
              costoUnitario: '$_id.costoUnitario',
              productoId: '$_id.productoId',
              almacenId: '$_id.almacenId',
              cantidad: { $subtract: ['$entrada', '$salida'] }, // cantidad de producto en el almacen de origen
              productoCategoria: '$detalleProducto.categoria',
              productoNombre: '$detalleProducto.nombre',
              cuentaId: '$detalleCuenta._id',
              cuentaNombre: '$detalleCuenta.descripcion',
              cuentaCodigo: '$detalleCuenta.codigo',
              almacenNombre: '$detalleAlmacen.nombre'
            }
          },
          { $match: { cantidad: { $gt: 0 } } }
        ]
      })
      if (productosAlmacenAuditoria[0]) {
        for (const movimientoAuditoria of productosAlmacenAuditoria) {
          if (tipoAjuste === 'perdida') {
            if (movimientoAuditoria.tipoAuditoria === 'faltante') {
              const costoActual = Number(movimientoAuditoria.costoUnitario) * Number(movimientoAuditoria.cantidad)
              const nuevoCosto = Number(nuevoCostoUnitario) * Number(movimientoAuditoria.cantidad)
              const diferencia = costoActual - nuevoCosto
              const asientos = [
                {
                  cuentaId: cuentaPerdida._id,
                  cuentaCodigo: cuentaPerdida.codigo,
                  cuentaNombre: cuentaPerdida.descripcion,
                  comprobanteId: comprobante._id,
                  periodoId: periodo._id,
                  descripcion: `Ajuste de costo ${movimientoAuditoria.productoNombre} lote ${lote} en almacen ${movimientoAuditoria.almacenNombre}`,
                  fecha: moment(fechaActual).toDate(),
                  debe: Number(diferencia),
                  haber: 0,
                  fechaCreacion: moment().toDate(),
                  docReferenciaAux: 'AJ-COSTO-PRODUCTO',
                  documento: {
                    docReferencia: 'AJ-COSTO-PRODUCTO',
                    docFecha: moment(fechaActual).toDate()
                  }
                },
                {
                  cuentaId: movimientoAuditoria.cuentaId,
                  cuentaCodigo: movimientoAuditoria.cuentaCodigo,
                  cuentaNombre: movimientoAuditoria.cuentaNombre,
                  comprobanteId: comprobante._id,
                  periodoId: periodo._id,
                  descripcion: `Ajuste de costo ${movimientoAuditoria.productoNombre} lote ${lote} en almacen ${movimientoAuditoria.almacenNombre}`,
                  fecha: moment(fechaActual).toDate(),
                  debe: 0,
                  haber: Number(diferencia),
                  fechaCreacion: moment().toDate(),
                  docReferenciaAux: 'AJ-COSTO-PRODUCTO',
                  documento: {
                    docReferencia: 'AJ-COSTO-PRODUCTO',
                    docFecha: moment(fechaActual).toDate()
                  }
                }
              ]
              asientosContables.push(...asientos)
            }
            if (movimientoAuditoria.tipoAuditoria === 'sobrante') {
              const costoActual = Number(movimientoAuditoria.costoUnitario) * Number(movimientoAuditoria.cantidad)
              const nuevoCosto = Number(nuevoCostoUnitario) * Number(movimientoAuditoria.cantidad)
              const diferencia = costoActual - nuevoCosto
              const asientos = [
                {
                  cuentaId: movimientoAuditoria.cuentaId,
                  cuentaCodigo: movimientoAuditoria.cuentaCodigo,
                  cuentaNombre: movimientoAuditoria.cuentaNombre,
                  comprobanteId: comprobante._id,
                  periodoId: periodo._id,
                  descripcion: `Ajuste de costo ${movimientoAuditoria.productoNombre} lote ${lote} en almacen ${movimientoAuditoria.almacenNombre}`,
                  fecha: moment(fechaActual).toDate(),
                  debe: Number(diferencia),
                  haber: 0,
                  fechaCreacion: moment().toDate(),
                  docReferenciaAux: 'AJ-COSTO-PRODUCTO',
                  documento: {
                    docReferencia: 'AJ-COSTO-PRODUCTO',
                    docFecha: moment(fechaActual).toDate()
                  }
                },
                {
                  cuentaId: cuentaUtilidad._id,
                  cuentaCodigo: cuentaUtilidad.codigo,
                  cuentaNombre: cuentaUtilidad.descripcion,
                  comprobanteId: comprobante._id,
                  periodoId: periodo._id,
                  descripcion: `Ajuste de costo ${movimientoAuditoria.productoNombre} lote ${lote} en almacen ${movimientoAuditoria.almacenNombre}`,
                  fecha: moment(fechaActual).toDate(),
                  debe: 0,
                  haber: Number(diferencia),
                  fechaCreacion: moment().toDate(),
                  docReferenciaAux: 'AJ-COSTO-PRODUCTO',
                  documento: {
                    docReferencia: 'AJ-COSTO-PRODUCTO',
                    docFecha: moment(fechaActual).toDate()
                  }
                }
              ]
              asientosContables.push(...asientos)
            }
          }
          if (tipoAjuste === 'ganancia') {
            if (movimientoAuditoria.tipoAuditoria === 'faltante') {
              const costoActual = Number(movimientoAuditoria.costoUnitario) * Number(movimientoAuditoria.cantidad)
              const nuevoCosto = Number(nuevoCostoUnitario) * Number(movimientoAuditoria.cantidad)
              const diferencia = nuevoCosto - costoActual
              const asientos = [
                {
                  cuentaId: movimientoAuditoria.cuentaId,
                  cuentaCodigo: movimientoAuditoria.cuentaCodigo,
                  cuentaNombre: movimientoAuditoria.cuentaNombre,
                  comprobanteId: comprobante._id,
                  periodoId: periodo._id,
                  descripcion: `Ajuste de costo ${movimientoAuditoria.productoNombre} lote ${lote} en almacen ${movimientoAuditoria.almacenNombre}`,
                  fecha: moment(fechaActual).toDate(),
                  debe: Number(diferencia),
                  haber: 0,
                  fechaCreacion: moment().toDate(),
                  docReferenciaAux: 'AJ-COSTO-PRODUCTO',
                  documento: {
                    docReferencia: 'AJ-COSTO-PRODUCTO',
                    docFecha: moment(fechaActual).toDate()
                  }
                },
                {
                  cuentaId: cuentaUtilidad._id,
                  cuentaCodigo: cuentaUtilidad.codigo,
                  cuentaNombre: cuentaUtilidad.descripcion,
                  comprobanteId: comprobante._id,
                  periodoId: periodo._id,
                  descripcion: `Ajuste de costo ${movimientoAuditoria.productoNombre} lote ${lote} en almacen ${movimientoAuditoria.almacenNombre}`,
                  fecha: moment(fechaActual).toDate(),
                  debe: 0,
                  haber: Number(diferencia),
                  fechaCreacion: moment().toDate(),
                  docReferenciaAux: 'AJ-COSTO-PRODUCTO',
                  documento: {
                    docReferencia: 'AJ-COSTO-PRODUCTO',
                    docFecha: moment(fechaActual).toDate()
                  }
                }
              ]
              asientosContables.push(...asientos)
            }
            if (movimientoAuditoria.tipoAuditoria === 'sobrante') {
              const costoActual = Number(movimientoAuditoria.costoUnitario) * Number(movimientoAuditoria.cantidad)
              const nuevoCosto = Number(nuevoCostoUnitario) * Number(movimientoAuditoria.cantidad)
              const diferencia = nuevoCosto - costoActual
              const asientos = [
                {
                  cuentaId: cuentaPerdida._id,
                  cuentaCodigo: cuentaPerdida.codigo,
                  cuentaNombre: cuentaPerdida.descripcion,
                  comprobanteId: comprobante._id,
                  periodoId: periodo._id,
                  descripcion: `Ajuste de costo ${movimientoAuditoria.productoNombre} lote ${lote} en almacen ${movimientoAuditoria.almacenNombre}`,
                  fecha: moment(fechaActual).toDate(),
                  debe: Number(diferencia),
                  haber: 0,
                  fechaCreacion: moment().toDate(),
                  docReferenciaAux: 'AJ-COSTO-PRODUCTO',
                  documento: {
                    docReferencia: 'AJ-COSTO-PRODUCTO',
                    docFecha: moment(fechaActual).toDate()
                  }
                },
                {
                  cuentaId: movimientoAuditoria.cuentaId,
                  cuentaCodigo: movimientoAuditoria.cuentaCodigo,
                  cuentaNombre: movimientoAuditoria.cuentaNombre,
                  comprobanteId: comprobante._id,
                  periodoId: periodo._id,
                  descripcion: `Ajuste de costo ${movimientoAuditoria.productoNombre} lote ${lote} en almacen ${movimientoAuditoria.almacenNombre}`,
                  fecha: moment(fechaActual).toDate(),
                  debe: 0,
                  haber: Number(diferencia),
                  fechaCreacion: moment().toDate(),
                  docReferenciaAux: 'AJ-COSTO-PRODUCTO',
                  documento: {
                    docReferencia: 'AJ-COSTO-PRODUCTO',
                    docFecha: moment(fechaActual).toDate()
                  }
                }
              ]
              asientosContables.push(...asientos)
            }
          }
        }
      }
      createManyItemsSD({
        nameCollection: 'detallesComprobantes',
        enviromentClienteId: clienteId,
        items: asientosContables
      })
    }
    updateManyItemSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      filters: { lote, productoId: new ObjectId(productoId) },
      update: {
        $set: {
          costoUnitario: nuevoCostoUnitario
        }
      }
    })
    // console.log(datosMovivientoPorProducto)
    return res.status(200).json({ status: 'Costos del lote actualizados correctamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de actualizar el costo por lote del producto ' + e.message })
  }
}
