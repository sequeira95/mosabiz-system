import { ObjectId } from 'mongodb'
import { agreggateCollections, agreggateCollectionsSD, bulkWriteSD, createItemSD, createManyItemsSD, deleteItemSD, deleteManyItemsSD, formatCollectionName, getCollection, getCollectionSD, getItem, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { subDominioName, documentosVentas } from '../../../constants.js'
import moment from 'moment-timezone'
import { getOrCreateComprobante, createMovimientos, checkPeriodo } from '../../../utils/contabilidad.js'
import { hasContabilidad } from '../../../utils/hasContabilidad.js'
import { hasInventario } from '../../../utils/validModulos.js'

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
          $lookup: {
            from: cajasNameCol,
            localField: '_id',
            foreignField: 'sucursalId',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  nombre: '$nombre',
                  numeroControl: '$numeroControl',
                  useImpresoraFiscal: '$useImpresoraFiscal',
                  modeloImpresoraFiscal: '$modeloImpresoraFiscal'
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
    const alamcenesInvalid = await getCollectionSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Transito', 'Auditoria', 'Devoluciones'] } } })
    const matchAlmacen = almacenId ? { almacenId: new ObjectId(almacenId) } : { almacenId: { $nin: [null, ...alamcenesInvalid.map(e => e._id)] } }

    const categoriaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const zonasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'ventaszonas' })
    const clientesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'clientes' })

    const [cliente] = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { _id: new ObjectId(pedidoId) } },
        {
          $lookup: {
            from: clientesCollection,
            localField: 'clienteId',
            foreignField: '_id',
            as: 'cliente'
          }
        },
        { $unwind: { path: '$cliente' } },
        {
          $lookup: {
            from: zonasCollection,
            localField: 'cliente.zona',
            foreignField: '_id',
            as: 'detalleZona'
          }
        },
        { $unwind: { path: '$detalleZona', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: categoriaCollection,
            localField: 'cliente.categoria',
            foreignField: '_id',
            as: 'detalleCategoria'
          }
        },
        { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: '$cliente._id',
            zonaId: '$detalleZona._id',
            zona: '$detalleZona.nombre',
            categoriaId: '$detalleCategoria._id',
            categoria: '$detalleCategoria.nombre',
            tipoDocumento: '$cliente.tipoDocumento',
            documentoIdentidad: '$cliente.documentoIdentidad',
            email: '$cliente.email',
            razonSocial: '$cliente.razonSocial',
            telefono: '$cliente.telefono',
            isContribuyenteEspecial: '$cliente.isContribuyenteEspecial',
            direccion: '$cliente.direccion',
            direccionEnvio: '$cliente.direccionEnvio',
            observacion: '$cliente.observacion'
          }
        }
      ]
    })
    const detalles = await agreggateCollectionsSD({
      enviromentClienteId: clienteId,
      nameCollection: 'detalleDocumentosFiscales',
      pipeline: [
        { $match: { documentoId: new ObjectId(pedidoId) } },
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
                          if: { $and: [
                            { $gt: ['$detalleCategoria.utilidad', 0] },
                            { $lt: ['$detalleCategoria.utilidad', 100] }
                          ] },
                          then: { $divide: ['$costoPromedio', { $subtract: [1, { $divide: ['$detalleCategoria.utilidad', 100] }] }] },
                          else: { $cond: {
                            if: { $gte: ['$detalleCategoria.utilidad', 100] },
                            then: { $multiply: ['$costoPromedio', { $sum: [1, { $divide: ['$detalleCategoria.utilidad', 100] }] }] },
                            else: 0
                          } }
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
        { $project: { producto: 1, cantidad: 1, descuento: 1, costoPromedio: 1 } }
      ]
    })
    const productos = detalles.map(({ producto, cantidad, descuento, costoPromedio }) => {
      const descuentoTotal = descuento ? (producto.precioVenta * cantidad) * ((descuento * 100) / 100) : 0
      return {
        ...producto,
        descuentoTotal,
        cantidad,
        costoPromedio,
        descuento: descuento * 100,
        precioTotal: (producto.precioVenta * cantidad) - descuentoTotal
      }
    })
    return res.status(200).json({ productos, cliente })
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
  const { clienteId, facturaId } = req.body
  try {
    const categoriaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const zonasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'ventaszonas' })
    const clientesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'clientes' })

    const [cliente] = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { _id: new ObjectId(facturaId) } },
        {
          $lookup: {
            from: clientesCollection,
            localField: 'clienteId',
            foreignField: '_id',
            as: 'cliente'
          }
        },
        { $unwind: { path: '$cliente' } },
        {
          $lookup: {
            from: zonasCollection,
            localField: 'cliente.zona',
            foreignField: '_id',
            as: 'detalleZona'
          }
        },
        { $unwind: { path: '$detalleZona', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: categoriaCollection,
            localField: 'cliente.categoria',
            foreignField: '_id',
            as: 'detalleCategoria'
          }
        },
        { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: '$cliente._id',
            zonaId: '$detalleZona._id',
            zona: '$detalleZona.nombre',
            categoriaId: '$detalleCategoria._id',
            categoria: '$detalleCategoria.nombre',
            tipoDocumento: '$cliente.tipoDocumento',
            documentoIdentidad: '$cliente.documentoIdentidad',
            email: '$cliente.email',
            razonSocial: '$cliente.razonSocial',
            telefono: '$cliente.telefono',
            isContribuyenteEspecial: '$cliente.isContribuyenteEspecial',
            direccion: '$cliente.direccion',
            direccionEnvio: '$cliente.direccionEnvio',
            observacion: '$cliente.observacion'
          }
        }
      ]
    })
    const documentosIdNCyND = await agreggateCollectionsSD({
      enviromentClienteId: clienteId,
      nameCollection: 'documentosFiscales',
      pipeline: [
        { $match: { facturaAsociada: new ObjectId(facturaId) } },
        {
          $group: {
            _id: 0,
            documentosId: {
              $addToSet: '$_id'
            }
          }
        }
      ]
    })
    const documentosId = documentosIdNCyND[0]?.documentosId || []
    const detalles = await agreggateCollectionsSD({
      enviromentClienteId: clienteId,
      nameCollection: 'detalleDocumentosFiscales',
      pipeline: [
        { $match: { documentoId: { $in: [...documentosId, new ObjectId(facturaId)] } } },
        { $sort: { fechaCreacion: -1 } },
        {
          $group: {
            _id: '$productoId',
            codigo: {
              $last: '$codigo'
            },
            descripcion: {
              $last: '$descripcion'
            },
            nombre: {
              $last: '$nombre'
            },
            observacion: {
              $last: '$observacion'
            },
            unidad: {
              $last: '$unidad'
            },
            tipo: {
              $last: '$tipo'
            },
            descuento: {
              $last: '$descuento'
            },
            ivaId: {
              $last: '$ivaId'
            },
            iva: {
              $last: '$iva'
            },
            costoPromedio: {
              $last: '$costoPromedio'
            },
            cantidad: {
              $sum: {
                $cond: {
                  if: { $and: [
                    { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                    { $eq: ['$tipoAjuste', 'cantidad'] }
                  ] },
                  then: { $multiply: ['$cantidad', -1] },
                  else: {
                    $cond: {
                      if: { $eq: ['$tipoDocumento', 'Factura'] },
                      then: '$cantidad',
                      else: 0
                    }
                  }
                }
              }
            },
            precioVenta: {
              $sum: {
                $cond: {
                  if: { $and: [
                    { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                    { $eq: ['$tipoAjuste', 'precio'] }
                  ] },
                  then: { $multiply: ['$precioVenta', -1] },
                  else: {
                    $cond: {
                      if: { $ne: ['$tipoDocumento', 'Nota de crédito'] },
                      then: '$precioVenta',
                      else: 0
                    }
                  }
                }
              }
            },
            precioSinDescuento: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                  then: { $multiply: ['$precioSinDescuento', -1] },
                  else: '$precioSinDescuento'
                }
              }
            },
            descuentoTotal: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                  then: { $multiply: ['$descuentoTotal', -1] },
                  else: '$descuentoTotal'
                }
              }
            },
            precioConDescuento: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                  then: { $multiply: ['$precioConDescuento', -1] },
                  else: '$precioConDescuento'
                }
              }
            },
            baseImponible: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                  then: { $multiply: ['$baseImponible', -1] },
                  else: '$baseImponible'
                }
              }
            },
            montoIva: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                  then: { $multiply: ['$montoIva', -1] },
                  else: '$montoIva'
                }
              }
            },
            precioTotal: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoDocumento', 'Nota de crédito'] },
                  then: { $multiply: ['$precioTotal', -1] },
                  else: '$precioTotal'
                }
              }
            }
          }
        }
      ]
    })
    return res.status(200).json({ productos: detalles, cliente })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la data de las facturas: ' + e.message })
  }
}
export const getNotasEntrega = async (req, res) => {
  const { clienteId, search } = req.body
  try {
    const query = {
      tipoMovimiento: 'venta',
      tipoDocumento: 'Nota de entrega'
    }
    if (search) {
      query.numeroFactura = { $regex: `^${search}` }
    }
    const documentos = await agreggateCollectionsSD({
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
    return res.status(200).json({ documentos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la data de los pedidos de venta: ' + e.message })
  }
}
export const getDetalleNotasEntrega = async (req, res) => {
  const { clienteId, notaEntregaId } = req.body
  try {
    const categoriaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const zonasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'ventaszonas' })
    const clientesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'clientes' })

    const [cliente] = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { _id: new ObjectId(notaEntregaId) } },
        {
          $lookup: {
            from: clientesCollection,
            localField: 'clienteId',
            foreignField: '_id',
            as: 'cliente'
          }
        },
        { $unwind: { path: '$cliente' } },
        {
          $lookup: {
            from: zonasCollection,
            localField: 'cliente.zona',
            foreignField: '_id',
            as: 'detalleZona'
          }
        },
        { $unwind: { path: '$detalleZona', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: categoriaCollection,
            localField: 'cliente.categoria',
            foreignField: '_id',
            as: 'detalleCategoria'
          }
        },
        { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: '$cliente._id',
            zonaId: '$detalleZona._id',
            zona: '$detalleZona.nombre',
            categoriaId: '$detalleCategoria._id',
            categoria: '$detalleCategoria.nombre',
            tipoDocumento: '$cliente.tipoDocumento',
            documentoIdentidad: '$cliente.documentoIdentidad',
            email: '$cliente.email',
            razonSocial: '$cliente.razonSocial',
            telefono: '$cliente.telefono',
            isContribuyenteEspecial: '$cliente.isContribuyenteEspecial',
            direccion: '$cliente.direccion',
            direccionEnvio: '$cliente.direccionEnvio',
            observacion: '$cliente.observacion'
          }
        }
      ]
    })
    const documentosIdNCyND = await agreggateCollectionsSD({
      enviromentClienteId: clienteId,
      nameCollection: 'documentosFiscales',
      pipeline: [
        { $match: { notaEntregaAsociada: new ObjectId(notaEntregaId) } },
        {
          $group: {
            _id: 0,
            documentosId: {
              $addToSet: '$_id'
            }
          }
        }
      ]
    })
    const documentosId = documentosIdNCyND[0]?.documentosId || []
    const detalles = await agreggateCollectionsSD({
      enviromentClienteId: clienteId,
      nameCollection: 'detalleDocumentosFiscales',
      pipeline: [
        { $match: { documentoId: { $in: [...documentosId, new ObjectId(notaEntregaId)] } } },
        { $sort: { fechaCreacion: -1 } },
        {
          $group: {
            _id: '$productoId',
            codigo: {
              $last: '$codigo'
            },
            descripcion: {
              $last: '$descripcion'
            },
            nombre: {
              $last: '$nombre'
            },
            observacion: {
              $last: '$observacion'
            },
            unidad: {
              $last: '$unidad'
            },
            tipo: {
              $last: '$tipo'
            },
            descuento: {
              $last: '$descuento'
            },
            ivaId: {
              $last: '$ivaId'
            },
            iva: {
              $last: '$iva'
            },
            costoPromedio: {
              $last: '$costoPromedio'
            },
            cantidad: {
              $sum: {
                $cond: {
                  if: { $and: [
                    { $eq: ['$tipoDocumento', 'Devolución'] },
                    { $eq: ['$tipoAjuste', 'cantidad'] }
                  ] },
                  then: { $multiply: ['$cantidad', -1] },
                  else: {
                    $cond: {
                      if: { $eq: ['$tipoDocumento', 'Nota de entrega'] },
                      then: '$cantidad',
                      else: 0
                    }
                  }
                }
              }
            },
            precioVenta: {
              $sum: {
                $cond: {
                  if: { $and: [
                    { $eq: ['$tipoDocumento', 'Devolución'] },
                    { $eq: ['$tipoAjuste', 'precio'] }
                  ] },
                  then: { $multiply: ['$precioVenta', -1] },
                  else: {
                    $cond: {
                      if: { $ne: ['$tipoDocumento', 'Devolución'] },
                      then: '$precioVenta',
                      else: 0
                    }
                  }
                }
              }
            },
            precioSinDescuento: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoDocumento', 'Devolución'] },
                  then: { $multiply: ['$precioSinDescuento', -1] },
                  else: '$precioSinDescuento'
                }
              }
            },
            descuentoTotal: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoDocumento', 'Devolución'] },
                  then: { $multiply: ['$descuentoTotal', -1] },
                  else: '$descuentoTotal'
                }
              }
            },
            precioConDescuento: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoDocumento', 'Devolución'] },
                  then: { $multiply: ['$precioConDescuento', -1] },
                  else: '$precioConDescuento'
                }
              }
            },
            baseImponible: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoDocumento', 'Devolución'] },
                  then: { $multiply: ['$baseImponible', -1] },
                  else: '$baseImponible'
                }
              }
            },
            montoIva: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoDocumento', 'Devolución'] },
                  then: { $multiply: ['$montoIva', -1] },
                  else: '$montoIva'
                }
              }
            },
            precioTotal: {
              $sum: {
                $cond: {
                  if: { $eq: ['$tipoDocumento', 'Devolución'] },
                  then: { $multiply: ['$precioTotal', -1] },
                  else: '$precioTotal'
                }
              }
            }
          }
        }
      ]
    })
    return res.status(200).json({ productos: detalles, cliente })
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
    const alamcenesInvalid = await getCollectionSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Transito', 'Auditoria', 'Devoluciones'] } } })
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
                    if: { $and: [
                      { $gt: ['$detalleCategoria.utilidad', 0] },
                      { $lt: ['$detalleCategoria.utilidad', 100] }
                    ] },
                    then: { $divide: ['$costoPromedio', { $subtract: [1, { $divide: ['$detalleCategoria.utilidad', 100] }] }] },
                    else: { $cond: {
                      if: { $gte: ['$detalleCategoria.utilidad', 100] },
                      then: { $multiply: ['$costoPromedio', { $sum: [1, { $divide: ['$detalleCategoria.utilidad', 100] }] }] },
                      else: 0
                    } }
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
  let documentoId
  try {
    const isVentaValid = await validarVenta({ clienteId, ventaInfo, creadoPor: req.uid })
    if (!isVentaValid) throw new Error('La venta no es valida')
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de generar la venta ' + e.message })
  }
  try {
    switch (ventaInfo.documento) {
      case 'Factura': {
        const data = await handleVentasFactuas({ clienteId, ventaInfo, req, creadoPor: req.uid })
        documentoId = data.documentoId
        break
      }
      case 'Nota de crédito': {
        const data = await handleVentasNC({ clienteId, ventaInfo, req, creadoPor: req.uid })
        documentoId = data.documentoId
        break
      }
      case 'Nota de débito': {
        const data = await handleVentasND({ clienteId, ventaInfo, req, creadoPor: req.uid })
        documentoId = data.documentoId
        break
      }
      case 'Pedido de venta': {
        const data = await handleVentasPedidos({ clienteId, ventaInfo, req, creadoPor: req.uid })
        documentoId = data.documentoId
        break
      }
      case 'Nota de entrega': {
        const data = await handleVentasNotasEntrega({ clienteId, ventaInfo, req, creadoPor: req.uid })
        documentoId = data.documentoId
        break
      }
      case 'Presupuesto': {
        const data = await handleVentasPresupuestos({ clienteId, ventaInfo, req, creadoPor: req.uid })
        documentoId = data.documentoId
        break
      }
      case 'Devolución': {
        const data = await handleVentasDevolucion({ clienteId, ventaInfo, req, creadoPor: req.uid })
        documentoId = data.documentoId
        break
      }
      default: {
        throw new Error('El tipo de documento no se reconoce')
      }
    }
    return res.status(200).json({ documentoId, message: 'Venta finalizada con exito' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de generar la venta ' + e.message })
  }
}

const validarVenta = async ({ clienteId, ventaInfo, creadoPor }) => {
  if (!clienteId) return false
  if (!ventaInfo) return false
  if (!creadoPor) return false
  if (!ventaInfo.productos[0]) return false
  if (!ventaInfo.pagos[0]) return false
  if (!ventaInfo.sucursalId) return false
  if (!ventaInfo.zonaId) return false
  const infoDoc = documentosVentas.find(e => e.value === ventaInfo.documento)
  if (!infoDoc) throw new Error(`No existe el tipo de documento: ${ventaInfo.documento}`)
  if (infoDoc.isFiscal && ventaInfo.useImpresoraFiscal && !ventaInfo.numeroControl) throw new Error('No existe el Numero de Control de la impresora')
  const tieneInventario = await hasInventario({ clienteId })
  if (tieneInventario && !ventaInfo.almacenId) return false

  const tieneContabilidad = await hasContabilidad({ clienteId })
  if (!tieneContabilidad) return true
  const { status: existePeriodo } = await checkPeriodo({
    clienteId,
    fecha: moment(ventaInfo.fecha).toDate(),
    isCierre: false
  })
  if (!existePeriodo) throw new Error('La fecha de la venta corresponde a un periodo contable cerrado o que no existe')
  const zona = await getItemSD({ nameCollection: 'ventaszonas', enviromentClienteId: clienteId, filters: { _id: new ObjectId(ventaInfo.zonaId) } })
  if (!zona) throw new Error('No existe la zona del cliente')
  if (!zona.cuentaId) throw new Error('No existe la cuenta contable asociada a la zona del cliente')
  const ajustesSistema = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })
  if (!ajustesSistema.timeZone) return false
  if (!ajustesSistema.monedaPrincipal) return false

  const ajustesVentas = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'ventas' } })
  if (!ajustesVentas) return false
  if (!ajustesVentas.codigoComprobanteFacturacion) return false
  // valida rcuenta de sucursal
  const zonasSucursalNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonas' })
  const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
  const [sucursalCuentas] = await agreggateCollectionsSD({
    nameCollection: 'ventassucursales',
    enviromentClienteId: clienteId,
    pipeline: [
      { $match: { _id: new ObjectId(ventaInfo.sucursalId) } },
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
  if (!sucursalCuentas) throw new Error('La sucursal asociada no posee cuenta contable asignada')

  // validar cuentas de pagos, credito y banco y caja
  for (const e of ventaInfo.pagos) {
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
      if (!cuenta) throw new Error('El pago de banco no tiene cuenta contable asociada')
    }
    if (e.metodo === 'credito') {
      const cuenta = await getItemSD({
        enviromentClienteId: clienteId,
        nameCollection: 'planCuenta',
        filters: {
          _id: ajustesVentas.cuentaPorCobrarClienteId
        }
      })
      if (!cuenta) throw new Error('No existe la cuenta por cobrar del cliente')
    }
    if (e.metodo === 'caja') {
      const [cuenta] = await agreggateCollectionsSD({
        nameCollection: 'ventascajas',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { _id: new ObjectId(ventaInfo.cajaId) } },
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
      if (!cuenta) throw new Error('El pago de caja no tiene cuenta contable asociada')
    }
  }
  // valdiar cuenta de descuento
  {
    const cuenta = await getItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'planCuenta',
      filters: {
        _id: ajustesVentas.cuentaDescuentosProductosId
      }
    })
    if (!cuenta) throw new Error('No existe cuenta contable asociada a los descuentos de productos')
  }
  // valdiar cuenta de IVA
  {
    const cuenta = await getItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'planCuenta',
      filters: {
        _id: ajustesVentas.cuentaIvaId
      }
    })
    if (!cuenta) throw new Error('No existe la cuenta contable de I.V.A')
  }
  // valdiar cuenta de IGTF
  {
    const cuenta = await getItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'planCuenta',
      filters: {
        _id: ajustesVentas.cuentaIGTFPorPagarId
      }
    })
    if (!cuenta) throw new Error('No existe la cuenta contable de IGTF')
  }

  // valdiar cuenta de diferencias
  {
    const cuenta = await getItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'planCuenta',
      filters: {
        _id: ajustesVentas.cuentaDiferenciaVentasId
      }
    })
    if (!cuenta) throw new Error('No existe la cuenta contable de IGTF')
  }
  // valdiar cuentad e productos
  for (const prod of ventaInfo.productos) {
    const producto = await getItemSD({ nameCollection: 'productos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(prod._id) } })
    if (!producto) throw new Error(`el producto ${prod?.nombre || '-'} no existe`)

    const categoriaPorAlmacen = await getItemSD({
      nameCollection: 'categoriaPorAlmacen',
      enviromentClienteId: clienteId,
      filters: { categoriaId: producto.categoria, almacenId: new ObjectId(ventaInfo.almacenId) }
    })
    if (!categoriaPorAlmacen) throw new Error(`el producto ${prod?.nombre || '-'} no tiene categoria existente`)

    const cuentaInventario = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: categoriaPorAlmacen.cuentaId } })
    if (!cuentaInventario) throw new Error(`el producto ${prod?.nombre || '-'} no tiene una cuenta contable asociada`)

    const cuentaCostoInventario = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: categoriaPorAlmacen.cuentaCostoVentaId } })
    if (!cuentaCostoInventario) throw new Error(`el producto ${prod?.nombre || '-'} no tiene una cuenta contable de gastos asociada`)
  }
  return true
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
  await createDetalleDocumento({ clienteId, ventaInfo, documentoId: newFactura.insertedId })
  await createPagosDocumento({ clienteId, ventaInfo, documentoId: newFactura.insertedId, creadoPor })
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
    await crearMovimientosContablesPagos({ clienteId, ventaInfo, documentoId: newFactura.insertedId })
  } catch (e) {
    console.log(`${moment().format('YYYY-MM-DD')} -- ${e.message}`, e)
  }
  if (await hasInventario({ clienteId })) {
    await crearDespachos({
      clienteId,
      ventaInfo,
      documentoId: newFactura.insertedId,
      creadoPor
    })
  }
  return { documentoId: newFactura.insertedId }
}

