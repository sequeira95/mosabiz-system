import { ObjectId } from 'mongodb'
import { agreggateCollections, agreggateCollectionsSD, bulkWriteSD, createItemSD, createManyItemsSD, deleteItemSD, deleteManyItemsSD, formatCollectionName, getCollection, getCollectionSD, getItem, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { deleteImg, uploadImg } from '../../../utils/cloudImage.js'
import { subDominioName, documentosVentas } from '../../../constants.js'
import moment from 'moment-timezone'
import { getOrCreateComprobante, createMovimientos } from '../../../utils/contabilidad.js'

export const getData = async (req, res) => {
  const { clienteId, fechaDia, userId } = req.body
  try {
    const usuario = await getItemSD({
      nameCollection: 'personas',
      pipeline: [
        { $match: { usuarioId: new ObjectId(userId) } }
      ]
    })
    if (!usuario) throw new Error('Su usuario no existe en la base de datos')
    const query = { usuarios: { $exists: true, $elemMatch: { $eq: new ObjectId(userId) } } }
    const isEmpresa = usuario.isEmpresa
    const almacenNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const cajasNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'ventascajas' })
    const { monedasUsar, monedaPrincipal } = await getItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'ajustes',
      filters: { tipo: 'sistema' }
    }) || {}
    const monedas = await getCollection({
      nameCollection: 'monedas',
      filters: {
        nombreCorto: { $in: [...(monedasUsar || []), (monedaPrincipal || 'Bs')] }
      }
    })
    const sucursales = await agreggateCollectionsSD({
      nameCollection: 'ventassucursales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: isEmpresa ? ({}) : query
        },
        {
          $project: {
            _id: 1,
            nombre: 1,
            almacenes: 1,
            cajasId: 1
          }
        },
        {
          $lookup: {
            from: almacenNameCol,
            localField: 'almacenes',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  nombre: { $concat: ['$codigo', ' - ', '$nombre'] }
                }
              }
            ],
            as: 'almacenData'
          }
        },
        {
          $match: {
            $expr: {
              $gt: [{ $size: '$almacenData' }, 0]
            }
          }
        },
        {
          $lookup: {
            from: cajasNameCol,
            localField: 'cajasId',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  nombre: '$nombre'
                }
              }
            ],
            as: 'cajasData'
          }
        },
        {
          $match: {
            $expr: {
              $gt: [{ $size: '$cajasData' }, 0]
            }
          }
        }
      ]
    })
    let tasa = await getItem({ nameCollection: 'tasas', filters: { fechaUpdate: fechaDia } })
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
    const zonas = await agreggateCollectionsSD({
      nameCollection: 'ventaszonas',
      enviromentClienteId: clienteId,
      pipeline: [
        { $sort: { nombre: 1 } }
      ]
    })
    const bancos = await agreggateCollectionsSD({
      nameCollection: 'bancos',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $project: {
            _id: 1,
            nombre: 1
          }
        }
      ]
    })
    return res.status(200).json({ monedas, sucursales, tasa, zonas, bancos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la data de facturacion: ' + e.message })
  }
}
export const getPedidosVentas = async (req, res) => {
  const { clienteId, search } = req.body
  try {
    const query = {
      tipoMovimiento: 'venta',
      tipoDocumento: 'Pedido de venta',
      // numero: { $gte: 0 },
      activo: true
    }
    if (search) {
      query.numeroFactura = { $regex: `^${search}` }
    }
    const pedidosVentas = await agreggateCollectionsSD({
      enviromentClienteId: clienteId,
      nameCollection: 'documentosFiscales',
      pipeline: [
        { $match: query },
        { $limit: 10 },
        {
          $project: {
            _id: 1,
            numeroFactura: 1
          }
        }
      ]
    })
    return res.status(200).json({ pedidosVentas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la data de los pedidos de venta: ' + e.message })
  }
}
export const getDetallePedidoVenta = async (req, res) => {
  const { clienteId, pedidoId, almacenId } = req.body
  try {
    const [pedidoVenta] = await agreggateCollectionsSD({
      enviromentClienteId: clienteId,
      nameCollection: 'documentosFiscales',
      pipeline: [
        { $match: { _id: new ObjectId(pedidoId) } },
        {
          $project: {
            _id: 1,
            activo: 1
          }
        }
      ]
    })
    if (!pedidoVenta?.activo) throw new Error('El pedido de venta ya no esta activo')
    const prodtuctosNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productos' })
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
    const alamcenesInvalid = await getCollectionSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Auditoria', 'Devoluciones'] } } })
    const matchAlmacen = almacenId ? { almacenId: new ObjectId(almacenId) } : { almacenId: { $nin: [null, ...alamcenesInvalid.map(e => e._id)] } }

    const detalles = await agreggateCollectionsSD({
      enviromentClienteId: clienteId,
      nameCollection: 'detalleDocumentosFiscales',
      pipeline: [
        { $match: { facturaId: new ObjectId(pedidoId) } },
        {
          $lookup: {
            from: prodtuctosNameCol,
            localField: 'productoId',
            foreignField: '_id',
            pipeline: [
              { $match: { activo: { $ne: false } } },
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
                    { $match: { ...matchAlmacen, lote: { $ne: null } } },
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
                  // detalleCantidadProducto: '$detalleCantidadProducto',
                  stock: '$detalleCantidadProducto.cantidad',
                  entrada: '$detalleCantidadProducto.entrada',
                  salida: '$detalleCantidadProducto.salida',
                  moneda: '$moneda',
                  isExento: '$isExento',
                  precioVenta: {
                    $cond: {
                      if: { $gt: ['$precioVenta', 0] },
                      then: '$precioVenta',
                      else: {
                        $cond: {
                          if: { $gt: ['$detalleCategoria.utilidad', 0] },
                          then: { $divide: ['$costoPromedio', { $subtract: [1, { $divide: ['$detalleCategoria.utilidad', 100] }] }] },
                          else: 0
                        }
                      }
                    }
                  },
                  iva: '$iva',
                  costoPromedio: '$costoPromedio',
                  isDataInicial: '$isDataInicial'
                }
              }
            ],
            as: 'producto'
          }
        },
        { $unwind: '$producto' },
        { $project: { producto: 1, cantidad: 1, descuento: 1 } }
      ]
    })
    const productos = detalles.map(({ producto, cantidad, descuento }) => {
      const descuentoTotal = descuento ? (producto.precioVenta * cantidad) * ((descuento * 100) / 100) : 0
      return {
        ...producto,
        descuentoTotal,
        cantidad,
        descuento: descuento * 100,
        precioTotal: (producto.precioVenta * cantidad) - descuentoTotal
      }
    })
    return res.status(200).json({ productos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la data de los pedidos de venta: ' + e.message })
  }
}
export const getFacturas = async (req, res) => {
  const { clienteId, search } = req.body
  try {
    const query = {
      tipoMovimiento: 'venta',
      tipoDocumento: 'Factura'
    }
    if (search) {
      query.numeroFactura = { $regex: `^${search}` }
    }
    const facturas = await agreggateCollectionsSD({
      enviromentClienteId: clienteId,
      nameCollection: 'documentosFiscales',
      pipeline: [
        { $match: query },
        { $limit: 10 },
        {
          $project: {
            _id: 1,
            numeroFactura: 1
          }
        }
      ]
    })
    return res.status(200).json({ facturas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la data de los pedidos de venta: ' + e.message })
  }
}
export const getDetalleFacturas = async (req, res) => {
  const { clienteId, facturaId, almacenId } = req.body
  try {
    const prodtuctosNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productos' })
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
    const alamcenesInvalid = await getCollectionSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Auditoria', 'Devoluciones'] } } })
    const matchAlmacen = almacenId ? { almacenId: new ObjectId(almacenId) } : { almacenId: { $nin: [null, ...alamcenesInvalid.map(e => e._id)] } }

    const detalles = await agreggateCollectionsSD({
      enviromentClienteId: clienteId,
      nameCollection: 'detalleDocumentosFiscales',
      pipeline: [
        { $match: { facturaId: new ObjectId(facturaId) } },
        {
          $lookup: {
            from: prodtuctosNameCol,
            localField: 'productoId',
            foreignField: '_id',
            pipeline: [
              { $match: { activo: { $ne: false } } },
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
                    { $match: { ...matchAlmacen, lote: { $ne: null } } },
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
                  // detalleCantidadProducto: '$detalleCantidadProducto',
                  stock: '$detalleCantidadProducto.cantidad',
                  entrada: '$detalleCantidadProducto.entrada',
                  salida: '$detalleCantidadProducto.salida',
                  moneda: '$moneda',
                  isExento: '$isExento',
                  precioVenta: {
                    $cond: {
                      if: { $gt: ['$precioVenta', 0] },
                      then: '$precioVenta',
                      else: {
                        $cond: {
                          if: { $gt: ['$detalleCategoria.utilidad', 0] },
                          then: { $divide: ['$costoPromedio', { $subtract: [1, { $divide: ['$detalleCategoria.utilidad', 100] }] }] },
                          else: 0
                        }
                      }
                    }
                  },
                  iva: '$iva',
                  costoPromedio: '$costoPromedio',
                  isDataInicial: '$isDataInicial'
                }
              }
            ],
            as: 'producto'
          }
        },
        { $unwind: '$producto' },
        { $project: { producto: 1, cantidad: 1, descuento: 1 } }
      ]
    })
    const productos = detalles.map(({ producto, cantidad, descuento }) => {
      const descuentoTotal = descuento ? (producto.precioVenta * cantidad) * ((descuento * 100) / 100) : 0
      return {
        ...producto,
        descuentoTotal,
        cantidad,
        descuento: descuento * 100,
        precioTotal: (producto.precioVenta * cantidad) - descuentoTotal
      }
    })
    return res.status(200).json({ productos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la data de las facturas: ' + e.message })
  }
}
export const getProductos = async (req, res) => {
  const { clienteId, almacenId, itemsPorPagina, pagina } = req.body
  try {
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
    const alamcenesInvalid = await getCollectionSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Auditoria', 'Devoluciones'] } } })
    const matchAlmacen = almacenId ? { almacenId: new ObjectId(almacenId) } : { almacenId: { $nin: [null, ...alamcenesInvalid.map(e => e._id)] } }
    const productos = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { activo: { $ne: false } } },
        { $skip: ((pagina || 1) - 1) * (itemsPorPagina || 1000) },
        { $limit: itemsPorPagina || 1000 },
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
              { $match: { ...matchAlmacen, lote: { $ne: null } } },
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
            // detalleCantidadProducto: '$detalleCantidadProducto',
            stock: '$detalleCantidadProducto.cantidad',
            entrada: '$detalleCantidadProducto.entrada',
            salida: '$detalleCantidadProducto.salida',
            moneda: '$moneda',
            isExento: '$isExento',
            precioVenta: {
              $cond: {
                if: { $gt: ['$precioVenta', 0] },
                then: '$precioVenta',
                else: {
                  $cond: {
                    if: { $gt: ['$detalleCategoria.utilidad', 0] },
                    then: { $divide: ['$costoPromedio', { $subtract: [1, { $divide: ['$detalleCategoria.utilidad', 100] }] }] },
                    else: 0
                  }
                }
              }
            },
            iva: '$iva',
            ivaId: '$ivaId',
            costoPromedio: '$costoPromedio',
            isDataInicial: '$isDataInicial'
          }
        },
        { $match: { stock: { $gt: 0 } } }
      ]
    })
    const cantidad = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { activo: { $ne: false } } },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ productos, cantidad: cantidad[0]?.total || 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtner datos de los productos' + e.message })
  }
}
export const handleVenta = async (req, res) => {
  const { clienteId, ventaInfo } = req.body
  let facturaId
  try {
    switch (ventaInfo.documento) {
      case 'Factura': {
        const data = await handleVentasFactuas({ clienteId, ventaInfo, req, creadoPor: req.uid })
        facturaId = data.facturaId
        break
      }
      case 'Nota de crédito': {
        const data = await handleVentasFactuas({ clienteId, ventaInfo, req, creadoPor: req.uid })
        facturaId = data.facturaId
        break
      }
      case 'Nota de débito': {
        const data = await handleVentasFactuas({ clienteId, ventaInfo, req, creadoPor: req.uid })
        facturaId = data.facturaId
        break
      }
      case 'Pedido de venta': {
        const data = await handleVentasPedidos({ clienteId, ventaInfo, req, creadoPor: req.uid })
        facturaId = data.facturaId
        break
      }
      case 'Nota de entrega': {
        const data = await handleVentasNotasEntrega({ clienteId, ventaInfo, req, creadoPor: req.uid })
        facturaId = data.facturaId
        break
      }
      case 'Presupuesto': {
        const data = await handleVentasPresupuestos({ clienteId, ventaInfo, req, creadoPor: req.uid })
        facturaId = data.facturaId
        break
      }
      default: {
        throw new Error('El tipo de documento no se reconoce')
      }
    }
    return res.status(200).json({ facturaId, message: 'Venta finalizada con exito' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de generar la venta ' + e.message })
  }
}

const handleVentasFactuas = async ({ clienteId, ventaInfo, creadoPor }) => {
  let pedidoVenta
  if (ventaInfo.pedidoVentaId) {
    pedidoVenta = await getItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'documentosFiscales',
      filters: {
        _id: new ObjectId(ventaInfo.pedidoVentaId),
        tipoMovimiento: 'venta',
        tipoDocumento: 'Pedido de venta'
      }
    })
    if (!pedidoVenta.activo) throw new Error('El pedido de venta ya fue facturado, necesita realizar un nuevo pedido')
  }
  const newFactura = await createDocumento({ clienteId, ventaInfo, creadoPor })
  await createDetalleDocumento({ clienteId, ventaInfo, facturaId: newFactura.insertedId })
  await createPagosDocumento({ clienteId, ventaInfo, facturaId: newFactura.insertedId, creadoPor })
  if (ventaInfo.pedidoVentaId && pedidoVenta) {
    updateItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'documentosFiscales',
      filters: {
        _id: pedidoVenta._id,
        tipoMovimiento: 'venta',
        tipoDocumento: 'Pedido de venta'
      },
      update: {
        $set: {
          activo: false
        }
      }
    })
  }
  try {
    await crearMovimientosContablesPagos({ clienteId, ventaInfo, facturaId: newFactura.insertedId })
  } catch (e) {
    console.log(`${moment().format('YYYY-MM-DD')} -- ${e.message}`, e)
  }
  return { facturaId: newFactura.insertedId }
}

