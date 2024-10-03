import { ObjectId } from 'mongodb'
import { subDominioName, tiposDocumentosFiscales } from '../../constants.js'
import { agreggateCollectionsSD, formatCollectionName, getCollection, getItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment-timezone'
import { momentDate } from '../../utils/momentDate.js'

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
export const reporteRotacionInventario = async (req, res) => {
  const { clienteId, desde, hasta, timeZone } = req.body
  console.log(req.body)
  try {
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const groupMeses = {}
    const projectMeses = {}
    let mesesSeleccionados = 0
    const addMeses = []
    const fecha = momentDate(timeZone, desde).endOf('month')
    for (let i = 0; i < meses.length; i++) {
      console.log({ fecha })
      if (fecha.isAfter(hasta)) break
      mesesSeleccionados = i + 1
      groupMeses[meses[i] + 'Entrada'] = {
        $sum: {
          $cond: {
            if: {
              $and: [
                { $lte: ['$fechaMovimiento', fecha.endOf('month').toDate()] },
                { $eq: ['$tipoMovimiento', 'entrada'] }]
            },
            then: '$cantidad',
            else: 0
          }
        }
      }
      groupMeses[meses[i] + 'Salida'] = {
        $sum: {
          $cond: {
            if: {
              $and: [
                { $lte: ['$fechaMovimiento', fecha.endOf('month').toDate()] },
                { $eq: ['$tipoMovimiento', 'salida'] }]
            },
            then: '$cantidad',
            else: 0
          }
        }
      }
      groupMeses[meses[i] + 'LastCosto'] = {
        $last: {
          $cond: {
            if: {
              $and: [
                { $lte: ['$fechaMovimiento', fecha.endOf('month').toDate()] },
                { $gt: ['$costoPromedio', 0] }
              ]
            },
            // if: { $lte: ['$fechaMovimiento', fecha.endOf('month').toDate()] },
            then: '$costoPromedio',
            else: 0
          }
        }
      }
      projectMeses[meses[i] + 'Entrada'] = 1
      projectMeses[meses[i] + 'Salida'] = 1
      projectMeses[meses[i] + 'LastCosto'] = 1
      projectMeses[meses[i]] = { $multiply: [{ $subtract: [`$${meses[i]}Entrada`, `$${meses[i]}Salida`] }, `$${meses[i]}LastCosto`] }
      addMeses.push(`$detalleRotacion.${meses[i]}`)
      fecha.set('month', i + 1)
    }
    console.log(groupMeses, projectMeses, fecha, mesesSeleccionados, addMeses.join(', '))
    const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
    // const movimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'movimientos' })
    const almacenes = await getCollection({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Auditoria', 'Devoluciones', 'Transito'] } } })
    const almacenesInvalidSalida = almacenes.map(e => new ObjectId(e._id))
    // const tiposDocumentosParaRotacion = ['solicitudInterna', tiposDocumentosFiscales.factura, tiposDocumentosFiscales.notaDebito, tiposDocumentosFiscales.notaEntrega]
    const productsList = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { activo: { $ne: false } } },
        // { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        // { $limit: Number(itemsPorPagina) },
        {
          $lookup: {
            from: productorPorAlamcenCollection,
            localField: '_id',
            foreignField: 'productoId',
            pipeline: [
              {
                $match: {
                  fechaMovimiento: { $gte: moment(desde).toDate(), $lte: moment(hasta).toDate() },
                  tipoMovimiento: 'salida',
                  tipo: { $ne: 'ajuste' }
                }
              },
              {
                $match: {
                  almacenId: { $nin: almacenesInvalidSalida },
                  $or: [
                    { documentoId: { $exists: true } },
                    { tipoDocumento: 'solicitudInterna' }
                  ]
                }
              },
              /* {
                $lookup: {
                  from: movimientosCollection,
                  localField: 'movimientoId',
                  foreignField: '_id',
                  pipeline: [
                    {
                      $project: {
                        tipoMovimientoReferencia: '$tipo'
                      }
                    }
                  ],
                  as: 'detalleMovimiento'
                }
              },
              { $unwind: { path: '$detalleMovimiento', preserveNullAndEmptyArrays: true } },
              {
                $match: {
                  'detalleMovimiento.tipoMovimientoReferencia': { $in: ['solicitudInterna', 'despacho-ventas'] }
                }
              }, */
              {
                $addFields: {
                  diferenciaSalida: {
                    $dateDiff: {
                      startDate: '$fechaIngreso',
                      endDate: '$fechaMovimiento',
                      unit: 'day',
                      timezone: timeZone
                    }
                  },
                  mes: {
                    $month: {
                      date: '$fechaMovimiento',
                      timezone: timeZone
                    }
                  }
                }
              },
              {
                $group: {
                  _id: null,
                  sumDiff: { $sum: '$diferenciaSalida' },
                  cantidadSalidas: { $sum: 1 },
                  totalCostoPromedioSalida: { $sum: '$costoPromedio' }
                }
              }
            ],
            as: 'detallePromedioSalida'
          }
        },
        { $unwind: { path: '$detallePromedioSalida', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: productorPorAlamcenCollection,
            localField: '_id',
            foreignField: 'productoId',
            pipeline: [
              {
                $match: {
                  almacenId: { $ne: new ObjectId(almacenes.find(e => e.nombre === 'Auditoria')?._id) }
                }
              },
              {
                $group: {
                  _id: 0,
                  ...groupMeses
                }
              },
              { $project: projectMeses }
            ],
            as: 'detalleRotacion'
          }
        },
        { $unwind: { path: '$detalleRotacion', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            codigo: '$codigo',
            nombre: '$nombre',
            descripcion: '$descripcion',
            unidad: '$unidad',
            sumaTotalSalidas: '$detallePromedioSalida.sumDiff',
            cantidadSalidasTotales: '$detallePromedioSalida.cantidadSalidas',
            promedioSalida: { $divide: ['$detallePromedioSalida.sumDiff', '$detallePromedioSalida.cantidadSalidas'] },
            totalCostoPromedioSalida: { $round: ['$detallePromedioSalida.totalCostoPromedioSalida', 2] },
            totalPromedioRotacion: { $round: [{ $divide: [{ $add: [addMeses.join(', ')] }, mesesSeleccionados] }, 2] },
            detalleRotacion: '$detalleRotacion'
          }
        }
      ]
    })
    return res.status(200).json({ productsList })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos de los productos' + e.message })
  }
}