const handleVentasND = async ({ clienteId, ventaInfo, creadoPor }) => {
  const newFactura = await createDocumento({ clienteId, ventaInfo, creadoPor })
  ventaInfo.productos = ventaInfo.productos.filter(e => {
    return e.precioUnitarioNDEditable > 0
  }).map(e => {
    const valorAjustado = Number(e.precioUnitarioNDEditable) /* - Number(e.precioVenta) */
    return {
      ...e,
      tipoAjuste: 'precio',
      nombre: `${e.nombre} (Ajuste de precio)`,
      precioVenta: Number(valorAjustado.toFixed(2)),
      precioSinDescuento: Number((valorAjustado * e.cantidad).toFixed(2)),
      descuento: 0,
      descuentoTotal: 0,
      precioConDescuento: Number((valorAjustado * e.cantidad).toFixed(2)),
      precioTotal: Number((valorAjustado * e.cantidad).toFixed(2)),
    }
  })
  if (!ventaInfo.productos?.[0]) throw new Error('Los productos ingresados no son validos')
  await createDetalleDocumento({ clienteId, ventaInfo, documentoId: newFactura.insertedId })
  await createPagosDocumento({ clienteId, ventaInfo, documentoId: newFactura.insertedId, creadoPor })
  try {
    await crearMovimientosContablesPagos({ clienteId, ventaInfo, documentoId: newFactura.insertedId })
  } catch (e) {
    console.log(`${moment().format('YYYY-MM-DD')} -- ${e.message}`, e)
  }
  return { documentoId: newFactura.insertedId }
}