const handleVentasPedidos = async ({ clienteId, ventaInfo, creadoPor }) => {
  const newFactura = await createDocumento({ clienteId, ventaInfo, creadoPor, activo: true })
  await createDetalleDocumento({ clienteId, ventaInfo, facturaId: newFactura.insertedId })
  return { facturaId: newFactura.insertedId }
}

const handleVentasNotasEntrega = async ({ clienteId, ventaInfo, creadoPor }) => {
  const newFactura = await createDocumento({ clienteId, ventaInfo, creadoPor })
  await createDetalleDocumento({ clienteId, ventaInfo, facturaId: newFactura.insertedId })
  await createPagosDocumento({ clienteId, ventaInfo, facturaId: newFactura.insertedId, creadoPor })
  try {
    await crearMovimientosContablesPagos({ clienteId, ventaInfo, facturaId: newFactura.insertedId })
  } catch (e) {
    console.log(`${moment().format('YYYY-MM-DD')} -- ${e.message}`, e)
  }
  return { facturaId: newFactura.insertedId }
}

const handleVentasPresupuestos = async ({ clienteId, ventaInfo, creadoPor }) => {
  const newFactura = await createDocumento({ clienteId, ventaInfo, creadoPor })
  await createDetalleDocumento({ clienteId, ventaInfo, facturaId: newFactura.insertedId })
  return { facturaId: newFactura.insertedId }
}

