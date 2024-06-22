import { subDominioName } from '../../constants.js'
import { agreggateCollectionsSD, formatCollectionName, getItemSD } from '../../utils/dataBaseConfing.js'

export const reporteProductos = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina } = req.body
  console.log(req.body)
  try {
    const count = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { activo: { $ne: false } } },
        { $count: 'total' }
      ]
    })
    if (itemsPorPagina || pagina) {
      const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
      const almacenAuditoria = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Auditoria' } })
      const productsList = await agreggateCollectionsSD({
        nameCollection: 'productos',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { activo: { $ne: false } } },
          { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
          { $limit: Number(itemsPorPagina) },
          {
            $lookup: {
              from: productorPorAlamcenCollection,
              localField: '_id',
              foreignField: 'productoId',
              pipeline: [
                { $match: { almacenId: { $ne: almacenAuditoria._id } } },
                {
                  $group: {
                    _id: '$costoPromedio',
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
                    salida: '$salida',
                    costoPromedio: '$_id'
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
              cantidad: '$detalleCantidadProducto.cantidad',
              entrada: '$detalleCantidadProducto.entrada',
              salida: '$detalleCantidadProducto.salida',
              costoPromedio: '$detalleCantidadProducto.costoPromedio',
              costoPromedioTotal: {
                $multiply: ['$detalleCantidadProducto.cantidad', '$detalleCantidadProducto.costoPromedio']
              }
            }
          }
        ]
      })
      // console.log(productsList)
      return res.status(200).json({ productsList })
    }
    return res.status(200).json({ count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos de los productos' + e.message })
  }
}