const handleVentasNC = async ({ clienteId, ventaInfo, creadoPor }) => {
  ventaInfo.productos = ventaInfo.productos.filter(e => {
    return !!e.precioUnitarioNCEditable || !!e.cantidadNC
  }).map(e => {
    const valorAjustado = Number(e.precioUnitarioNCEditable || e.precioVenta)
    const setLabelAjustePrecio = e.precioUnitarioNCEditable ? ' (Ajuste de precio)' : ''
    const cantidad = Number(e.cantidadNC || e.cantidad || 0)
    return {
      ...e,
      tipoAjuste: e.precioUnitarioNCEditable ? 'precio' : 'cantidad',
      nombre: `${e.nombre}${setLabelAjustePrecio}`,
      precioVenta: valorAjustado,
      precioSinDescuento: valorAjustado * cantidad,
      descuento: 0,
      descuentoTotal: 0,
      cantidad,
      precioConDescuento: valorAjustado * cantidad,
      precioTotal: valorAjustado * cantidad
    }
  })
  // validar que existe algun movimiento de producto por almacen para el documento asociado
  const existeProducto = ventaInfo.productos.some(e => e.tipo === 'producto' && e.tipoAjuste === 'cantidad')
  if (existeProducto) {
    const movimientoOriginal = await getItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'productosPorAlmacen',
      filters: {
        documentoId: ventaInfo.facturaId ? new ObjectId(ventaInfo.facturaId) : 'null',
        tipo: 'movimiento',
        tipoMovimiento: 'salida'
      }
    })
    if (!movimientoOriginal?._id) throw new Error('Los productos del documento asociado no ha sido despachado')
  }
  const newFactura = await createDocumento({ clienteId, ventaInfo, creadoPor })
  await createDetalleDocumento({ clienteId, ventaInfo, documentoId: newFactura.insertedId })
  await createPagosDocumento({ clienteId, ventaInfo, documentoId: newFactura.insertedId, creadoPor })
  try {
    await crearMovimientosContablesPagos({ clienteId, ventaInfo, documentoId: newFactura.insertedId })
  } catch (e) {
    console.log(`${moment().format('YYYY-MM-DD')} -- ${e.message}`, e)
  }
  if (await hasInventario({ clienteId })) {
    await crearDespachosDevolucion({
      clienteId,
      ventaInfo,
      documentoId: newFactura.insertedId,
      creadoPor,
      facturaAsociada: ventaInfo.facturaId ? new ObjectId(ventaInfo.facturaId) : ''
    })
  }
  return { documentoId: newFactura.insertedId }
}