const createDocumento = async ({ clienteId, ventaInfo, creadoPor, activo = false }) => {
  const vendedor = await getItemSD({ nameCollection: 'personas', filters: { usuarioId: new ObjectId(creadoPor) } })
  if (!vendedor) throw new Error('Vendedor no existe en la base de datos')
  const clienteOwn = await getItemSD({ nameCollection: 'clientes', filters: { _id: new ObjectId(clienteId) } })
  if (!clienteOwn) throw new Error('Propietario no existe en la base de datos')
  const sucursal = await getItemSD({ nameCollection: 'ventassucursales', enviromentClienteId: clienteId, filters: { _id: new ObjectId(ventaInfo.sucursalId) } })
  if (!sucursal) throw new Error('La sucursal no existe en la base de datos')

  let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: `venta-${ventaInfo.documento}` } }))?.contador
  if (contador) ++contador
  if (!contador) contador = 1
  console.log('pedido fac')
  // crea doc fiscal
  const newFactura = await createItemSD({
    nameCollection: 'documentosFiscales',
    enviromentClienteId: clienteId,
    item: {
      // datos del documento
      tipoMovimiento: 'venta',
      fecha: moment(ventaInfo.fecha).toDate(),
      fechaCreacion: moment().toDate(),
      numeroFactura: String(contador),
      numero: contador,
      tipoDocumento: ventaInfo.documento,
      activo,
      isExportacion: ventaInfo.isExportacion,
      // numeroControl: ventaInfo.numeroControl,
      sucursalId: new ObjectId(ventaInfo.sucursalId),
      almacenId: new ObjectId(ventaInfo.almacenId),
      cajaId: new ObjectId(ventaInfo.cajaId),
      // datos de monedas
      tasaDia: Number(ventaInfo.tasa) || 0,
      moneda: ventaInfo.moneda,
      monedaSecundaria: ventaInfo.monedaSecundaria,
      // datos de montos e impuestos
      hasIgtf: ventaInfo.totalPagado.igtf > 0,
      baseImponible: Number(Number(ventaInfo.totalMonedaPrincial.baseImponible).toFixed(2)),
      exentoSinDescuento: Number(Number(ventaInfo.totalMonedaPrincial.exonerado).toFixed(2)),
      iva: Number(Number(ventaInfo.totalMonedaPrincial.iva).toFixed(2)),
      totalDescuento: Number(Number(ventaInfo.totalMonedaPrincial.montoDescuento).toFixed(2)),
      total: Number(Number(ventaInfo.totalMonedaPrincial.total).toFixed(2)),
      baseImponibleSecundaria: Number(Number(ventaInfo.totalMonedaSecundaria.baseImponible).toFixed(2)),
      ivaSecundaria: Number(Number(ventaInfo.totalMonedaSecundaria.iva).toFixed(2)),
      totalDescuentoSecundaria: Number(Number(ventaInfo.totalMonedaSecundaria.montoDescuento).toFixed(2)),
      totalSecundaria: Number(Number(ventaInfo.totalMonedaSecundaria.total).toFixed(2)),
      totalIgtf: Number(Number(ventaInfo.totalPagado.igtf).toFixed(2)),
      // total pagado
      totalPagado: Number(Number(ventaInfo.totalPagado.total).toFixed(2)),
      // total establecido a credito
      totalCredito: Number(Number(ventaInfo.totalPagado.totalCredito || 0).toFixed(2)),
      // cuando se realicen pagos al credito se abonara a este total
      totalAbonado: 0,
      // estado como primero filtro antes de buscar las que estan pagadas
      estado: Number(ventaInfo.totalPagado.totalCredito || 0) === 0 ? 'pagada' : 'pendiente',
      // este es un arreglo que tiene el texto del total de los IVA por porcentaje
      ivasTotales: ventaInfo.ivasTotales,
      ...ventaInfo.ivas,
      /* ivas:
        totalExento
        exento
        exonerado
        noSujeto,
        sinDerechoCredito
        sinDerechoCreditoSecundaria
        noSujetoSecundaria
        exoneradoSecundaria
        exentoSecundaria
        totalExentoSecundaria
      */
      // datos del vendedor
      creadoPor: new ObjectId(creadoPor),
      creadoPorNombre: vendedor.nombre,
      // datos del cliente de la venta
      clienteId: new ObjectId(ventaInfo.clienteId),
      clienteNombre: ventaInfo.clienteNombre,
      clienteDocumentoIdentidad: ventaInfo.clienteDocumentoIdentidad,
      direccion: ventaInfo.direccion,
      direccionEnvio: ventaInfo.direccionEnvio,
      zonaId: new ObjectId(ventaInfo.zonaId),
      zonaNombre: ventaInfo.zonaNombre,
      // datos del cliente del producto
      ownLogo: sucursal.logo || clienteOwn.logo,
      ownRazonSocial: sucursal.nombre || clienteOwn.razonSocial,
      ownDireccion: sucursal.direccion || clienteOwn.direccion,
      ownDocumentoIdentidad: sucursal.rif || `${clienteOwn.tipoDocumento}-${clienteOwn.documentoIdentidad}`
    }
  })
  // actualiza el contador
  upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: `venta-${ventaInfo.documento}` }, update: { $set: { contador } } })
  return newFactura
}

