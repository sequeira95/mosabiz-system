import { ObjectId } from 'mongodb'
import { agreggateCollections, agreggateCollectionsSD, bulkWriteSD, createItemSD, createManyItemsSD, deleteItemSD, deleteManyItemsSD, formatCollectionName, getCollection, getCollectionSD, getItem, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { deleteImg, uploadImg } from '../../../utils/cloudImage.js'
import { subDominioName } from '../../../constants.js'
import moment from 'moment-timezone'

export const getData = async (req, res) => {
  const { clienteId, fechaDia, userId } = req.body
  try {
    const almacenNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
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
        /* {
          $match: {
            usuarios: { $exists: true, $elemMatch: { $eq: new ObjectId(userId) } }
          }
        }, */
        {
          $project: {
            _id: 1,
            nombre: 1,
            almacenes: 1
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
    const query = { tipo: 'pedidos', numero: { $gte: 0 }, activo: true }
    if (search) {
      query.numeroString = { $regex: `^${search}` }
    }
    const pedidosVentas = await agreggateCollectionsSD({
      nameCollection: 'documentosVentas',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: query },
        {
          $project: {
            _id: 1,
            numero: 1
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
  const TipoDocumentosFiscales = [
    'Factura', 'Nota de crédito', 'Nota de débito'
  ]
  try {
    if (TipoDocumentosFiscales.includes(ventaInfo.documento)) {
      console.log('fiscal')
      await handleVentaFiscal({ clienteId, ventaInfo, req })
    } else {
      console.log('ordinaria')
      await handleVentaFiscal({ clienteId, ventaInfo, req })
    }
    return res.status(200).json({ message: 'Venta finalizada con exito' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de generar la venta ' + e.message })
  }
}
const handleVentaFiscal = async ({ clienteId, ventaInfo, req }) => {
  const vendedor = await getItemSD({ nameCollection: 'personas', filters: { usuarioId: new ObjectId(req.uid) } })
  if (!vendedor) throw new Error('Vendedor no existe en la base de datos')
  const clienteOwn = await getItemSD({ nameCollection: 'clientes', filters: { _id: new ObjectId(clienteId) } })
  if (!clienteOwn) throw new Error('Propietario no existe en la base de datos')
  const sucursal = await getItemSD({ nameCollection: 'clientes', enviromentClienteId: clienteId, filters: { _id: new ObjectId(ventaInfo.sucursalId) } })
  if (!sucursal) throw new Error('La sucursal no existe en la base de datos')

  let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: `venta-${ventaInfo.documento}` } }))?.contador
  if (contador) ++contador
  if (!contador) contador = 1
  // crea doc fiscal
  const newFactura = await createItemSD({
    nameCollection: 'documentosFiscales',
    enviromentClienteId: clienteId,
    item: {
      // datos del documento
      tipoMovimiento: 'venta',
      fecha: moment(ventaInfo.fecha).toDate(),
      numeroFactura: String(contador),
      tipoDocumento: ventaInfo.documento,
      // numeroControl: ventaInfo.numeroControl,
      sucursalId: new ObjectId(ventaInfo.sucursalId),
      almacenId: new ObjectId(ventaInfo.almacenId),
      // datos de monedas
      tasaDia: Number(ventaInfo.tasa) || 0,
      moneda: ventaInfo.moneda,
      monedaSecundaria: ventaInfo.monedaSecundaria,
      // datos de montos e impuestos
      hasIgtf: ventaInfo.totalPagado.igtf > 0,
      baseImponible: Number(Number(ventaInfo.totalMonedaPrincial.baseImponible).toFixed(2)),
      iva: Number(Number(ventaInfo.totalMonedaPrincial.iva).toFixed(2)),
      total: Number(Number(ventaInfo.totalMonedaPrincial.total).toFixed(2)),
      baseImponibleSecundaria: Number(Number(ventaInfo.totalMonedaSecundaria.baseImponible).toFixed(2)),
      ivaSecundaria: Number(Number(ventaInfo.totalMonedaSecundaria.iva).toFixed(2)),
      totalSecundaria: Number(Number(ventaInfo.totalMonedaSecundaria.total).toFixed(2)),
      totalIgtf: Number(Number(ventaInfo.totalPagado.igtf).toFixed(2)),
      totalPagado: Number(Number(ventaInfo.totalPagado.total).toFixed(2)),
      // datos del vendedor
      creadoPor: new ObjectId(req.uid),
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
  // crea detalle de los productos
  const detalle = ventaInfo.productos.map(e => {
    const baseImponible = Number(e.precioVenta) * Number(e.cantidad)
    const montoIva = e.iva ? baseImponible * e.iva / 100 : 0
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
      precioVenta: Number(e.precioVenta),
      baseImponible,
      montoIva,
      iva: e.iva ? e.iva : 0,
      precioTotal: baseImponible + montoIva
    }
  })
  await createManyItemsSD({
    nameCollection: 'detalleDocumentosFiscales',
    enviromentClienteId: clienteId,
    items: detalle
  })
  // crea el pago de las ventas
  const pagos = ventaInfo.pagos.map(e => ({
    documentoId: newFactura.insertedId,
    clienteId: new ObjectId(ventaInfo.clienteId),
    pago: Number((e.monto || 0).toFixed(2)),
    fechaPago: moment(ventaInfo.fecha).toDate(),
    referencia: e.referencia,
    banco: new ObjectId(e.banco),
    porcentajeIgtf: Number(e.porcentajeIgtf || 0),
    pagoIgtf: e?.igtfPorPagar ? Number((e.monto || 0).toFixed(2)) * Number((e.monto || 0).toFixed(2)) / 100 : 0,
    moneda: ventaInfo.moneda,
    monedaSecundaria: e.moneda,
    tasa: e.tasa,
    tipo: `venta-${ventaInfo.documento}`,
    creadoPor: new ObjectId(req.uid),
    credito: e.credito
  }))
  createManyItemsSD({
    nameCollection: 'transacciones',
    enviromentClienteId: clienteId,
    items: pagos
  })
}
const handleVentaOrdinaria = async ({ clienteId, ventaInfo, req }) => {
  
}