const handleVentasPedidos = async ({ clienteId, ventaInfo, creadoPor }) => {
  const newFactura = await createDocumento({ clienteId, ventaInfo, creadoPor, activo: true })
  await createDetalleDocumento({ clienteId, ventaInfo, documentoId: newFactura.insertedId })
  return { documentoId: newFactura.insertedId }
}

const handleVentasNotasEntrega = async ({ clienteId, ventaInfo, creadoPor }) => {
  const newFactura = await createDocumento({ clienteId, ventaInfo, creadoPor })
  await createDetalleDocumento({ clienteId, ventaInfo, documentoId: newFactura.insertedId })
  await createPagosDocumento({ clienteId, ventaInfo, documentoId: newFactura.insertedId, creadoPor })
  try {
    await crearMovimientosContablesPagos({ clienteId, ventaInfo, documentoId: newFactura.insertedId })
  } catch (e) {
    console.log(`${moment().format('YYYY-MM-DD')} -- ${e.message}`, e)
  }
  if (await hasInventario({ clienteId })) {
    await crearDespachos({
      clienteId,
      ventaInfo,
      documentoId: newFactura.insertedId,
      creadoPor
    })
  }
  return { documentoId: newFactura.insertedId }
}

const handleVentasPresupuestos = async ({ clienteId, ventaInfo, creadoPor }) => {
  const newFactura = await createDocumento({ clienteId, ventaInfo, creadoPor })
  await createDetalleDocumento({ clienteId, ventaInfo, documentoId: newFactura.insertedId })
  return { documentoId: newFactura.insertedId }
}

const handleVentasDevolucion = async ({ clienteId, ventaInfo, creadoPor }) => {
  ventaInfo.productos = ventaInfo.productos.filter(e => {
    return !!e.cantidadNC
  }).map(e => {
    const valorAjustado = Number((e.precioVenta || 0).toFixed(2))
    const cantidad = Number(e.cantidadNC || e.cantidad || 0)
    return {
      ...e,
      tipoAjuste: e.precioUnitarioNCEditable ? 'precio' : 'cantidad',
      nombre: e.nombre,
      precioVenta: valorAjustado,
      precioSinDescuento: valorAjustado * cantidad,
      descuento: 0,
      descuentoTotal: 0,
      cantidad,
      precioConDescuento: valorAjustado * cantidad,
      precioTotal: valorAjustado * cantidad
    }
  })
  // validar que existe algun movimiento de producto por almacen para el documento asociado
  const existeProducto = ventaInfo.productos.some(e => e.tipo === 'producto' && e.tipoAjuste === 'cantidad')
  if (existeProducto) {
    const movimientoOriginal = await getItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'productosPorAlmacen',
      filters: {
        documentoId: ventaInfo.notaEntregaId ? new ObjectId(ventaInfo.notaEntregaId) : 'null',
        tipo: 'movimiento',
        tipoMovimiento: 'salida'
      }
    })
    if (!movimientoOriginal?._id) throw new Error('Los productos del documento asociado no ha sido despachado')
  }
  const newFactura = await createDocumento({ clienteId, ventaInfo, creadoPor })
  await createDetalleDocumento({ clienteId, ventaInfo, documentoId: newFactura.insertedId })
  await createPagosDocumento({ clienteId, ventaInfo, documentoId: newFactura.insertedId, creadoPor })
  try {
    await crearMovimientosContablesPagos({ clienteId, ventaInfo, documentoId: newFactura.insertedId })
  } catch (e) {
    console.log(`${moment().format('YYYY-MM-DD')} -- ${e.message}`, e)
  }
  if (await hasInventario({ clienteId })) {
    await crearDespachosDevolucion({
      clienteId,
      ventaInfo,
      documentoId: newFactura.insertedId,
      creadoPor,
      notaEntregaAsociada: ventaInfo.notaEntregaId ? new ObjectId(ventaInfo.notaEntregaId) : ''
    })
  }
  return { documentoId: newFactura.insertedId }
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
  const infoDoc = documentosVentas.find(e => e.value === ventaInfo.documento)
  if (!infoDoc) throw new Error(`No existe el tipo de documento: ${ventaInfo.documento}`)
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
      isDespacho: ventaInfo.isDespacho,
      numeroControl: infoDoc.isFiscal && ventaInfo.useImpresoraFiscal ? ventaInfo.numeroControl : '',
      useImpresoraFiscal: infoDoc.isFiscal ? ventaInfo.useImpresoraFiscal : false,
      sucursalId: new ObjectId(ventaInfo.sucursalId),
      almacenId: new ObjectId(ventaInfo.almacenId),
      cajaId: new ObjectId(ventaInfo.cajaId),
      facturaAsociada: ventaInfo.facturaId ? new ObjectId(ventaInfo.facturaId) : '',
      notaEntregaAsociada: ventaInfo.notaEntregaId ? new ObjectId(ventaInfo.notaEntregaId) : '',
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
      diferenciaVenta: ventaInfo.totalDiferencia,
      // total establecido a credito
      totalCredito: Number(Number(ventaInfo.totalPagado.totalCredito || 0).toFixed(2)),
      totalCreditoSecundario: Number(Number(ventaInfo.totalPagado.totalCreditoSecundario || 0).toFixed(2)),
      diasCredito: ventaInfo.totalPagado.diasCredito,
      fechaVencimiento: (ventaInfo.totalPagado.diasCredito
        ? moment(ventaInfo.fecha).add(ventaInfo.totalPagado.diasCredito, 'days').toDate()
        : null
      ),
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