const createDetalleDocumento = async ({ clienteId, ventaInfo, facturaId }) => {
  const detalle = ventaInfo.productos.map(e => {
    const baseImponible = Number(e.precioVenta) * Number(e.cantidad)
    const baseImponibleConDescuento = Number(e.precioTotal)
    const montoIva = e.iva ? baseImponibleConDescuento * e.iva / 100 : 0
    return {
      facturaId,
      productoId: new ObjectId(e._id),
      codigo: e.codigo,
      descripcion: e.descripcion,
      nombre: e.nombre,
      observacion: e.observacion,
      unidad: e.unidad,
      cantidad: e.cantidad,
      tipo: e.tipo ? e.tipo : 'producto',
      precioVenta: Number(e.precioVenta),
      precioSinDescuento: Number(e.precioSinDescuento),
      descuento: Number(e.descuento) / 100,
      descuentoTotal: Number(e.descuentoTotal),
      precioConDescuento: Number(e.precioTotal),
      baseImponible,
      montoIva,
      iva: e.iva ? e.iva : 0,
      precioTotal: baseImponibleConDescuento + montoIva,
      fechaCreacion: moment().toDate()
    }
  })
  await createManyItemsSD({
    nameCollection: 'detalleDocumentosFiscales',
    enviromentClienteId: clienteId,
    items: detalle
  })
}

