import { agreggateCollections, agreggateCollectionsSD, formatCollectionName, getCollectionSD } from '../../utils/dataBaseConfing.js'
import { subDominioName } from '../../constants.js'

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
    return res.status(200).json({ iva })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las retenciones de ISLR ' + e.message })
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