const createDetalleDocumento = async ({ clienteId, ventaInfo, documentoId }) => {
  const detalle = ventaInfo.productos.map(e => {
    const baseImponible = Number((Number(e.precioVenta) * Number(e.cantidad)).toFixed(2))
    const baseImponibleConDescuento = Number((e.precioTotal || 0).toFixed(2))
    const montoIva = e.iva ? baseImponibleConDescuento * e.iva / 100 : 0
    return {
      documentoId,
      tipoMovimiento: 'venta',
      tipoDocumento: ventaInfo.documento,
      tipoAjuste: e.tipoAjuste, // cantidad / precio / both // --- lo uso para las ND y NC
      productoId: new ObjectId(e._id),
      codigo: e.codigo,
      descripcion: e.descripcion,
      nombre: e.nombre,
      observacion: e.observacion,
      unidad: e.unidad,
      cantidad: e.cantidad,
      tipo: e.tipo ? e.tipo : 'producto',
      precioVenta: Number(e.precioVenta.toFixed(2)),
      precioSinDescuento: Number(e.precioSinDescuento.toFixed(2)),
      descuento: Number(e.descuento) / 100,
      descuentoTotal: Number(e.descuentoTotal.toFixed(2)),
      precioConDescuento: Number(e.precioTotal.toFixed(2)),
      baseImponible: Number(baseImponible.toFixed(2)),
      montoIva: Number(montoIva.toFixed(2)),
      ivaId: e.ivaId ? new ObjectId(e.ivaId) : '',
      iva: e.iva ? e.iva : 0,
      precioTotal: Number((baseImponibleConDescuento + montoIva).toFixed(2)),
      costoPromedio: Number(e.costoPromedio),
      fechaCreacion: moment().toDate()
    }
  })
  await createManyItemsSD({
    nameCollection: 'detalleDocumentosFiscales',
    enviromentClienteId: clienteId,
    items: detalle
  })
}