const createPagosDocumento = async ({ clienteId, ventaInfo, facturaId, creadoPor }) => {
  const pagos = ventaInfo.pagos.filter(e => e.metodo !== 'credito').map(e => ({
    documentoId: facturaId,
    clienteId: new ObjectId(ventaInfo.clienteId),
    metodo: e.metodo, // caja, banco
    pago: Number((e.monto || 0).toFixed(2)),
    fechaPago: moment(ventaInfo.fecha).toDate(),
    referencia: e.referencia,
    banco: (e.banco && new ObjectId(e.banco)) || '',
    caja: (ventaInfo.cajaId && new ObjectId(ventaInfo.cajaId)) || '',
    porcentajeIgtf: Number(e.porcentajeIgtf || 0),
    pagoIgtf: e?.igtfPorPagar ? Number((e.monto || 0).toFixed(2)) * Number((e.monto || 0).toFixed(2)) / 100 : 0,
    moneda: ventaInfo.moneda,
    monedaSecundaria: e.moneda,
    tasa: e.tasa,
    tipo: `venta-${ventaInfo.documento}`,
    creadoPor: new ObjectId(creadoPor),
    credito: e.credito,
    fechaCreacion: moment().toDate()
  }))
  if (pagos && pagos[0]) {
    createManyItemsSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
      items: pagos
    })
  }
}
const crearMovimientosContablesPagos = async ({ clienteId, ventaInfo, facturaId }) => {
  const ajustesSistema = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })
  const ajustesVentas = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'ventas' } })
  const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })

  if (!ajustesVentas) return
  if (!ajustesVentas.codigoComprobanteFacturacion) return

  const documento = await getItemSD({ enviromentClienteId: clienteId, nameCollection: 'documentosFiscales', filters: { _id: facturaId } })
  if (!documento) return

  const infoDoc = documentosVentas.find(e => e.value === documento.tipoDocumento)
  if (!infoDoc) return

  const zonasSucursalNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonas' })
  const [sucursalCuentas] = await agreggateCollectionsSD({
    nameCollection: 'ventassucursales',
    enviromentClienteId: clienteId,
    pipeline: [
      { $match: { _id: documento.sucursalId } },
      {
        $lookup: {
          from: zonasSucursalNameCol,
          localField: 'zonaId',
          foreignField: '_id',
          as: 'zonaData'
        }
      },
      { $unwind: { path: '$zonaData', preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: planCuentaCollection,
          localField: 'zonaData.cuentaId',
          foreignField: '_id',
          as: 'detalleCuenta'
        }
      },
      { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: false } },
      {
        $lookup: {
          from: planCuentaCollection,
          localField: 'zonaData.cuentaIdNE',
          foreignField: '_id',
          as: 'detalleCuentaNE'
        }
      },
      { $unwind: { path: '$detalleCuentaNE', preserveNullAndEmptyArrays: false } },
      {
        $project: {
          nombre: '$nombre',
          descripcion: '$descripcion',
          tipo: '$tipo',
          NE: {
            cuentaId: '$zonaData.cuentaIdNE',
            cuentaCodigo: '$detalleCuentaNE.codigo',
            cuentaNombre: '$detalleCuentaNE.descripcion'
          },
          DOC: {
            cuentaId: '$zonaData.cuentaId',
            cuentaCodigo: '$detalleCuenta.codigo',
            cuentaNombre: '$detalleCuenta.descripcion',
          }
        }
      }
    ]
  })
  console.log(sucursalCuentas)
  if (!sucursalCuentas) throw new Error('La sucursal asociada no posee cuenta contable asignada')
  let comprobante
  const mesPeriodo = momentDate(ajustesSistema.timeZone, ventaInfo.fecha).format('YYYY/MM')
  try {
    comprobante = await getOrCreateComprobante(clienteId,
      {
        mesPeriodo,
        codigo: ajustesVentas.codigoComprobanteFacturacion
      }, {
        nombre: 'Ventas'
      },
      true
    )
  } catch (e) {
    console.log(e)
  }
  if (!comprobante) return
  // create movimientos de pagos (debe)
  const movimientos = await Promise.all(ventaInfo.pagos.map(async (e) => {
    const referencia = e.referencia || (e.metodo ? e.metodo.toUpperCase() : `${infoDoc.sigla} ${documento.numeroFactura}`)
    const movimiento = {
      descripcion: `DOC ${infoDoc.sigla} ${documento.numeroFactura} ${documento.clienteNombre}`,
      comprobanteId: comprobante._id,
      periodoId: comprobante.periodoId,
      fecha: momentDate(ajustesSistema.timeZone, ventaInfo.fecha).toDate(),
      fechaCreacion: momentDate(ajustesSistema.timeZone).toDate(),
      docReferenciaAux: referencia,
      documento: {
        docReferencia: referencia
      }
    }
    const datosDebe = {
      cuentaId: '',
      cuentaCodigo: '',
      cuentaNombre: '',
      debe: Number(((e.monto || 0) * e.tasa).toFixed(2)),
      haber: 0
    }
    if (e.banco) {
      const [cuenta] = await agreggateCollectionsSD({
        nameCollection: 'bancos',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { _id: new ObjectId(e.banco) } },
          {
            $lookup: {
              from: planCuentaCollection,
              localField: 'cuentaId',
              foreignField: '_id',
              as: 'detalleCuenta'
            }
          },
          { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: false } },
          {
            $project: {
              nombre: '$nombre',
              descripcion: '$descripcion',
              tipo: '$tipo',
              cuentaId: '$cuentaId',
              cuentaCodigo: '$detalleCuenta.codigo',
              cuentaNombre: '$detalleCuenta.descripcion'
            }
          }
        ]
      })
      if (!cuenta) throw new Error('no hay cuenta')
      datosDebe.cuentaId = cuenta.cuentaId
      datosDebe.cuentaCodigo = cuenta.cuentaCodigo
      datosDebe.cuentaNombre = cuenta.cuentaNombre
      datosDebe.debe = Number((e.monto || 0).toFixed(2))
    }
    if (e.metodo === 'credito') {
      const cuenta = await getItemSD({
        enviromentClienteId: clienteId,
        nameCollection: 'planCuenta',
        filters: {
          _id: ajustesVentas.cuentaPorCobrarClienteId
        }
      })
      if (!cuenta) throw new Error('no hay cuenta')
      datosDebe.cuentaId = cuenta._id
      datosDebe.cuentaCodigo = cuenta.codigo
      datosDebe.cuentaNombre = cuenta.descripcion
    }
    if (e.moneda !== ajustesSistema.monedaPrincipal) {
      datosDebe.fechaDolar = momentDate(ajustesSistema.timeZone, ventaInfo.fecha).toDate()
      datosDebe.monedaPrincipal = ajustesSistema.monedaPrincipal
      datosDebe.monedasUsar = e.moneda
      datosDebe.tasa = e.tasa
      datosDebe.cantidad = Number((e.monto || 0).toFixed(2))
      datosDebe.currencyField = 'debe'
    }
    datosDebe.debe = Math.abs(datosDebe.debe)
    return { ...movimiento, ...datosDebe }
  }))
  // create movimientos de sucursal (base imponible, descuentos, ivas, igtf)
  // base imponible
  {
    const dataCuenta = infoDoc.sigla === 'NE' ? 'NE' : 'DOC'
    const movimiento = {
      descripcion: `DOC ${infoDoc.sigla} ${documento.numeroFactura} ${documento.clienteNombre}`,
      comprobanteId: comprobante._id,
      periodoId: comprobante.periodoId,
      fecha: momentDate(ajustesSistema.timeZone, ventaInfo.fecha).toDate(),
      fechaCreacion: momentDate(ajustesSistema.timeZone).toDate(),
      docReferenciaAux: `${infoDoc.sigla} ${documento.numeroFactura}`,
      documento: {
        docReferencia: `${infoDoc.sigla} ${documento.numeroFactura}`
      },
      cuentaId: sucursalCuentas[dataCuenta]?.cuentaId,
      cuentaCodigo: sucursalCuentas[dataCuenta]?.cuentaCodigo,
      cuentaNombre: sucursalCuentas[dataCuenta]?.cuentaNombre,
      debe: 0,
      haber: Math.abs((documento.baseImponible || 0) + (documento.exentoSinDescuento || 0))
    }
    movimientos.push(movimiento)
  }
  // Descuentos
  if (documento.totalDescuento !== 0) {
    const cuenta = await getItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'planCuenta',
      filters: {
        _id: ajustesVentas.cuentaDescuentosProductosId
      }
    })
    if (cuenta) {
      const movimiento = {
        descripcion: `DOC ${infoDoc.sigla} ${documento.numeroFactura} ${documento.clienteNombre}`,
        comprobanteId: comprobante._id,
        periodoId: comprobante.periodoId,
        fecha: momentDate(ajustesSistema.timeZone, ventaInfo.fecha).toDate(),
        fechaCreacion: momentDate(ajustesSistema.timeZone).toDate(),
        docReferenciaAux: `DESCUENTO ${infoDoc.sigla} ${documento.numeroFactura}`,
        documento: {
          docReferencia: `DESCUENTO ${infoDoc.sigla} ${documento.numeroFactura}`
        },
        cuentaId: cuenta._id,
        cuentaCodigo: cuenta.codigo,
        cuentaNombre: cuenta.descripcion,
        debe: documento.totalDescuento,
        haber: 0
      }
      movimientos.push(movimiento)
    }
  }
  // iva
  if (documento.iva !== 0) {
    const cuenta = await getItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'planCuenta',
      filters: {
        _id: ajustesVentas.cuentaIvaId
      }
    })
    if (cuenta) {
      const movimiento = {
        descripcion: `DOC ${infoDoc.sigla} ${documento.numeroFactura} ${documento.clienteNombre}`,
        comprobanteId: comprobante._id,
        periodoId: comprobante.periodoId,
        fecha: momentDate(ajustesSistema.timeZone, ventaInfo.fecha).toDate(),
        fechaCreacion: momentDate(ajustesSistema.timeZone).toDate(),
        docReferenciaAux: `IVA ${infoDoc.sigla} ${documento.numeroFactura}`,
        documento: {
          docReferencia: `IVA ${infoDoc.sigla} ${documento.numeroFactura}`
        },
        cuentaId: cuenta._id,
        cuentaCodigo: cuenta.codigo,
        cuentaNombre: cuenta.descripcion,
        debe: 0,
        haber: Math.abs(documento.iva)
      }
      movimientos.push(movimiento)
    }
  }
  // iva
  if (documento.hasIgtf) {
    const cuenta = await getItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'planCuenta',
      filters: {
        _id: ajustesVentas.cuentaIGTFPorPagarId
      }
    })
    if (cuenta) {
      const movimiento = {
        descripcion: `DOC ${infoDoc.sigla} ${documento.numeroFactura} ${documento.clienteNombre}`,
        comprobanteId: comprobante._id,
        periodoId: comprobante.periodoId,
        fecha: momentDate(ajustesSistema.timeZone, ventaInfo.fecha).toDate(),
        fechaCreacion: momentDate(ajustesSistema.timeZone).toDate(),
        docReferenciaAux: `IGTF ${infoDoc.sigla} ${documento.numeroFactura}`,
        documento: {
          docReferencia: `IGTF ${infoDoc.sigla} ${documento.numeroFactura}`
        },
        cuentaId: cuenta._id,
        cuentaCodigo: cuenta.codigo,
        cuentaNombre: cuenta.descripcion,
        debe: 0,
        haber: Math.abs(documento.totalIgtf)
      }
      movimientos.push(movimiento)
    }
  }
  console.log({
    movimientos
  })
  await createMovimientos({
    clienteId,
    movimientos
  })
}