const createPagosDocumento = async ({ clienteId, ventaInfo, documentoId, creadoPor }) => {
  const pagos = ventaInfo.pagos.filter(e => e.metodo !== 'credito').map(e => ({
    documentoId,
    clienteId: new ObjectId(ventaInfo.clienteId),
    metodo: e.metodo, // caja, banco
    pago: Number(((e.monto || 0) * (e.tasa || 1)).toFixed(2)),
    pagoSecundario: Number((e.monto || 0).toFixed(2)),
    fechaPago: moment(ventaInfo.fecha).toDate(),
    referencia: e.referencia,
    banco: (e.banco && new ObjectId(e.banco)) || '',
    caja: (ventaInfo.cajaId && new ObjectId(ventaInfo.cajaId)) || '',
    porcentajeIgtf: Number(e.porcentajeIgtf || 0),
    pagoIgtf: e?.igtfPorPagar ? Number((e.monto || 0).toFixed(2)) * Number((e.porcentajeIgtf || 0).toFixed(2)) / 100 : 0,
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

const crearMovimientosContablesPagos = async ({ clienteId, ventaInfo, documentoId }) => {
  const tieneContabilidad = await hasContabilidad({ clienteId })
  if (!tieneContabilidad) return
  const ajustesSistema = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })
  const ajustesVentas = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'ventas' } })
  const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })

  if (!ajustesVentas) return
  if (!ajustesVentas.codigoComprobanteFacturacion) return

  const documento = await getItemSD({ enviromentClienteId: clienteId, nameCollection: 'documentosFiscales', filters: { _id: documentoId } })
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
            cuentaNombre: '$detalleCuenta.descripcion'
          }
        }
      }
    ]
  })
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
    console.log('error al crear comprobante en movimientos de ventas', e)
  }
  if (!comprobante) return
  const fechaCreacion = moment()
  let addSeconds = 1
  // create movimientos de pagos (debe)
  let movimientos = await Promise.all(ventaInfo.pagos.map(async (e) => {
    const referencia = e.referencia || `${infoDoc.sigla} ${documento.numeroFactura}`
    const movimiento = {
      descripcion: `DOC ${infoDoc.sigla} ${documento.numeroFactura} ${documento.clienteNombre}`,
      comprobanteId: comprobante._id,
      periodoId: comprobante.periodoId,
      fecha: momentDate(ajustesSistema.timeZone, ventaInfo.fecha).toDate(),
      fechaCreacion: moment(fechaCreacion).add(addSeconds, 'milliseconds').toDate(),
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
      // datosDebe.debe = Number((e.monto || 0).toFixed(2))
    }
    if (e.metodo === 'caja') {
      const [cuenta] = await agreggateCollectionsSD({
        nameCollection: 'ventascajas',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { _id: new ObjectId(ventaInfo.cajaId) } },
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
      // datosDebe.debe = Number((e.monto || 0).toFixed(2))
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
      fechaCreacion: moment(fechaCreacion).add(addSeconds, 'milliseconds').toDate(),
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
        fechaCreacion: moment(fechaCreacion).add(addSeconds, 'milliseconds').toDate(),
        docReferenciaAux: `${infoDoc.sigla} ${documento.numeroFactura}`,
        documento: {
          docReferencia: `${infoDoc.sigla} ${documento.numeroFactura}`
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
        fechaCreacion: moment(fechaCreacion).add(addSeconds, 'milliseconds').toDate(),
        docReferenciaAux: `${infoDoc.sigla} ${documento.numeroFactura}`,
        documento: {
          docReferencia: `${infoDoc.sigla} ${documento.numeroFactura}`
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
  // igtf
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
        fechaCreacion: moment(fechaCreacion).add(addSeconds, 'milliseconds').toDate(),
        docReferenciaAux: `${infoDoc.sigla} ${documento.numeroFactura}`,
        documento: {
          docReferencia: `${infoDoc.sigla} ${documento.numeroFactura}`
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
  // diferencia por venta
  if (documento.diferenciaVenta > 0) {
    const cuenta = await getItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'planCuenta',
      filters: {
        _id: ajustesVentas.cuentaDiferenciaVentasId
      }
    })
    if (cuenta) {
      const movimiento = {
        descripcion: `DOC ${infoDoc.sigla} ${documento.numeroFactura} ${documento.clienteNombre}`,
        comprobanteId: comprobante._id,
        periodoId: comprobante.periodoId,
        fecha: momentDate(ajustesSistema.timeZone, ventaInfo.fecha).toDate(),
        fechaCreacion: moment(fechaCreacion).add(addSeconds, 'milliseconds').toDate(),
        docReferenciaAux: `${infoDoc.sigla} ${documento.numeroFactura}`,
        documento: {
          docReferencia: `${infoDoc.sigla} ${documento.numeroFactura}`
        },
        cuentaId: cuenta._id,
        cuentaCodigo: cuenta.codigo,
        cuentaNombre: cuenta.descripcion,
        debe: 0,
        haber: Math.abs(documento.diferenciaVenta)
      }
      movimientos.push(movimiento)
    }
  }
  /*
    try {
      const existeServicios = ventaInfo.productos.some(e => e.tipo === 'venta')
      if (existeServicios) {
        const zona = await getItemSD({ nameCollection: 'ventaszonas', enviromentClienteId: clienteId, filters: { _id: new ObjectId(documento.zonaId) } })
        const servicios = ventaInfo.productos.filter(e => e.tipo === 'venta')
        for (const servicio of servicios) {
          const producto = await getItemSD({ nameCollection: 'productos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(servicio._id) } })
          const categoriaIdProducto = producto.categoria
          const categoriaPorAlmacen = await getItemSD({
            nameCollection: 'categorias',
            enviromentClienteId: clienteId,
            filters: { categoriaId: producto.categoria, tipo: 'servicios' }
          })
          const cuentaInventario = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: categoriaPorAlmacen.cuentaId } })
          const asientoContableDebe = {
            cuentaId: new ObjectId(cuentaCostoInventario._id),
            cuentaCodigo: cuentaCostoInventario.codigo,
            cuentaNombre: cuentaCostoInventario.descripcion,
            comprobanteId: comprobante._id,
            periodoId: comprobante.periodoId,
            descripcion: `DOC ${infoDoc.sigla} ${documento.numeroFactura} ${documento.clienteNombre}`,
            fecha: moment(ventaInfo.fecha).toDate(),
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `${infoDoc.sigla} ${documento.numeroFactura}`,
            documento: {
              docReferencia: `${infoDoc.sigla} ${documento.numeroFactura}`,
              docFecha: moment(ventaInfo.fecha).toDate()
            },
            debe: 0,
            haber: 0
          }
          const asientoContableHaber = {
            cuentaId: new ObjectId(cuentaInventario._id),
            cuentaCodigo: cuentaInventario.codigo,
            cuentaNombre: cuentaInventario.descripcion,
            comprobanteId: comprobante._id,
            periodoId: comprobante.periodoId,
            descripcion: `DOC ${infoDoc.sigla} ${documento.numeroFactura} ${documento.clienteNombre}`,
            fecha: moment(ventaInfo.fecha).toDate(),
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `${infoDoc.sigla} ${documento.numeroFactura}`,
            documento: {
              docReferencia: `${infoDoc.sigla} ${documento.numeroFactura}`,
              docFecha: moment(ventaInfo.fecha).toDate()
            },
            debe: 0,
            haber: 0
          }
          if (movimientosDebePorCategoria[categoriaIdProducto]) {
            movimientosDebePorCategoria[categoriaIdProducto].debe += costoProductoTotal
            movimientosHaberPorCategoria[categoriaIdProducto].haber += costoProductoTotal
          } else {
            movimientosDebePorCategoria[categoriaIdProducto] = asientoContableDebe
            movimientosDebePorCategoria[categoriaIdProducto].debe = costoProductoTotal

            movimientosHaberPorCategoria[categoriaIdProducto] = asientoContableHaber
            movimientosHaberPorCategoria[categoriaIdProducto].haber = costoProductoTotal
          }
        }
      }
    } catch (e) {
      console.log(e)
    }
  */
  if (['Nota de crédito', 'Devolución'].includes(documento.tipoDocumento)) {
    movimientos = movimientos.map(e => ({
      ...e,
      debe: e.haber,
      haber: e.debe
    }))
  }
  movimientos = movimientos.sort((a, b) => b.debe > 0 ? 1 : -1).map(e => {
    addSeconds += 2
    return {
      ...e,
      fechaCreacion: moment(fechaCreacion).add(addSeconds, 'milliseconds').toDate()
    }
  })
  await createMovimientos({
    clienteId,
    movimientos
  })
}

const crearDespachos = async ({ clienteId, ventaInfo, documentoId, facturaAsociada = '', notaEntregaAsociada = '', creadoPor }) => {
  const estado = ventaInfo.isDespacho ? 'Pendiente' : 'Despachado'
  const existeProducto = ventaInfo.productos.some(e => e.tipo === 'producto')
  if (!existeProducto) return
  try {
    let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'despacho-ventas' } }))?.contador
    if (contador) ++contador
    if (!contador) contador = 1
    const movimientoDefault = {
      fecha: moment(ventaInfo.fecha).toDate(),
      fechaVencimiento: (ventaInfo.totalPagado.diasCredito
        ? moment(ventaInfo.fecha).add(ventaInfo.totalPagado.diasCredito, 'days').toDate()
        : null
      ),
      tipo: 'despacho-ventas',
      documentoId,
      facturaAsociada,
      notaEntregaAsociada,
      tipoDocumento: ventaInfo.documento,
      almacenOrigen: ventaInfo.almacenId ? new ObjectId(ventaInfo.almacenId) : null,
      almacenDestino: null,
      zona: ventaInfo.zonaId ? new ObjectId(ventaInfo.zonaId) : null,
      estado,
      numeroMovimiento: contador,
      creadoPor: new ObjectId(creadoPor),
      fechaCreacion: moment().toDate()
    }
    const movimiento = await createItemSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      item: movimientoDefault
    })
    upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'despacho-ventas' }, update: { $set: { contador } } })

    const detalles = ventaInfo.productos.filter(e => e.tipo === 'producto').map(e => {
      return {
        movimientoId: movimiento.insertedId,
        documentoId,
        facturaAsociada,
        tipoDocumento: ventaInfo.documento,
        productoId: new ObjectId(e._id),
        codigo: e.codigo,
        descripcion: e.descripcion,
        nombre: e.nombre,
        observacion: e.observacion,
        unidad: e.unidad,
        cantidad: e.cantidad,
        fechaCreacion: moment().toDate()
      }
    })
    if (detalles.length < 1) return
    await createManyItemsSD({
      nameCollection: 'detalleMovimientos',
      enviromentClienteId: clienteId,
      items: detalles
    })
    if (estado === 'Despachado') {
      await crearMovimientoInventario({
        clienteId,
        ventaInfo,
        documentoId,
        facturaAsociada,
        notaEntregaAsociada,
        creadoPor,
        movimientoId: movimiento.insertedId,
        almacenOrigenId: ventaInfo.almacenId ? new ObjectId(ventaInfo.almacenId) : null,
        almacenDestinoId: null,
        tipoMovimiento: 'salida',
        fecha: ventaInfo.fecha
      })
    }
  } catch (e) {
    console.log('error despacho de ventas: ', e)
  }
}

const crearDespachosDevolucion = async ({ clienteId, ventaInfo, documentoId, facturaAsociada = '', notaEntregaAsociada = '', creadoPor }) => {
  const estado = 'Pendiente'
  const existeProducto = ventaInfo.productos.some(e => e.tipo === 'producto' && e.tipoAjuste === 'cantidad')
  if (!existeProducto) return
  try {
    let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'devolucion-ventas' } }))?.contador
    if (contador) ++contador
    if (!contador) contador = 1
    const almacenDevoluciones = await getItemSD({
      nameCollection: 'almacenes',
      enviromentClienteId: clienteId,
      filters: { nombre: 'Devoluciones' }
    })
    if (!almacenDevoluciones) return
    const movimientoDefault = {
      fecha: moment(ventaInfo.fecha).toDate(),
      fechaVencimiento: (ventaInfo.totalPagado.diasCredito
        ? moment(ventaInfo.fecha).add(ventaInfo.totalPagado.diasCredito, 'days').toDate()
        : null
      ),
      tipo: 'devolucion-ventas',
      documentoId,
      facturaAsociada,
      notaEntregaAsociada,
      tipoDocumento: ventaInfo.documento,
      almacenOrigen: null,
      almacenDestino: almacenDevoluciones._id,
      zona: ventaInfo.zonaId ? new ObjectId(ventaInfo.zonaId) : null,
      estado,
      numeroMovimiento: contador,
      creadoPor: new ObjectId(creadoPor),
      fechaCreacion: moment().toDate()
    }
    const movimiento = await createItemSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      item: movimientoDefault
    })
    upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'devolucion-ventas' }, update: { $set: { contador } } })

    const detalles = ventaInfo.productos.filter(e => e.tipo === 'producto' && e.tipoAjuste === 'cantidad').map(e => {
      return {
        movimientoId: movimiento.insertedId,
        documentoId,
        facturaAsociada,
        tipoDocumento: ventaInfo.documento,
        productoId: new ObjectId(e._id),
        codigo: e.codigo,
        descripcion: e.descripcion,
        nombre: e.nombre,
        observacion: e.observacion,
        unidad: e.unidad,
        cantidad: e.cantidad,
        fechaCreacion: moment().toDate()
      }
    })
    if (detalles.length < 1) return
    await createManyItemsSD({
      nameCollection: 'detalleMovimientos',
      enviromentClienteId: clienteId,
      items: detalles
    })
    /* await crearMovimientoInventario({
      clienteId,
      ventaInfo,
      documentoId,
      facturaAsociada,
      notaEntregaAsociada,
      creadoPor,
      movimientoId: movimiento.insertedId,
      almacenOrigenId: null,
      almacenDestinoId: almacenDevoluciones._id,
      tipoMovimiento: 'entrada',
      fecha: ventaInfo.fecha
    }) */

    const tieneContabilidad = await hasContabilidad({ clienteId })
    const documento = await getItemSD({ enviromentClienteId: clienteId, nameCollection: 'documentosFiscales', filters: { _id: documentoId } })
    if (!documento) return
    const infoDoc = documentosVentas.find(e => e.value === documento.tipoDocumento)
    if (!infoDoc) return
    const ajustesSistema = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })
    const ajustesVentas = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'ventas' } })

    // if (!ajustesVentas?.codigoComprobanteFacturacion) return
    const zona = await getItemSD({ nameCollection: 'ventaszonas', enviromentClienteId: clienteId, filters: { _id: new ObjectId(documento.zonaId) } })
    let comprobante
    if (tieneContabilidad) {
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
        console.log('error al crear comprobante en movimientos despachos de ventas', e)
      }
    }
    const devoluciones = []
    let asientosContables = []
    const movimientosDebePorCategoria = {}
    const movimientosHaberPorCategoria = {}
    for (const e of ventaInfo.productos.filter(e => e.tipo === 'producto' && e.tipoAjuste === 'cantidad')) {
      const movimientoOriginal = await getItemSD({
        enviromentClienteId: clienteId,
        nameCollection: 'productosPorAlmacen',
        filters: {
          documentoId: facturaAsociada || notaEntregaAsociada || 'null',
          productoId: new ObjectId(e._id),
          tipo: 'movimiento',
          tipoMovimiento: 'salida'
        }
      })
      devoluciones.push({
        // detalles de la venta
        documentoId,
        tipoDocumento: ventaInfo.documento,
        facturaAsociada,
        notaEntregaAsociada,
        productoId: new ObjectId(e._id),
        movimientoId: movimiento.insertedId,
        cantidad: Number(e.cantidad),
        almacenId: almacenDevoluciones._id,
        almacenOrigen: null,
        almacenDestino: almacenDevoluciones._id,
        tipo: 'devolucion',
        tipoMovimiento: 'entrada',
        fechaMovimiento: moment(ventaInfo.fecha).toDate(),
        lote: movimientoOriginal.lote,
        fechaVencimiento: moment(movimientoOriginal.fechaVencimiento).toDate(),
        fechaIngreso: moment(movimientoOriginal.fechaIngreso).toDate(),
        costoUnitario: movimientoOriginal.costoUnitario,
        costoPromedio: movimientoOriginal.costoPromedio,
        creadoPor: new ObjectId(creadoPor)
      })
      if (tieneContabilidad) {
        try {
          const costoProductoTotal = movimientoOriginal.costoPromedio * Number(e.cantidad)
          const producto = await getItemSD({ nameCollection: 'productos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(e._id) } })
          const categoriaIdProducto = producto.categoria
          const categoriaPorAlmacen = await getItemSD({
            nameCollection: 'categoriaPorAlmacen',
            enviromentClienteId: clienteId,
            filters: { categoriaId: producto.categoria, almacenId: almacenDevoluciones._id }
          })
          const cuentaInventario = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: categoriaPorAlmacen.cuentaId } })
          const cuentaCostoInventario = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: categoriaPorAlmacen.cuentaCostoVentaId } })
          const asientoContableHaber = {
            cuentaId: new ObjectId(cuentaCostoInventario._id),
            cuentaCodigo: cuentaCostoInventario.codigo,
            cuentaNombre: cuentaCostoInventario.descripcion,
            comprobanteId: comprobante._id,
            periodoId: comprobante.periodoId,
            descripcion: `DOC ${infoDoc.sigla} ${documento.numeroFactura} ${documento.clienteNombre}`,
            fecha: moment(ventaInfo.fecha).toDate(),
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `${infoDoc.sigla} ${documento.numeroFactura}`,
            documento: {
              docReferencia: `${infoDoc.sigla} ${documento.numeroFactura}`,
              docFecha: moment(ventaInfo.fecha).toDate()
            },
            debe: 0,
            haber: 0
          }
          const asientoContableDebe = {
            cuentaId: new ObjectId(cuentaInventario._id),
            cuentaCodigo: cuentaInventario.codigo,
            cuentaNombre: cuentaInventario.descripcion,
            comprobanteId: comprobante._id,
            periodoId: comprobante.periodoId,
            descripcion: `DOC ${infoDoc.sigla} ${documento.numeroFactura} ${documento.clienteNombre}`,
            fecha: moment(ventaInfo.fecha).toDate(),
            fechaCreacion: moment().toDate(),
            docReferenciaAux: `${infoDoc.sigla} ${documento.numeroFactura}`,
            documento: {
              docReferencia: `${infoDoc.sigla} ${documento.numeroFactura}`,
              docFecha: moment(ventaInfo.fecha).toDate()
            },
            debe: 0,
            haber: 0
          }
          if (movimientosDebePorCategoria[categoriaIdProducto]) {
            movimientosDebePorCategoria[categoriaIdProducto].debe += costoProductoTotal
            movimientosHaberPorCategoria[categoriaIdProducto].haber += costoProductoTotal
          } else {
            movimientosDebePorCategoria[categoriaIdProducto] = asientoContableDebe
            movimientosDebePorCategoria[categoriaIdProducto].debe = costoProductoTotal

            movimientosHaberPorCategoria[categoriaIdProducto] = asientoContableHaber
            movimientosHaberPorCategoria[categoriaIdProducto].haber = costoProductoTotal
          }
        } catch (e) {
          console.log(e)
        }
      }
    }
    try {
      if (tieneContabilidad) {
        for (const categoriaId in movimientosDebePorCategoria) {
          asientosContables.push(movimientosDebePorCategoria[categoriaId], movimientosHaberPorCategoria[categoriaId])
        }
        let addSeconds = 1
        asientosContables = asientosContables.sort((a, b) => b.debe > 0 ? 1 : -1).map(e => {
          addSeconds += 2
          return {
            ...e,
            fechaCreacion: moment(moment()).add(addSeconds, 'milliseconds').toDate()
          }
        })
        createManyItemsSD({
          nameCollection: 'detallesComprobantes',
          enviromentClienteId: clienteId,
          items: asientosContables
        })
      }
    } catch (e) {
      console.log('error despacho de ventas: ', e)
    }
    await createManyItemsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      items: devoluciones
    })
  } catch (e) {
    console.log('error despacho de ventas: ', e)
  }
}

const crearMovimientoInventario = async ({
  clienteId,
  documentoId,
  facturaAsociada = '',
  notaEntregaAsociada = '',
  creadoPor,
  movimientoId,
  almacenOrigenId,
  almacenDestinoId,
  tipoMovimiento,
  fecha
}) => {
  const tieneContabilidad = await hasContabilidad({ clienteId })
  const detalleMovimientos = await getCollectionSD({
    enviromentClienteId: clienteId,
    nameCollection: 'detalleMovimientos',
    filters: { movimientoId }
  })

  const documento = await getItemSD({ enviromentClienteId: clienteId, nameCollection: 'documentosFiscales', filters: { _id: documentoId } })
  if (!documento) return

  const infoDoc = documentosVentas.find(e => e.value === documento.tipoDocumento)
  if (!infoDoc) return
  const ajustesSistema = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })
  const ajustesVentas = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'ventas' } })

  // if (!ajustesVentas?.codigoComprobanteFacturacion) return
  const zona = await getItemSD({ nameCollection: 'ventaszonas', enviromentClienteId: clienteId, filters: { _id: new ObjectId(documento.zonaId) } })
  let comprobante

  const mesPeriodo = momentDate(ajustesSistema.timeZone, fecha).format('YYYY/MM')
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
    console.log('error al crear comprobante en movimientos despachos de ventas', e)
  }
  // if (!comprobante) return

  const detallesCrear = []
  let asientosContables = []
  // si la contabilidad falla, se quita todo lo de crear contabilidad para que no se cree mal
  // si la contabilidad falla igual debe hacerse la venta
  let doContabilidad = true
  const movimientosDebePorCategoria = {}
  const movimientosHaberPorCategoria = {}
  for (const detalle of detalleMovimientos) {
    let categoriaIdProducto = ''
    const datosMovivientoPorProducto = await agreggateCollectionsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { productoId: new ObjectId(detalle.productoId), almacenId: almacenOrigenId || almacenDestinoId } },
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
        { $sort: { fechaVencimiento: 1, lote: 1 } }
      ]
    })
    let asientoContableHaber = {}
    let asientoContableDebe = {}
    if (doContabilidad && tieneContabilidad && comprobante && ajustesVentas?.codigoComprobanteFacturacion) {
      try {
        const producto = await getItemSD({ nameCollection: 'productos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(detalle.productoId) } })
        categoriaIdProducto = producto.categoria
        const categoriaPorAlmacen = await getItemSD({
          nameCollection: 'categoriaPorAlmacen',
          enviromentClienteId: clienteId,
          filters: { categoriaId: producto.categoria, almacenId: almacenOrigenId || almacenDestinoId }
        })
        const cuentaInventario = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: categoriaPorAlmacen.cuentaId } })
        const cuentaCostoInventario = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: categoriaPorAlmacen.cuentaCostoVentaId } })
        asientoContableDebe = {
          cuentaId: new ObjectId(cuentaCostoInventario._id),
          cuentaCodigo: cuentaCostoInventario.codigo,
          cuentaNombre: cuentaCostoInventario.descripcion,
          comprobanteId: comprobante._id,
          periodoId: comprobante.periodoId,
          descripcion: `DOC ${infoDoc.sigla} ${documento.numeroFactura} ${documento.clienteNombre}`,
          fecha: moment(fecha).toDate(),
          fechaCreacion: moment().toDate(),
          docReferenciaAux: `${infoDoc.sigla} ${documento.numeroFactura}`,
          documento: {
            docReferencia: `${infoDoc.sigla} ${documento.numeroFactura}`,
            docFecha: moment(fecha).toDate()
          },
          debe: 0,
          haber: 0
        }
        asientoContableHaber = {
          cuentaId: new ObjectId(cuentaInventario._id),
          cuentaCodigo: cuentaInventario.codigo,
          cuentaNombre: cuentaInventario.descripcion,
          comprobanteId: comprobante._id,
          periodoId: comprobante.periodoId,
          descripcion: `DOC ${infoDoc.sigla} ${documento.numeroFactura} ${documento.clienteNombre}`,
          fecha: moment(fecha).toDate(),
          fechaCreacion: moment().toDate(),
          docReferenciaAux: `${infoDoc.sigla} ${documento.numeroFactura}`,
          documento: {
            docReferencia: `${infoDoc.sigla} ${documento.numeroFactura}`,
            docFecha: moment(fecha).toDate()
          },
          debe: 0,
          haber: 0
        }
      } catch (e) {
        console.log('error contabilidad ventas mov inventario', e.message)
        doContabilidad = false
      }
    }
    let costoProductoTotal = 0
    for (const movimientos of datosMovivientoPorProducto) {
      if (detalle.cantidad === 0) break
      if (detalle.cantidad >= movimientos.cantidad) {
        costoProductoTotal += movimientos.costoPromedio * Number(movimientos.cantidad)
        detallesCrear.push({
          // detalles de la venta
          documentoId: documento._id,
          tipoDocumento: documento.tipoDocumento,
          facturaAsociada,
          notaEntregaAsociada,
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(movimientos.cantidad),
          almacenId: almacenOrigenId || almacenDestinoId,
          almacenOrigen: almacenOrigenId,
          almacenDestino: almacenDestinoId,
          tipo: 'movimiento',
          tipoMovimiento,
          lote: movimientos.lote,
          fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
          fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
          fechaMovimiento: moment(fecha).toDate(),
          costoUnitario: movimientos.costoUnitario,
          costoPromedio: movimientos.costoPromedio,
          creadoPor: new ObjectId(creadoPor)
        })
        detalle.cantidad -= movimientos.cantidad
        continue
      }
      if (detalle.cantidad < movimientos.cantidad) {
        costoProductoTotal += movimientos.costoPromedio * detalle.cantidad
        detallesCrear.push({
          documentoId: documento._id,
          tipoDocumento: documento.tipoDocumento,
          facturaAsociada,
          notaEntregaAsociada,
          productoId: new ObjectId(detalle.productoId),
          movimientoId: new ObjectId(detalle.movimientoId),
          cantidad: Number(detalle.cantidad),
          almacenId: almacenOrigenId || almacenDestinoId,
          almacenOrigen: almacenOrigenId,
          almacenDestino: almacenDestinoId,
          tipo: 'movimiento',
          tipoMovimiento,
          lote: movimientos.lote,
          fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
          fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
          fechaMovimiento: moment(fecha).toDate(),
          costoUnitario: movimientos.costoUnitario,
          costoPromedio: movimientos.costoPromedio,
          creadoPor: new ObjectId(creadoPor)
        })
        detalle.cantidad = 0
        break
      }
    }
    if (tieneContabilidad && doContabilidad) {
    // si exxiste debe, existe el haber tambien
      let debeKey = 'debe'
      let haberKey = 'haber'
      if (['Nota de crédito', 'Devolución'].includes(documento.tipoDocumento)) {
        debeKey = 'haber'
        haberKey = 'debe'
      }
      if (movimientosDebePorCategoria[categoriaIdProducto]) {
        movimientosDebePorCategoria[categoriaIdProducto][debeKey] += costoProductoTotal
        movimientosHaberPorCategoria[categoriaIdProducto][haberKey] += costoProductoTotal
      } else {
        movimientosDebePorCategoria[categoriaIdProducto] = asientoContableDebe
        movimientosDebePorCategoria[categoriaIdProducto][debeKey] = costoProductoTotal

        movimientosHaberPorCategoria[categoriaIdProducto] = asientoContableHaber
        movimientosHaberPorCategoria[categoriaIdProducto][haberKey] = costoProductoTotal
      }
    }
    /* asientoContableHaber.debe = 0
    asientoContableHaber.haber = costoProductoTotal
    asientoContableDebe.debe = costoProductoTotal
    asientoContableDebe.haber = 0
    asientosContables.push(asientoContableDebe, asientoContableHaber) */
  }
  if (tieneContabilidad && doContabilidad) {
    // si exxiste debe, existe el haber tambien
    for (const categoriaId in movimientosDebePorCategoria) {
      asientosContables.push(movimientosDebePorCategoria[categoriaId], movimientosHaberPorCategoria[categoriaId])
    }
    let addSeconds = 1
    const fechaCreacion = moment()
    asientosContables = asientosContables.sort((a, b) => b.debe > 0 ? 1 : -1).map(e => {
      addSeconds += 2
      return {
        ...e,
        fechaCreacion: moment(fechaCreacion).add(addSeconds, 'milliseconds').toDate()
      }
    })
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
}
