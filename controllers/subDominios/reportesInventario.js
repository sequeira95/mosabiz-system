import { ObjectId } from 'mongodb'
import { subDominioName, tipoMovimientos } from '../../constants.js'
import { agreggateCollectionsSD, createItemSD, createManyItemsSD, deleteManyItemsSD, formatCollectionName, getCollectionSD, getItem, getItemSD, updateItem, upsertItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment-timezone'
import { momentDate } from '../../utils/momentDate.js'
import { generateKeySync, randomBytes } from 'node:crypto'

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
                {
                  $match: {
                    $and: [
                      { almacenId: { $ne: almacenAuditoria._id } },
                      { almacenId: { $exists: true } }
                    ]
                  }
                },
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
              costoPromedio: '$costoPromedio',
              costoPromedioTotal: {
                $multiply: ['$detalleCantidadProducto.cantidad', '$costoPromedio']
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
export const reporteProductosAlmacen = async (req, res) => {
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
      const almacenesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
      const almacenesInvalid = await getCollectionSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Auditoria', 'Devoluciones'] } } })
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
                {
                  $match: {
                    $and: [
                      { almacenId: { $nin: almacenesInvalid.map(e => e._id) } },
                      { almacenId: { $exists: true } }
                    ]
                  }
                },
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
                    entrada: '$entrada',
                    salida: '$salida',
                    // costoPromedio: '$_id',
                    almacenId: '$detalleAlmacen._id',
                    almacenNombre: '$detalleAlmacen.nombre'
                  }
                }
              ],
              as: 'detalleCantidadProducto'
            }
          },
          { $unwind: { path: '$detalleCantidadProducto', preserveNullAndEmptyArrays: false } },
          {
            $project: {
              codigo: '$codigo',
              nombre: '$nombre',
              descripcion: '$descripcion',
              unidad: '$unidad',
              cantidad: '$detalleCantidadProducto.cantidad',
              entrada: '$detalleCantidadProducto.entrada',
              salida: '$detalleCantidadProducto.salida',
              costoPromedio: '$costoPromedio',
              costoPromedioTotal: {
                $multiply: ['$detalleCantidadProducto.cantidad', { $ifNull: ['$costoPromedio', 0] }]
              },
              almacenId: '$detalleCantidadProducto.almacenId',
              almacenNombre: '$detalleCantidadProducto.almacenNombre'
            }
          },
          {
            $group: {
              _id: {
                almacenId: '$almacenId',
                almacenNombre: '$almacenNombre'
              },
              productos: { $push: '$$ROOT' }
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
  const { clienteId, desde, hasta, timeZone, itemsPorPagina, pagina } = req.body
  console.log(req.body)
  try {
    // const almacenes = await getCollection({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Auditoria', 'Devoluciones', 'Transito'] } } })
    const count = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { activo: { $ne: false } } },
        { $count: 'total' }
      ]
    })
    if (itemsPorPagina || pagina) {
      // const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      const groupMeses = {}
      const segundoGroupMeses = {}
      const projectMeses = {}
      const mesesSeleccionados = moment(hasta).diff(moment(desde), 'months') + 1
      console.log({ mesesSeleccionados })
      const addMeses = []
      const fecha = moment(momentDate(timeZone, desde).endOf('month'))
      for (let i = 0; i < mesesSeleccionados; i++) {
        if (fecha.isAfter(hasta)) break
        console.log({ fecha: fecha.endOf('month') })
        console.log(`${fecha.format('YYYY-MM')}`)
        groupMeses[`${fecha.format('YYYY-MM')}Entrada`] = {
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
        groupMeses[`${fecha.format('YYYY-MM')}Salida`] = {
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
        segundoGroupMeses[`${fecha.format('YYYY-MM')}Entrada`] = {
          $first: `$${fecha.format('YYYY-MM')}Entrada`
        }
        segundoGroupMeses[`${fecha.format('YYYY-MM')}Salida`] = {
          $first: `$${fecha.format('YYYY-MM')}Salida`
        }
        segundoGroupMeses[`${fecha.format('YYYY-MM')}LastCosto`] = {
          $push: {
            $cond: {
              if: {
                $lte: ['$ultimoCosto.dateFormat', moment(fecha).startOf('month').toDate()]
                /* $and: [
                  { $eq: ['$ultimoCosto.year', Number(fecha.format('YYYY'))] },
                  { $lte: ['$ultimoCosto.month', Number(fecha.format('M'))] }
                ] */
              },
              then: '$ultimoCosto.ultimoCostoPromedio',
              else: 0
            }
          }
        }
        /* groupMeses[meses[i] + 'LastCosto'] = {
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
              else: '$costoPromedio'
            }
          }
        } */
        projectMeses[`${fecha.format('YYYY-MM')}Entrada`] = 1
        projectMeses[`${fecha.format('YYYY-MM')}Salida`] = 1
        projectMeses[`${fecha.format('YYYY-MM')}LastCosto`] = {
          $last: {
            $filter: {
              input: `$${fecha.format('YYYY-MM')}LastCosto`,
              as: 'item',
              cond: { $ne: ['$$item', 0] }
            }
          }
        }
        projectMeses[`${fecha.format('YYYY-MM')}`] = {
          $multiply: [{ $subtract: [`$${fecha.format('YYYY-MM')}Entrada`, `$${fecha.format('YYYY-MM')}Salida`] }, {
            $last: {
              $filter: {
                input: `$${fecha.format('YYYY-MM')}LastCosto`,
                as: 'item',
                cond: { $ne: ['$$item', 0] }
              }
            }
          }]
        }
        addMeses.push(`$detalleRotacion.${fecha.format('YYYY-MM')}`)
        // fecha.set('month', i + 1)
        fecha.add(1, 'month')
      }
      // console.log(groupMeses, projectMeses, fecha, mesesSeleccionados, addMeses.join(', '))
      const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
      const ajustePrecioProductoCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'ajustePrecioProducto' })
      // const movimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'movimientos' })
      const almacenes = await getCollectionSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Auditoria', 'Devoluciones', 'Transito'] } } })
      const almacenesInvalidSalida = almacenes.map(e => new ObjectId(e._id))
      // const tiposDocumentosParaRotacion = ['solicitudInterna', tiposDocumentosFiscales.factura, tiposDocumentosFiscales.notaDebito, tiposDocumentosFiscales.notaEntrega]
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
                {
                  $match: {
                    fechaMovimiento: { $gte: moment(desde).toDate(), $lte: moment(hasta).toDate() },
                    tipoMovimiento: 'salida',
                    tipo: { $ne: 'ajuste' },
                    almacenId: { $exists: true }
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
                        unit: 'day'
                        // timezone: timeZone
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
                    $and: [
                      { almacenId: { $nin: [new ObjectId(almacenes.find(e => e.nombre === 'Auditoria')?._id), new ObjectId(almacenes.find(e => e.nombre === 'Devoluciones')?._id)] } },
                      { almacenId: { $exists: true } }
                    ]
                  }
                },
                {
                  $group: {
                    _id: '$productoId',
                    ...groupMeses
                  }
                },
                {
                  $lookup: {
                    from: ajustePrecioProductoCollection,
                    localField: '_id',
                    foreignField: 'productoId',
                    pipeline: [
                      {
                        $match: {
                          fecha: { $gte: moment(desde).toDate(), $lte: moment(hasta).toDate() }
                        }
                      },
                      { $sort: { fecha: 1 } },
                      {
                        $group: {
                          _id: {
                            year: { $year: '$fecha' },
                            month: { $month: '$fecha' }
                          },
                          ultimoCostoPromedio: {
                            $last: '$costoPromedio'
                          }
                        }
                      },
                      {
                        $project: {
                          _id: 0,
                          dateFormat: { $dateFromString: {
                            dateString: { $concat: [
                                { $toString: '$_id.year' },
                                '-',
                                {
                                  $cond: {
                                    if: { $gt: ['$_id.month', 9] },
                                    then: { $toString: '$_id.month' },
                                    else: { $concat: ['0', { $toString: '$_id.month' }] }
                                  }
                                },
                                '-',
                                '01'
                              ]
                            },
                            format: '%Y-%m-%d'
                            }
                          },
                          year: '$_id.year',
                          month: '$_id.month',
                          ultimoCostoPromedio: 1
                        }
                      },
                      { $sort: { dateFormat: 1 } }
                    ],
                    as: 'ultimoCosto'
                  }
                },
                { $unwind: { path: '$ultimoCosto', preserveNullAndEmptyArrays: true } },
                {
                  $group: {
                    _id: '$productoId',
                    ...segundoGroupMeses
                    // ultimoCosto: { $push: '$ultimoCosto' }
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
              totalPromedioRotacion: { $divide: [{ $add: addMeses }, mesesSeleccionados] },
              addMeses,
              detalleRotacion: '$detalleRotacion'
            }
          }
        ]
      })
      return res.status(200).json({ productsList })
    }
    return res.status(200).json({ count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos de los productos' + e.message })
  }
}
export const reporteRotacionInventarioAlmacen = async (req, res) => {
  const { clienteId, desde, hasta, timeZone, itemsPorPagina, pagina } = req.body
  // console.log(req.body)
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
      // const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      const groupMeses = {}
      const projectMeses = {}
      const segundoGroupMeses = {}
      const mesesSeleccionados = moment(hasta).diff(moment(desde), 'months') + 1
      console.log({ mesesSeleccionados })
      const addMeses = []
      const fecha = momentDate(timeZone, desde).endOf('month')
      for (let i = 0; i < mesesSeleccionados; i++) {
        if (fecha.isAfter(hasta)) break
        // console.log({ fecha })
        console.log({ fecha: fecha.endOf('month') })
        console.log(`${fecha.format('YYYY-MM')}`)
        groupMeses[`${fecha.format('YYYY-MM')}Entrada`] = {
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
        groupMeses[`${fecha.format('YYYY-MM')}Salida`] = {
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
        /* groupMeses[`${fecha.format('YYYY-MM')}LastCosto`] = {
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
              else: '$costoPromedio'
            }
          }
        } */
        segundoGroupMeses[`${fecha.format('YYYY-MM')}Entrada`] = {
          $first: `$${fecha.format('YYYY-MM')}Entrada`
        }
        segundoGroupMeses[`${fecha.format('YYYY-MM')}Salida`] = {
          $first: `$${fecha.format('YYYY-MM')}Salida`
        }
        segundoGroupMeses.sumDiff = {
          $first: '$sumDiff'
        }
        segundoGroupMeses.cantidadSalidas = {
          $first: '$cantidadSalidas'
        }
        segundoGroupMeses.totalCostoPromedioSalida = {
          $first: '$totalCostoPromedioSalida'
        }
        segundoGroupMeses[`${fecha.format('YYYY-MM')}LastCosto`] = {
          $sum: {
            $cond: {
              if: {
                $and: [
                  { $eq: ['$ultimoCosto.year', Number(fecha.format('YYYY'))] },
                  { $eq: ['$ultimoCosto.month', Number(fecha.format('M'))] }
                ]
              },
              then: '$ultimoCosto.ultimoCostoPromedio',
              else: 0
            }
          }
        }
        projectMeses[`${fecha.format('YYYY-MM')}Entrada`] = 1
        projectMeses[`${fecha.format('YYYY-MM')}Salida`] = 1
        projectMeses[`${fecha.format('YYYY-MM')}LastCosto`] = 1
        projectMeses[`${fecha.format('YYYY-MM')}`] = {
          $multiply: [{ $subtract: [`$${fecha.format('YYYY-MM')}Entrada`, `$${fecha.format('YYYY-MM')}Salida`] }, `$${fecha.format('YYYY-MM')}LastCosto`]
        }
        addMeses.push(`$detalleRotacion.${fecha.format('YYYY-MM')}`)
        fecha.add(1, 'month')
      }
      // console.log(groupMeses, projectMeses, fecha, mesesSeleccionados, addMeses)
      const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
      const ajustePrecioProductoCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'ajustePrecioProducto' })
      const almacenesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
      // const movimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'movimientos' })
      const almacenes = await getCollectionSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Auditoria', 'Devoluciones', 'Transito'] } } })
      const almacenesInvalidSalida = almacenes.filter(e => e.nombre === 'Devoluciones' || e.nombre === 'Auditoria').map(e => e._id)
      // const almacenDevolucion = new ObjectId(almacenes.find(e => e.nombre === 'Devoluciones')?._id)
      const almacenTransito = new ObjectId(almacenes.find(e => e.nombre === 'Transito')?._id)
      // const almacenAuditoria = new ObjectId(almacenes.find(e => e.nombre === 'Auditoria')?._id)
      // const tiposDocumentosParaRotacion = ['solicitudInterna', tiposDocumentosFiscales.factura, tiposDocumentosFiscales.notaDebito, tiposDocumentosFiscales.notaEntrega]
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
                {
                  $match: {
                    $and: [
                      { almacenId: { $nin: almacenesInvalidSalida } },
                      { almacenId: { $exists: true } }
                    ]
                  }
                },
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
                    _id: {
                      almacenId: '$almacenId',
                      productoId: '$productoId'
                    },
                    // sumDiff: { $sum: '$diferenciaSalida' },
                    sumDiff: {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ['$tipoMovimiento', 'salida'] },
                              { $ne: ['$tipo', 'ajuste'] },
                              { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                              { $lte: ['$fechaMovimiento', moment(hasta).toDate()] },
                              { $ne: ['$almacenId', almacenTransito] },
                              {
                                $or: [
                                  { $eq: [{ $type: '$documentoId' }, 'objectId'] },
                                  { $eq: ['$tipoDocumento', 'solicitudInterna'] }
                                ]
                              }
                            ]
                          },
                          then: '$diferenciaSalida',
                          else: 0
                        }
                      }
                    },
                    cantidadSalidas: {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ['$tipoMovimiento', 'salida'] },
                              { $ne: ['$tipo', 'ajuste'] },
                              { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                              { $lte: ['$fechaMovimiento', moment(hasta).toDate()] },
                              { $ne: ['$almacenId', almacenTransito] },
                              {
                                $or: [
                                  { $eq: [{ $type: '$documentoId' }, 'objectId'] },
                                  { $eq: ['$tipoDocumento', 'solicitudInterna'] }
                                ]
                              }
                            ]
                          },
                          then: 1,
                          else: 0
                        }
                      }
                    },
                    // totalCostoPromedioSalida: { $sum: '$costoPromedio' }
                    totalCostoPromedioSalida: {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ['$tipoMovimiento', 'salida'] },
                              { $ne: ['$tipo', 'ajuste'] },
                              { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                              { $lte: ['$fechaMovimiento', moment(hasta).toDate()] },
                              { $ne: ['$almacenId', almacenTransito] },
                              {
                                $or: [
                                  { $eq: [{ $type: '$documentoId' }, 'objectId'] },
                                  { $eq: ['$tipoDocumento', 'solicitudInterna'] }
                                ]
                              }
                            ]
                          },
                          then: '$costoPromedio',
                          else: 0
                        }
                      }
                    },
                    ...groupMeses
                  }
                },
                {
                  $lookup: {
                    from: ajustePrecioProductoCollection,
                    localField: '_id.productoId',
                    foreignField: 'productoId',
                    pipeline: [
                      {
                        $match: {
                          fecha: { $gte: moment(desde).toDate(), $lte: moment(hasta).toDate() }
                        }
                      },
                      { $sort: { fecha: 1 } },
                      {
                        $group: {
                          _id: {
                            year: { $year: '$fecha' },
                            month: { $month: '$fecha' }
                          },
                          ultimoCostoPromedio: {
                            $last: '$costoPromedio'
                          }
                        }
                      },
                      {
                        $project: {
                          _id: 0,
                          formatoNombre: {
                            $concat: [
                              { $toString: '$_id.year' },
                              '-',
                              {
                                $cond: {
                                  if: { $gt: ['$_id.month', 9] },
                                  then: { $toString: '$_id.month' },
                                  else: { $concat: ['0', { $toString: '$_id.month' }] }
                                }
                              },
                              'ultimoCostoPromedio'
                            ]
                          },
                          year: '$_id.year',
                          month: '$_id.month',
                          ultimoCostoPromedio: 1
                        }
                      }
                    ],
                    as: 'ultimoCosto'
                  }
                },
                { $unwind: { path: '$ultimoCosto', preserveNullAndEmptyArrays: true } },
                {
                  $group: {
                    _id: {
                      almacenId: '$_id.almacenId',
                      productoId: '$_id.productoId'
                    },
                    ...segundoGroupMeses,
                    costoRevision: {
                      $push: {
                        ultimoCosto: '$ultimoCosto'
                      }
                    }
                  }
                },
                {
                  $project: {
                    ...projectMeses,
                    sumDiff: 1,
                    cantidadSalidas: 1,
                    totalCostoPromedioSalida: 1
                  }
                }
              ],
              as: 'detalleSalida'
            }
          },
          { $unwind: { path: '$detalleSalida', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: almacenesCollection,
              localField: 'detalleSalida._id.almacenId',
              foreignField: '_id',
              as: 'detalleAlmacen'
            }
          },
          { $unwind: { path: '$detalleAlmacen', preserveNullAndEmptyArrays: false } },
          {
            $project: {
              codigo: '$codigo',
              nombre: '$nombre',
              descripcion: '$descripcion',
              unidad: '$unidad',
              sumaTotalSalidas: '$detalleSalida.sumDiff',
              cantidadSalidasTotales: '$detalleSalida.cantidadSalidas',
              // promedioSalida: { $divide: [{ $ifNull: ['$detalleSalida.sumDiff', 0] }, { $ifNull: ['$detalleSalida.cantidadSalidas', 1] }] },
              totalCostoPromedioSalida: { $round: ['$detalleSalida.totalCostoPromedioSalida', 2] },
              totalPromedioRotacion: { $divide: [{ $add: addMeses }, mesesSeleccionados] },
              detalleAlmacen: '$detalleAlmacen',
              almacenId: '$detalleAlmacen._id',
              almacenNombre: '$detalleAlmacen.nombre',
              detalleSalida: '$detalleSalida'
            }
          },
          {
            $group: {
              _id: {
                almacenId: '$almacenId',
                almacenNombre: '$almacenNombre'
              },
              productos: { $push: '$$ROOT' }
            }
          },
          { $sort: { '_id.almacenNombre': 1 } }
        ]
      })
      return res.status(200).json({ productsList })
    }
    return res.status(200).json({ count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos de los productos' + e.message })
  }
}
export const reporteHistoricoMovimientos = async (req, res) => {
  const { clienteId, desde, hasta, itemsPorPagina, pagina } = req.body
  console.log(req.body)
  try {
    const alamcenesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const zonasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonas' })
    const movimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'movimientos' })
    const productosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productos' })
    const almacenTransito = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Transito' } })
    const almacenDevoluciones = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Devoluciones' } })
    const count = await agreggateCollectionsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fechaMovimiento: { $gte: moment(desde).toDate(), $lte: moment(hasta).toDate() },
            $and: [
              { almacenId: { $ne: new ObjectId(almacenTransito?._id) } },
              { almacenId: { $exists: true } }
            ]
          }
        },
        {
          $lookup: {
            from: movimientosCollection,
            localField: 'movimientoId',
            foreignField: '_id',
            pipeline: [
              { $match: { estado: { $ne: 'Cancelado' } } }
            ],
            as: 'detalleMovimiento'
          }
        },
        { $unwind: { path: '$detalleMovimiento', preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: {
              productoId: '$productoId',
              movimientoId: '$movimientoId',
              almacenId: {
                $cond: {
                  if: {
                    $and: [
                      { $eq: [{ $type: '$detalleMovimiento.compraId' }, 'objectId'] },
                      { $eq: ['$almacenId', new ObjectId(almacenDevoluciones?._id)] },
                    ]
                  },
                  then: 'eliminar',
                  else: {
                    $cond: {
                      if: {
                        $and: [
                          { $eq: [{ $type: '$detalleMovimiento.compraId' }, 'objectId'] }
                        ]
                      },
                      then: '$almacenId',
                      else: null
                    }
                  }
                }
              }
            },
          }
        },
        {
          $group: {
            _id: {
              productoId: '$_id.productoId',
              movimientoId: '$_id.movimientoId'
            },
            movimientos: {
              $push: {
                almacenId: '$_id.almacenId',
              }
            },
          }
        },
        { $unwind: { path: '$movimientos', preserveNullAndEmptyArrays: true } },
        { $match: { 'movimientos.almacenId': { $ne: 'eliminar' } } },
        { $count: 'total' }
      ]
    })
    if (itemsPorPagina || pagina) {
      const movimientos = await agreggateCollectionsSD({
        nameCollection: 'productosPorAlmacen',
        enviromentClienteId: clienteId,
        pipeline: [
          {
            $match: {
              fechaMovimiento: { $gte: moment(desde).toDate(), $lte: moment(hasta).toDate() },
              $and: [
                { almacenId: { $ne: new ObjectId(almacenTransito?._id) } },
                { almacenId: { $exists: true } }
              ]
            }
          },
          {
            $lookup: {
              from: movimientosCollection,
              localField: 'movimientoId',
              foreignField: '_id',
              pipeline: [
                { $match: { estado: { $ne: 'Cancelado' } } }
              ],
              as: 'detalleMovimiento'
            }
          },
          { $unwind: { path: '$detalleMovimiento', preserveNullAndEmptyArrays: false } },
          {
            $group: {
              _id: {
                productoId: '$productoId',
                movimientoId: '$movimientoId',
                almacenId: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: [{ $type: '$detalleMovimiento.compraId' }, 'objectId'] },
                        { $eq: ['$almacenId', new ObjectId(almacenDevoluciones?._id)] },
                      ]
                    },
                    then: 'eliminar',
                    else: {
                      $cond: {
                        if: {
                          $and: [
                            { $eq: [{ $type: '$detalleMovimiento.compraId' }, 'objectId'] }
                          ]
                        },
                        then: '$almacenId',
                        else: null
                      }
                    }
                  }
                }
              },
              origen: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $ne: [{ $type: '$tipoAuditoria' }, 'string'] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              destino: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $ne: [{ $type: '$tipoAuditoria' }, 'string'] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              ajusteOrigen: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $eq: ['$almacenId', almacenDevoluciones._id] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              ajusteDestino: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$tipo', 'ajuste'] },
                        { $ne: ['$almacenId', almacenDevoluciones._id] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              diferenciaPositiva: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoAuditoria', 'sobrante'] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              diferenciaNegativa: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $ne: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoAuditoria', 'faltante'] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              }
            }
          },
          {
            $group: {
              _id: {
                productoId: '$_id.productoId',
                movimientoId: '$_id.movimientoId'
              },
              movimientos: {
                $push: {
                  almacenId: '$_id.almacenId',
                  origen: '$origen',
                  destino: '$destino',
                  ajusteOrigen: '$ajusteOrigen',
                  ajusteDestino: '$ajusteDestino'
                }
              },
              // origen: { $sum: '$origen' },
              // destino: { $sum: '$destino' },
              diferenciaPositiva: { $sum: '$diferenciaPositiva' },
              diferenciaNegativa: { $sum: '$diferenciaNegativa' }
            }
          },
          { $unwind: { path: '$movimientos', preserveNullAndEmptyArrays: true } },
          { $match: { 'movimientos.almacenId': { $ne: 'eliminar' } } },
          { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
          { $limit: Number(itemsPorPagina) },
          {
            $lookup: {
              from: movimientosCollection,
              localField: '_id.movimientoId',
              foreignField: '_id',
              pipeline: [
                { $match: { estado: { $ne: 'Cancelado' } } },
                {
                  $lookup: {
                    from: alamcenesCollection,
                    localField: 'almacenOrigen',
                    foreignField: '_id',
                    as: 'almacenOrigen'
                  }
                },
                { $unwind: { path: '$almacenOrigen', preserveNullAndEmptyArrays: true } },
                {
                  $lookup: {
                    from: alamcenesCollection,
                    localField: 'almacenDestino',
                    foreignField: '_id',
                    as: 'almacenDestino'
                  }
                },
                { $unwind: { path: '$almacenDestino', preserveNullAndEmptyArrays: true } },
                {
                  $lookup: {
                    from: zonasCollection,
                    localField: 'zona',
                    foreignField: '_id',
                    as: 'zona'
                  }
                },
                { $unwind: { path: '$zona', preserveNullAndEmptyArrays: true } }
              ],
              as: 'detalleMovimiento'
            }
          },
          { $unwind: { path: '$detalleMovimiento', preserveNullAndEmptyArrays: true } },
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
              from: alamcenesCollection,
              localField: 'movimientos.almacenId',
              foreignField: '_id',
              as: 'almacenCompra'
            }
          },
          { $unwind: { path: '$almacenCompra', preserveNullAndEmptyArrays: true } }
          /* {
            $project: {
              productoId: '$_id.productoId',
              almacenId: '$_id.almacenId',
              productoCodigo: '$detalleProducto.codigo',
              productoNombre: '$detalleProducto.nombre',
              origen: '$origen',
              destino: '$destino',
              diferenciaPositiva: '$diferenciaPositiva',
              diferenciaNegativa: '$diferenciaNegativa',
              fecha: '$detalleMovimiento.fecha',
              almacenOrigen: '$detalleMovimiento.almacenOrigen',
              almacenDestino: '$detalleMovimiento.almacenDestino',
              zona: '$detalleMovimiento.zona',
              numeroMovimiento: '$detalleMovimiento.numeroMovimiento',
              creadoPor: '$detalleMovimiento.creadoPor',
              tipo: '$detalleMovimiento.tipo',
              compraId: '$detalleMovimiento.compraId',
              movimientoDevolucion: '$detalleMovimiento.movimientoDevolucion',
              documentoId: '$detalleMovimiento.documentoId',
              facturaAsociada: '$detalleMovimiento.facturaAsociada',
              notaEntregaAsociada: '$detalleMovimiento.notaEntregaAsociada'
            }
          } */
          /* {
            $project: {
              fecha: 1,
              almacenOrigen: 1,
              almacenDestino: 1,
              zona: 1,
              numeroMovimiento: 1,
              creadoPor: 1,
              tipo: 1,
              compraId: 1,
              movimientoDevolucion: 1,
              documentoId: 1,
              facturaAsociada: 1,
              notaEntregaAsociada: 1,
              productoId: '$productoPorAlmacen.productoId',
              productoCodigo: '$productoPorAlmacen.productoCodigo',
              productoNombre: '$productoPorAlmacen.productoNombre',
              origen: '$productoPorAlmacen.origen',
              destino: '$productoPorAlmacen.destino',
              diferenciaPositiva: '$productoPorAlmacen.diferenciaPositiva',
              diferenciaNegativa: '$productoPorAlmacen.diferenciaNegativa',
              almacenDestinoCompra: '$productoPorAlmacen.almacenDestinoCompra',
              almacenId: '$productoPorAlmacen.almacenId'
            }
          } */
        ]
      })
      return res.status(200).json({ movimientos })
    }
    return res.status(200).json({ count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos de los productos' + e.message })
  }
}
export const reporteAntiguedadInventario = async (req, res) => {
  const { clienteId, hasta, itemsPorPagina, pagina } = req.body
  console.log(req.body)
  const almacenes = await getCollectionSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Devoluciones', 'Auditoria'] } } })
  console.log({ almacenes })
  const almacenesInvalid = almacenes.map(e => e._id)
  console.log({ almacenesInvalid })
  const productosPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
  const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
  const ajustePrecioProductoCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'ajustePrecioProducto' })
  try {
    const count = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { activo: { $ne: false } } },
        {
          $lookup: {
            from: productosPorAlmacenCollection,
            localField: '_id',
            foreignField: 'productoId',
            pipeline: [
              {
                $match: {
                  fechaMovimiento: { $lte: moment(hasta).toDate() },
                  $and: [
                    { almacenId: { $nin: almacenesInvalid } },
                    { almacenId: { $exists: true } }
                  ]
                }
              },
              {
                $group: {
                  _id: '$lote',
                  entradas: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoMovimiento', 'entrada'] },
                        then: '$cantidad',
                        else: 0
                      }
                    }
                  },
                  salidas: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoMovimiento', 'salida'] },
                        then: '$cantidad',
                        else: 0
                      }
                    }
                  },
                }
              },
              {
                $project: {
                  cantidad: { $subtract: ['$entradas', '$salidas'] },
                }
              }
            ],
            as: 'detallePorAlmacen'
          },
        },
        { $unwind: { path: '$detallePorAlmacen', preserveNullAndEmptyArrays: true } },
        { $match: { 'detallePorAlmacen.cantidad': { $gt: 0 } } },
        { $count: 'total' }
      ]
    })
    if (itemsPorPagina || pagina) {
      // const almacenTransito = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Transito' } })
      const productos = await agreggateCollectionsSD({
        nameCollection: 'productos',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { activo: { $ne: false } } },
          {
            $lookup: {
              from: categoriasCollection,
              localField: 'categoria',
              foreignField: '_id',
              as: 'detalleCategoria'
            },
          },
          { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: ajustePrecioProductoCollection,
              localField: '_id',
              foreignField: 'productoId',
              pipeline: [
                { $match: { fecha: { $lte: moment(hasta).toDate() } } },
                { $sort: { fecha: -1 } },
                { $limit: 1 }
              ],
              as: 'ultimoCostoPromedio'
            },
          },
          { $unwind: { path: '$ultimoCostoPromedio', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: productosPorAlmacenCollection,
              localField: '_id',
              foreignField: 'productoId',
              pipeline: [
                {
                  $match: {
                    fechaMovimiento: { $lte: moment(hasta).toDate() },
                    $and: [
                      { almacenId: { $nin: almacenesInvalid } },
                      { almacenId: { $exists: true } }
                    ]
                  }
                },
                {
                  $group: {
                    _id: '$lote',
                    entradas: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$tipoMovimiento', 'entrada'] },
                          then: '$cantidad',
                          else: 0
                        }
                      }
                    },
                    salidas: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$tipoMovimiento', 'salida'] },
                          then: '$cantidad',
                          else: 0
                        }
                      }
                    },
                    fechaIngreso: { $first: '$fechaIngreso' },
                    fechaVencimiento: { $first: '$fechaVencimiento' }
                  }
                },
                {
                  $project: {
                    _id: 0,
                    lote: '$_id',
                    entradas: 1,
                    salidas: 1,
                    cantidad: { $subtract: ['$entradas', '$salidas'] },
                    fechaIngreso: 1,
                    fechaVencimiento: 1
                  }
                }
              ],
              as: 'detallePorAlmacen'
            },
          },
          { $unwind: { path: '$detallePorAlmacen', preserveNullAndEmptyArrays: true } },
          { $match: { 'detallePorAlmacen.cantidad': { $gt: 0 } } },
          {
            $project: {
              codigo: 1,
              nombre: 1,
              unidad: 1,
              categoria: '$detalleCategoria.nombre',
              categoriaId: '$detalleCategoria._id',
              lote: '$detallePorAlmacen.lote',
              fechaVencimiento: '$detallePorAlmacen.fechaVencimiento',
              fechaIngreso: '$detallePorAlmacen.fechaIngreso',
              entradas: '$detallePorAlmacen.entradas',
              salidas: '$detallePorAlmacen.salidas',
              cantidad: '$detallePorAlmacen.cantidad',
              diffFecha: {
                $dateDiff: {
                  startDate: '$detallePorAlmacen.fechaIngreso',
                  endDate: moment(hasta).toDate(),
                  unit: 'day',
                  // timezone: timeZone
                }
              },
              costoPromedio: '$ultimoCostoPromedio.costoPromedio'
            }
          }
        ]
      })
      return res.status(200).json({ productos })
    }
    return res.status(200).json({ count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos de los productos' + e.message })
  }
}
export const reporteAntiguedadInventarioAlmacen = async (req, res) => {
  const { clienteId, hasta, itemsPorPagina, pagina } = req.body
  console.log(req.body)
  const almacenes = await getCollectionSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Devoluciones', 'Auditoria'] } } })
  console.log({ almacenes })
  const almacenesInvalid = almacenes.map(e => e._id)
  console.log({ almacenesInvalid })
  const productosPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
  const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
  const ajustePrecioProductoCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'ajustePrecioProducto' })
  const almacenesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
  try {
    const count = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { activo: { $ne: false } } },
        {
          $lookup: {
            from: productosPorAlmacenCollection,
            localField: '_id',
            foreignField: 'productoId',
            pipeline: [
              {
                $match: {
                  fechaMovimiento: { $lte: moment(hasta).toDate() },
                  $and: [
                    { almacenId: { $nin: almacenesInvalid } },
                    { almacenId: { $exists: true } }
                  ]
                }
              },
              {
                $group: {
                  _id: {
                    lote: '$lote',
                    almacenId: '$almacenId'
                  },
                  entradas: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoMovimiento', 'entrada'] },
                        then: '$cantidad',
                        else: 0
                      }
                    }
                  },
                  salidas: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoMovimiento', 'salida'] },
                        then: '$cantidad',
                        else: 0
                      }
                    }
                  },
                }
              },
              {
                $project: {
                  cantidad: { $subtract: ['$entradas', '$salidas'] },
                }
              }
            ],
            as: 'detallePorAlmacen'
          },
        },
        { $unwind: { path: '$detallePorAlmacen', preserveNullAndEmptyArrays: true } },
        { $match: { 'detallePorAlmacen.cantidad': { $gt: 0 } } },
        { $count: 'total' }
      ]
    })
    if (itemsPorPagina || pagina) {
      // const almacenTransito = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Transito' } })
      const productos = await agreggateCollectionsSD({
        nameCollection: 'productos',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { activo: { $ne: false } } },
          {
            $lookup: {
              from: categoriasCollection,
              localField: 'categoria',
              foreignField: '_id',
              as: 'detalleCategoria'
            },
          },
          { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: ajustePrecioProductoCollection,
              localField: '_id',
              foreignField: 'productoId',
              pipeline: [
                { $match: { fecha: { $lte: moment(hasta).toDate() } } },
                { $sort: { fecha: -1 } },
                { $limit: 1 }
              ],
              as: 'ultimoCostoPromedio'
            },
          },
          { $unwind: { path: '$ultimoCostoPromedio', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: productosPorAlmacenCollection,
              localField: '_id',
              foreignField: 'productoId',
              pipeline: [
                {
                  $match: {
                    fechaMovimiento: { $lte: moment(hasta).toDate() },
                    $and: [
                      { almacenId: { $nin: almacenesInvalid } },
                      { almacenId: { $exists: true } }
                    ]
                  }
                },
                {
                  $group: {
                    _id: {
                      lote: '$lote',
                      almacenId: '$almacenId'
                    },
                    entradas: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$tipoMovimiento', 'entrada'] },
                          then: '$cantidad',
                          else: 0
                        }
                      }
                    },
                    salidas: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$tipoMovimiento', 'salida'] },
                          then: '$cantidad',
                          else: 0
                        }
                      }
                    },
                    fechaIngreso: { $first: '$fechaIngreso' },
                    fechaVencimiento: { $first: '$fechaVencimiento' }
                  }
                },
                {
                  $project: {
                    _id: 0,
                    lote: '$_id.lote',
                    almacenId: '$_id.almacenId',
                    entradas: 1,
                    salidas: 1,
                    cantidad: { $subtract: ['$entradas', '$salidas'] },
                    fechaIngreso: 1,
                    fechaVencimiento: 1
                  }
                }
              ],
              as: 'detallePorAlmacen'
            },
          },
          { $unwind: { path: '$detallePorAlmacen', preserveNullAndEmptyArrays: true } },
          { $match: { 'detallePorAlmacen.cantidad': { $gt: 0 } } },
          {
            $lookup: {
              from: almacenesCollection,
              localField: 'detallePorAlmacen.almacenId',
              foreignField: '_id',
              as: 'detalleAlmacen'
            },
          },
          { $unwind: { path: '$detalleAlmacen', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              almacenId: '$detalleAlmacen._id',
              almacenNombre: '$detalleAlmacen.nombre',
              codigo: 1,
              nombre: 1,
              unidad: 1,
              categoria: '$detalleCategoria.nombre',
              categoriaId: '$detalleCategoria._id',
              lote: '$detallePorAlmacen.lote',
              fechaVencimiento: '$detallePorAlmacen.fechaVencimiento',
              fechaIngreso: '$detallePorAlmacen.fechaIngreso',
              entradas: '$detallePorAlmacen.entradas',
              salidas: '$detallePorAlmacen.salidas',
              cantidad: '$detallePorAlmacen.cantidad',
              diffFecha: {
                $dateDiff: {
                  startDate: '$detallePorAlmacen.fechaIngreso',
                  endDate: moment(hasta).toDate(),
                  unit: 'day',
                  // timezone: timeZone
                }
              },
              costoPromedio: '$ultimoCostoPromedio.costoPromedio'
            }
          },
          {
            $group: {
              _id: {
                almacenId: '$almacenId',
                almacenNombre: '$almacenNombre',
              },
              productos: { $push: '$$ROOT' }
            }
          }
        ]
      })
      return res.status(200).json({ productos })
    }
    return res.status(200).json({ count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos de los productos' + e.message })
  }
}
export const reporteInventarios = async (req, res) => {
  const { clienteId, desde, hasta, itemsPorPagina, pagina } = req.body
  const movimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'movimientos' })
  const ajustePrecioProductoCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'ajustePrecioProducto' })
  const productosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productos' })
  const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
  const almacenes = await getCollectionSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Devoluciones', 'Transito', 'Auditoria'] } } })
  const almacenesInvalid = almacenes.map(e => e._id)
  try {
    const count = await agreggateCollectionsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fechaMovimiento: { $lte: moment(hasta).toDate() },
            $and: [
              { almacenId: { $nin: almacenesInvalid } },
              { almacenId: { $exists: true } }
            ]
          }
        },
        {
          $group: {
            _id: '$productoId'
          }
        },
        { $count: 'total' }
      ]
    })
    if (itemsPorPagina || pagina) {
      console.log({ pagina })
      const productos = await agreggateCollectionsSD({
        nameCollection: 'productosPorAlmacen',
        enviromentClienteId: clienteId,
        pipeline: [
          {
            $match: {
              fechaMovimiento: { $lte: moment(hasta).toDate() },
              $and: [
                { almacenId: { $nin: almacenesInvalid } },
                { almacenId: { $exists: true } }
              ]
            }
          },
          {
            $lookup: {
              from: movimientosCollection,
              localField: 'movimientoId',
              foreignField: '_id',
              as: 'detalleMovimiento'
            },
          },
          { $unwind: { path: '$detalleMovimiento', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: '$productoId',
              saldosInicialesEntradas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $lt: ['$fechaMovimiento', moment(desde).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              saldosInicialesSalidas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $lt: ['$fechaMovimiento', moment(desde).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              entradasCompras: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.recepcion] },
                            { $eq: ['$tipo', 'inicial'] }
                          ]
                        },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costosEntradasCompras: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.recepcion] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              devolucionEntradaCompra: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.devolucion] },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoDevolucionEntradaCompra: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.devolucion] },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              devolucionSalidaCompra: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.devolucion] },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoDevolucionSalidaCompra: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.devolucion] },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              salidasVentas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos['despacho-ventas']] },
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.solicitudInterna] },
                          ]
                        },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoSalidasVentas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos['despacho-ventas']] },
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.solicitudInterna] },
                          ]
                        },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              devolucionEntradaVentas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos['despacho-ventas']] },
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.solicitudInterna] },
                          ]
                        },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoDevolucionEntradaCompras: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos['despacho-ventas']] },
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.solicitudInterna] },
                          ]
                        },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              devolucionSalidaVentas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos['despacho-ventas']] },
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.solicitudInterna] },
                          ]
                        },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoDevolucionSalidaVentas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos['despacho-ventas']] },
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.solicitudInterna] },
                          ]
                        },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              transferenciasEntradas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.transferencia] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoTransferenciasEntradas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.transferencia] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              transferenciasSalidas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.transferencia] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costosTransferenciasSalidas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.transferencia] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              ajustesEntradas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.Ajuste] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoAjustesEntradas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.Ajuste] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              ajustesSalida: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.Ajuste] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoAjustesSalida: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.Ajuste] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              }
            }
          },
          { $sort: { _id: 1 } },
          { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
          { $limit: Number(itemsPorPagina) },
          {
            $lookup: {
              from: ajustePrecioProductoCollection,
              localField: '_id',
              foreignField: 'productoId',
              pipeline: [
                { $match: { fecha: { $lte: moment(desde).toDate() } } },
                { $sort: { fecha: -1 } },
                { $limit: 1 }
              ],
              as: 'costoPromedioSaldosIniciales'
            },
          },
          { $unwind: { path: '$costoPromedioSaldosIniciales', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: productosCollection,
              localField: '_id',
              foreignField: '_id',
              pipeline: [
                {
                  $lookup: {
                    from: categoriasCollection,
                    localField: 'categoria',
                    foreignField: '_id',
                    pipeline: [
                      {
                        $project: {
                          _id: 1,
                          nombre: 1
                        }
                      }
                    ],
                    as: 'detalleCategoria'
                  },
                },
                { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
                {
                  $project: {
                    _id: 1,
                    codigo: 1,
                    nombre: 1,
                    unidad: 1,
                    categoria: '$detalleCategoria.nombre',
                    costoPromedio: '$costoPromedio'
                  }
                }
              ],
              as: 'detalleProducto'
            },
          },
          { $unwind: { path: '$detalleProducto', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              productoId: '$_id',
              costoPromedioSaldosIniciales: '$costoPromedioSaldosIniciales.costoPromedio',
              codigo: '$detalleProducto.codigo',
              nombre: '$detalleProducto.nombre',
              categoria: '$detalleProducto.categoria',
              unidad: '$detalleProducto.unidad',
              saldosInicialesEntradas: 1,
              saldosInicialesSalidas: 1,
              entradasCompras: 1,
              costosEntradasCompras: 1,
              devolucionEntradaCompras: 1,
              devolucionSalidaCompra: 1,
              costoDevolucionSalidaCompra: 1,
              costoDevolucionEntradaCompras: 1,
              devolucionSalidaVentas: 1,
              costoDevolucionSalidaVentas: 1,
              transferenciasEntradas: 1,
              costoTransferenciasEntradas: 1,
              transferenciasSalidas: 1,
              costosTransferenciasSalidas: 1,
              ajustesEntradas: 1,
              costoAjustesEntradas: 1,
              ajustesSalida: 1,
              costoAjustesSalida: 1,
              costoPromedio: '$detalleProducto.costoPromedio',
              salidasVentas: 1,
              costoSalidasVentas: 1
            }
          }
        ]
      })
      /* const productos = await agreggateCollectionsSD({
        nameCollection: 'movimientos',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { fecha: { $gte: moment(desde).toDate(), $lte: moment(hasta).toDate() } } },
          {
            $lookup: {
              from: productosPorAlmacenCollection,
              localField: '_id',
              foreignField: 'movimientoId',
              pipeline: [
                {
                  $match: {
                    fechaMovimiento: { $lte: moment(hasta).toDate() },
                    $and: [
                      { almacenId: { $nin: almacenesInvalid } },
                      { almacenId: { $exists: true } }
                    ]
                  }
                },
                {
                  $group: {
                    _id: '$productoId',
                    saldosInicialesEntradas: {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ['$tipoMovimiento', 'entrada'] },
                              { $lt: ['$fechaMovimiento', moment(desde).toDate()] }
                            ]
                          },
                          then: '$cantidad',
                          else: 0
                        }
                      }
                    },
                    saldosInicialesSalidas: {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ['$tipoMovimiento', 'salida'] },
                              { $lt: ['$fechaMovimiento', moment(desde).toDate()] }
                            ]
                          },
                          then: '$cantidad',
                          else: 0
                        }
                      }
                    },
                    entradas: {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ['$tipoMovimiento', 'entrada'] },
                              { $gte: ['$fechaMovimiento', moment(desde).toDate()] }
                            ]
                          },
                          then: '$cantidad',
                          else: 0
                        }
                      }
                    },
                    salidas: {
                      $sum: {
                        $cond: {
                          if: {
                            $and: [
                              { $eq: ['$tipoMovimiento', 'salida'] },
                              { $gte: ['$fechaMovimiento', moment(desde).toDate()] }
                            ]
                          },
                          then: '$cantidad',
                          else: 0
                        }
                      }
                    },
                  }
                },
              ],
              as: 'detallePorAlmacen'
            },
          },
          { $unwind: { path: '$detallePorAlmacen', preserveNullAndEmptyArrays: true } },
        ]
      }) */
      return res.status(200).json({ productos })
    }
    return res.status(200).json({ count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos del inventario' + e.message })
  }
}
export const reporteInventariosAlmacen = async (req, res) => {
  const { clienteId, desde, hasta, itemsPorPagina, pagina } = req.body
  const movimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'movimientos' })
  const ajustePrecioProductoCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'ajustePrecioProducto' })
  const productosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productos' })
  const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
  const almacenesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
  const almacenes = await getCollectionSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: { $in: ['Devoluciones', 'Transito', 'Auditoria'] } } })
  const almacenesInvalid = almacenes.map(e => e._id)
  try {
    const count = await agreggateCollectionsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            fechaMovimiento: { $lte: moment(hasta).toDate() },
            $and: [
              { almacenId: { $nin: almacenesInvalid } },
              { almacenId: { $exists: true } }
            ]
          }
        },
        {
          $group: {
            _id: '$productoId'
          }
        },
        { $count: 'total' }
      ]
    })
    if (itemsPorPagina || pagina) {
      const productos = await agreggateCollectionsSD({
        nameCollection: 'productosPorAlmacen',
        enviromentClienteId: clienteId,
        pipeline: [
          {
            $match: {
              fechaMovimiento: { $lte: moment(hasta).toDate() },
              $and: [
                { almacenId: { $nin: almacenesInvalid } },
                { almacenId: { $exists: true } }
              ]
            }
          },
          {
            $lookup: {
              from: movimientosCollection,
              localField: 'movimientoId',
              foreignField: '_id',
              as: 'detalleMovimiento'
            },
          },
          { $unwind: { path: '$detalleMovimiento', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: {
                productoId: '$productoId',
                almacenId: '$almacenId'
              },
              saldosInicialesEntradas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $lt: ['$fechaMovimiento', moment(desde).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              saldosInicialesSalidas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $lt: ['$fechaMovimiento', moment(desde).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              entradasCompras: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.recepcion] },
                            { $eq: ['$tipo', 'inicial'] }
                          ]
                        },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costosEntradasCompras: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.recepcion] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              devolucionEntradaCompra: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.devolucion] },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoDevolucionEntradaCompra: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.devolucion] },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              devolucionSalidaCompra: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.devolucion] },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoDevolucionSalidaCompra: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.devolucion] },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              salidasVentas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos['despacho-ventas']] },
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.solicitudInterna] },
                          ]
                        },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoSalidasVentas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos['despacho-ventas']] },
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.solicitudInterna] },
                          ]
                        },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              devolucionEntradaVentas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos['despacho-ventas']] },
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.solicitudInterna] },
                          ]
                        },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoDevolucionEntradaCompras: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos['despacho-ventas']] },
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.solicitudInterna] },
                          ]
                        },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              devolucionSalidaVentas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos['despacho-ventas']] },
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.solicitudInterna] },
                          ]
                        },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoDevolucionSalidaVentas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        {
                          $or: [
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos['despacho-ventas']] },
                            { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.solicitudInterna] },
                          ]
                        },
                        { $eq: ['$tipo', 'ajuste'] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              transferenciasEntradas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.transferencia] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoTransferenciasEntradas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.transferencia] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              transferenciasSalidas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.transferencia] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costosTransferenciasSalidas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.transferencia] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              ajustesEntradas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.Ajuste] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoAjustesEntradas: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.Ajuste] },
                        { $eq: ['$tipoMovimiento', 'entrada'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              },
              ajustesSalida: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.Ajuste] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: '$cantidad',
                    else: 0
                  }
                }
              },
              costoAjustesSalida: {
                $sum: {
                  $cond: {
                    if: {
                      $and: [
                        { $eq: ['$detalleMovimiento.tipo', tipoMovimientos.Ajuste] },
                        { $eq: ['$tipoMovimiento', 'salida'] },
                        { $gte: ['$fechaMovimiento', moment(desde).toDate()] },
                        { $lte: ['$fechaMovimiento', moment(hasta).toDate()] }
                      ]
                    },
                    then: { $multiply: ['$costoUnitario', '$cantidad'] },
                    else: 0
                  }
                }
              }
            }
          },
          {
            $lookup: {
              from: ajustePrecioProductoCollection,
              localField: '_id.productoId',
              foreignField: 'productoId',
              pipeline: [
                { $match: { fecha: { $lte: moment(desde).toDate() } } },
                { $sort: { fecha: -1 } },
                { $limit: 1 }
              ],
              as: 'costoPromedioSaldosIniciales'
            },
          },
          { $unwind: { path: '$costoPromedioSaldosIniciales', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: productosCollection,
              localField: '_id.productoId',
              foreignField: '_id',
              pipeline: [
                {
                  $lookup: {
                    from: categoriasCollection,
                    localField: 'categoria',
                    foreignField: '_id',
                    pipeline: [
                      {
                        $project: {
                          _id: 1,
                          nombre: 1
                        }
                      }
                    ],
                    as: 'detalleCategoria'
                  },
                },
                { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
                {
                  $project: {
                    _id: 1,
                    codigo: 1,
                    nombre: 1,
                    unidad: 1,
                    categoria: '$detalleCategoria.nombre',
                    costoPromedio: '$costoPromedio'
                  }
                }
              ],
              as: 'detalleProducto'
            },
          },
          { $unwind: { path: '$detalleProducto', preserveNullAndEmptyArrays: true } },
          {
            $lookup: {
              from: almacenesCollection,
              localField: '_id.almacenId',
              foreignField: '_id',
              as: 'detalleAlmacen'
            },
          },
          { $unwind: { path: '$detalleAlmacen', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              productoId: '$_id.productoId',
              almacenId: '$_id.almacenId',
              almacenNombre: '$detalleAlmacen.nombre',
              costoPromedioSaldosIniciales: '$costoPromedioSaldosIniciales.costoPromedio',
              codigo: '$detalleProducto.codigo',
              nombre: '$detalleProducto.nombre',
              categoria: '$detalleProducto.categoria',
              unidad: '$detalleProducto.unidad',
              saldosInicialesEntradas: 1,
              saldosInicialesSalidas: 1,
              entradasCompras: 1,
              costosEntradasCompras: 1,
              devolucionEntradaCompras: 1,
              devolucionSalidaCompra: 1,
              costoDevolucionSalidaCompra: 1,
              costoDevolucionEntradaCompras: 1,
              devolucionSalidaVentas: 1,
              costoDevolucionSalidaVentas: 1,
              transferenciasEntradas: 1,
              costoTransferenciasEntradas: 1,
              transferenciasSalidas: 1,
              costosTransferenciasSalidas: 1,
              ajustesEntradas: 1,
              costoAjustesEntradas: 1,
              ajustesSalida: 1,
              costoAjustesSalida: 1,
              costoPromedio: '$detalleProducto.costoPromedio',
            }
          },
          {
            $group: {
              _id: {
                almacenId: '$almacenId',
                almacenNombre: '$almacenNombre'
              },
              productos: {
                $push: '$$ROOT'
              }
            }
          }
        ]
      })
      return res.status(200).json({ productos })
    }
    return res.status(200).json({ count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos del inventario' + e.message })
  }
}
// estas funciones son para pruebas de cargas por excel borrar despues de verificar
export const savePoductosExcel = async (req, res) => {
  const { clienteId, productos } = req.body
  try {
    const categoria = await getItemSD({
      nameCollection: 'categorias',
      enviromentClienteId: clienteId,
      filters: { nombre: 'cat 1' }
    })
    const almacenPrincipal = await getItemSD({
      nameCollection: 'almacenes',
      enviromentClienteId: clienteId,
      filters: { nombre: 'Almacen 1' }
    })
    const ajusteSistema = await getItemSD({
      nameCollection: 'ajustes',
      enviromentClienteId: clienteId,
      filters: { tipo: 'sistema' }
    })
    const fecha = momentDate(ajusteSistema.timeZone || 'America/Caracas', '2024/01/01').toDate()
    console.log({ fecha })
    for (const producto of productos) {
      // creamos el producto se le coloca una categoria defecto y una variable borrar para borrar masivamente
      const newProducto = await upsertItemSD({
        nameCollection: 'productos',
        enviromentClienteId: clienteId,
        filters: { codigo: producto.codigo },
        update: {
          $set: {
            nombre: producto.nombre,
            categoria: new ObjectId(categoria._id),
            costoPromedio: producto.costoUnitario,
            borrar: true
          }
        }
      })
      // creamos el movimiento de data inicial y usamos la variable borrar
      const movimientoInit = await createItemSD({
        nameCollection: 'movimientos',
        enviromentClienteId: clienteId,
        item: {
          fecha,
          fechaVencimiento: moment().toDate(),
          tipo: 'dataInit',
          almacenOrigen: null,
          estado: 'init',
          almacenDestino: null,
          zona: null,
          creadoPor: new ObjectId(req.uid),
          borrar: true,
          fechaCreacion: moment().toDate()
        }
      })
      // creamos el movimiento por almacen con la variable borrar
      await createItemSD({
        nameCollection: 'productosPorAlmacen',
        enviromentClienteId: clienteId,
        item: {
          cantidad: Number(producto.cantidad),
          almacenDestino: almacenPrincipal._id,
          almacenDestinoNombre: almacenPrincipal.nombre,
          almacenId: almacenPrincipal._id,
          tipo: 'inicial',
          lote: producto.lote,
          movimientoId: new ObjectId(movimientoInit.insertedId),
          tipoMovimiento: 'entrada',
          productoId: new ObjectId(newProducto._id),
          fechaVencimiento: moment().toDate(),
          fechaIngreso: fecha,
          costoUnitario: Number(producto.costoUnitario),
          fechaMovimiento: fecha,
          creadoPor: new ObjectId(req.uid),
          costoPromedio: Number(producto.costoUnitario),
          borrar: true,
          fechaCreacion: moment().toDate()
        }
      })
      await createItemSD({
        nameCollection: 'ajustePrecioProducto',
        enviromentClienteId: clienteId,
        item: {
          productoId: new ObjectId(newProducto._id),
          fecha: moment('2024/01/01').toDate(),
          costoPromedio: Number(producto.costoUnitario.toFixed(2)),
          borrar: true
        }
      })
    }
    return res.status(200).json({ status: 'Productos guardados' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor ' + e.message })
  }
}
export const saveComprasExcel = async (req, res) => {
  const { clienteId, items } = req.body
  try {
    const groupDocumento = items.reduce((acc, row) => {
      const documento = row.documento
      const fecha = row.fecha
      // Buscar si ya existe un grupo con el mismo documento
      let group = acc.find(g => g.documento === documento)
      // Si no existe, crear un nuevo grupo con documento, fecha e items vacíos
      if (!group) {
        group = { documento, fecha, items: [] }
        acc.push(group)
      }
      // Agregar la fila al array de items del grupo correspondiente
      group.items.push(row)
      return acc
    }, [])
    const almacenPrincipal = await getItemSD({
      nameCollection: 'almacenes',
      enviromentClienteId: clienteId,
      filters: { nombre: 'Almacen 1' }
    })
    const ajusteSistema = await getItemSD({
      nameCollection: 'ajustes',
      enviromentClienteId: clienteId,
      filters: { tipo: 'sistema' }
    })
    const proveedor = await getItemSD({
      nameCollection: 'proveedores',
      enviromentClienteId: clienteId,
      filters: { razonSocial: 'CLUB NAUTICO DE MARACAIBO, SOCIEDAD CIVIL' }
    })
    const ivaData = await getItem({
      nameCollection: 'iva',
      filters: { tipo: 'General' }
    })
    const banco = await getItemSD({
      nameCollection: 'bancos',
      enviromentClienteId: clienteId,
      filters: { tipo: 'Nacional', tipoBanco: 'banco' }
    })
    // console.log({ ivaData, proveedor, banco, almacenSecundario, almacenPrincipal })
    const dataProductoAlmace = []
    const detalleMovimientoInventario = []
    const detalleOrdenCompra = []
    const detalleCompra = []
    for (const item of groupDocumento) {
      const fecha = momentDate(ajusteSistema.timeZone || 'America/Caracas', item.fecha).toDate()
      // console.log(item)
      let contadorOrden = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'compra' } }))?.contador
      if (contadorOrden) ++contadorOrden
      if (!contadorOrden) contadorOrden = 1
      const baseImponible = item.items.reduce((acc, row) => acc + Number(row.costoTotal), 0)
      const iva = Number((baseImponible * (ivaData.iva || 0) / 100).toFixed(2))
      // console.log({ baseImponible })
      const newOrdenCompra = await createItemSD({
        nameCollection: 'compras',
        enviromentClienteId: clienteId,
        item: {
          borrar: true,
          tipoMovimiento: 'compra',
          fecha,
          fechaVencimiento: fecha,
          tipo: 'factura',
          statusInventario: 'Recibido',
          estado: 'porRecibir',
          fechaAprobacionPagos: fecha,
          numeroOrden: contadorOrden,
          proveedorId: new ObjectId(proveedor._id),
          moneda: 'Bs',
          monedaSecundaria: 'Bs',
          baseImponible: Number(baseImponible.toFixed(2)),
          iva,
          total: baseImponible + iva,
          baseImponibleSecundaria: baseImponible,
          ivaSecundaria: iva,
          totalSecundaria: baseImponible + iva,
          sinDerechoCredito: 0,
          noSujeto: 0,
          exonerado: 0,
          totalExento: 0,
          sinDerechoCreditoSecundaria: 0,
          noSujetoSecundaria: 0,
          exoneradoSecundaria: 0,
          exentoSecundaria: 0,
          totalExentoSecundaria: 0,
          creadoPor: new ObjectId(req.uid),
          metodoPago: proveedor.metodoPago,
          formaPago: 'Contado',
          credito: null,
          duracionCredito: null,
          almacenDestino: null,
          tasaDia: 1,
          solicitudCompraId: null,
          fechaCreacion: moment().toDate()
        }
      })
      let contadorInventario = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'recepcion' } }))?.contador
      if (contadorInventario) ++contadorInventario
      if (!contadorInventario) contadorInventario = 1
      const movimientoInventario = await createItemSD({
        nameCollection: 'movimientos',
        enviromentClienteId: clienteId,
        item: {
          fecha,
          fechaVencimiento: null,
          tipo: 'recepcion',
          almacenOrigen: null,
          almacenDestino: null, // detalleCompra[0].almacenDestino,
          zona: null,
          compraId: new ObjectId(newOrdenCompra.insertedId),
          numeroMovimiento: contadorInventario,
          estado: 'recibido',
          estadoRecepcion: 'Satisfactorio',
          statusInventario: 'Recibido',
          borrar: true,
          fechaCreacion: moment().toDate()
        }
      })
      await upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'recepcion' }, update: { $set: { contador: contadorInventario } } })
      await upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'compra' }, update: { $set: { contador: contadorOrden } } })
      const newCompra = await createItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        item: {
          tipoMovimiento: 'compra',
          fecha,
          fechaVencimiento: fecha,
          fechaRecepcion: fecha,
          numeroFactura: item.documento,
          tipoDocumento: 'Factura',
          numeroControl: item.documento,
          proveedorId: proveedor._id,
          moneda: 'Bs',
          monedaSecundaria: 'Bs',
          compraFiscal: true,
          baseImponible,
          iva,
          total: baseImponible + iva,
          baseImponibleSecundaria: baseImponible,
          ivaSecundaria: iva,
          totalSecundaria: baseImponible + iva,
          creadoPor: new ObjectId(req.uid),
          metodoPago: null,
          formaPago: 'Contado',
          credito: null,
          duracionCredito: null,
          tasaDia: 1,
          ordenCompraId: newOrdenCompra.insertedId,
          sinDerechoCredito: 0,
          noSujeto: 0,
          exonerado: 0,
          exento: 0,
          totalExento: 0,
          sinDerechoCreditoSecundaria: 0,
          noSujetoSecundaria: 0,
          exoneradoSecundaria: 0,
          exentoSecundaria: 0,
          totalExentoSecundaria: 0,
          aplicaProrrateo: false,
          isImportacion: false,
          ivasTotales: null,
          borrar: true,
          estado: 'pagada',
          fechaPago: fecha,
          pagadoPor: new ObjectId(req.uid),
          fechaCreacion: moment().toDate()
        }
      })
      await createItemSD({
        nameCollection: 'transacciones',
        enviromentClienteId: clienteId,
        item: {
          documentoId: new ObjectId(newCompra.insertedId),
          proveedorId: new ObjectId(proveedor._id),
          pago: Number(baseImponible + iva),
          fechaPago: fecha,
          referencia: generarCodigoRandom(7),
          descripcion: `Factura-${item.documento}`,
          banco: banco._id,
          caja: null,
          porcentajeIgtf: 0,
          igtfPorPagar: 0,
          // pagoIgtf: Number(abono?.pagoIgtf.toFixed(2)),
          pagoSecundario: Number(baseImponible + iva),
          igtfPorPagarSecundario: 0,
          moneda: 'Bs',
          monedaSecundaria: 'Bs',
          tasa: 1,
          tipo: 'compra',
          creadoPor: new ObjectId(req.uid),
          fechaCreacion: moment().toDate(),
          borrar: true
        }
      })
      for (const detalle of item.items) {
        const producto = await getItemSD({
          nameCollection: 'productos',
          enviromentClienteId: clienteId,
          filters: { codigo: detalle.codigo }
        })
        detalleOrdenCompra.push({
          compraId: newOrdenCompra.insertedId,
          productoId: producto._id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          cantidad: detalle.cantidad,
          tipo: 'producto',
          costoUnitario: Number(detalle.costoUnitario),
          baseImponible: Number(detalle.costoTotal),
          montoIva: Number((detalle.costoTotal * (ivaData?.iva || 0) / 100).toFixed(2)),
          iva: ivaData?.iva || 0,
          costoTotal: Number(detalle.costoTotal),
          borrar: true
        })
        detalleMovimientoInventario.push({
          movimientoId: movimientoInventario.insertedId,
          productoId: producto._id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          cantidad: detalle.cantidad,
          costoUnitario: Number(detalle.costoUnitario),
          borrar: true
        })
        detalleCompra.push({
          facturaId: newCompra.insertedId,
          productoId: new ObjectId(producto._id),
          codigo: producto.codigo,
          nombre: producto.nombre,
          cantidad: detalle.cantidad,
          tipo: 'producto',
          costoUnitario: Number(detalle.costoUnitario),
          baseImponible: Number(detalle.costoTotal),
          montoIva: Number((detalle.costoTotal * (ivaData?.iva || 0) / 100).toFixed(2)),
          iva: ivaData?.iva || 0,
          costoTotal: Number(detalle.costoTotal),
          borrar: true
        })
        const inventarioAnterior = await agreggateCollectionsSD({
          nameCollection: 'productosPorAlmacen',
          enviromentClienteId: clienteId,
          pipeline: [
            {
              $match:
              {
                productoId: new ObjectId(producto._id),
                $or: [
                  { $and: [{ movimientoId: { $ne: new ObjectId(movimientoInventario.insertedId) } }] }
                ]
              }
            },
            {
              $group: {
                _id: {
                  productoId: '$productoId'
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
                cantidad: { $subtract: ['$entrada', '$salida'] }
              }
            },
            { $match: { cantidad: { $gt: 0 } } }
          ]
        })
        const costoPromedioTotalAnterior = (producto.costoPromedio || 0) * (inventarioAnterior[0]?.cantidad || 0)
        let costoPromedio = producto.costoPromedio || 0
        const costoPromedioTotalActualizado = (Number(detalle?.cantidad) * (detalle?.costoUnitario || 0)) + costoPromedioTotalAnterior
        costoPromedio = costoPromedioTotalActualizado / (Number(detalle?.cantidad) + Number(inventarioAnterior[0]?.cantidad || 0))
        const productoAlmacen = {
          productoId: new ObjectId(producto._id),
          movimientoId: new ObjectId(movimientoInventario.insertedId),
          cantidad: Number(detalle.cantidad),
          almacenId: new ObjectId(almacenPrincipal._id),
          almacenOrigen: null,
          almacenDestino: new ObjectId(almacenPrincipal._id),
          tipo: 'movimiento',
          tipoMovimiento: 'entrada',
          lote: `LOTE-${generarCodigoRandom(7)}`,
          fechaVencimiento: moment().toDate(),
          fechaIngreso: fecha,
          fechaMovimiento: fecha,
          costoUnitario: detalle.costoUnitario,
          costoPromedio: Number(costoPromedio.toFixed(2)),
          creadoPor: new ObjectId(req.uid),
          compraId: newOrdenCompra.insertedId,
          borrar: true,
          fechaCreacion: moment().toDate()
        }
        // console.log({ productoAlmacen })
        dataProductoAlmace.push(productoAlmacen)
        await updateItem({
          nameCollection: 'productos',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(producto._id) },
          update: { $set: { costoPromedio: Number(costoPromedio.toFixed(2)) } }
        })
        await createItemSD({
          nameCollection: 'ajustePrecioProducto',
          enviromentClienteId: clienteId,
          item: {
            productoId: new ObjectId(producto._id),
            fecha,
            costoPromedio: Number(costoPromedio.toFixed(2)),
            borrar: true
          }
        })
      }
      // const uniqueItems = Array.from(new Set(dataProductoAlmace.map(a => JSON.stringify(a)))).map(a => JSON.parse(a))
    }
    console.log({ length: dataProductoAlmace.length })
    /* await bulkWriteSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: dataProductoAlmace
    }) */
    await createManyItemsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      items: dataProductoAlmace
    })
    await createManyItemsSD({
      nameCollection: 'detalleCompra',
      enviromentClienteId: clienteId,
      items: detalleOrdenCompra
    })
    await createManyItemsSD({
      nameCollection: 'detalleMovimientos',
      enviromentClienteId: clienteId,
      items: detalleMovimientoInventario
    })
    await createManyItemsSD({
      nameCollection: 'detalleDocumentosFiscales',
      enviromentClienteId: clienteId,
      items: detalleCompra
    })
    return res.status(200).json({ status: 'compras guardados' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor ' + e.message })
  }
}
export const saveVentasExcel = async (req, res) => {
  const { clienteId, items } = req.body
  try {
    const groupDocumento = items.reduce((acc, row) => {
      const documento = row.documento
      const fecha = row.fecha
      // Buscar si ya existe un grupo con el mismo documento
      let group = acc.find(g => g.documento === documento)
      // Si no existe, crear un nuevo grupo con documento, fecha e items vacíos
      if (!group) {
        group = { documento, fecha, items: [] }
        acc.push(group)
      }
      // Agregar la fila al array de items del grupo correspondiente
      group.items.push(row)
      return acc
    }, [])
    const almacenPrincipal = await getItemSD({
      nameCollection: 'almacenes',
      enviromentClienteId: clienteId,
      filters: { nombre: 'Almacen 1' }
    })
    const ajusteSistema = await getItemSD({
      nameCollection: 'ajustes',
      enviromentClienteId: clienteId,
      filters: { tipo: 'sistema' }
    })
    const cliente = await getItemSD({
      nameCollection: 'clientes',
      enviromentClienteId: clienteId,
      filters: { razonSocial: 'Cliente 1' }
    })
    const ivaData = await getItem({
      nameCollection: 'iva',
      filters: { tipo: 'General' }
    })
    const banco = await getItemSD({
      nameCollection: 'bancos',
      enviromentClienteId: clienteId,
      filters: { tipo: 'Nacional', tipoBanco: 'banco' }
    })
    const sucursal = await getItemSD({
      nameCollection: 'ventassucursales',
      enviromentClienteId: clienteId,
      filters: { nombre: 'sucursal 1' }
    })
    const caja = await getItemSD({
      nameCollection: 'ventascajas',
      enviromentClienteId: clienteId,
      filters: { nombre: 'caja 1' }
    })
    const zona = await getItemSD({
      nameCollection: 'ventaszonas',
      enviromentClienteId: clienteId,
      filters: { nombre: 'zona C1' }
    })
    console.log({ ivaData, cliente, banco, caja, almacenPrincipal, zona, sucursal })
    const dataProductoAlmace = []
    const detalleMovimientoInventario = []
    const detalleVenta = []
    console.log({ lengthDocum: groupDocumento.length })
    for (const item of groupDocumento) {
      const fecha = momentDate(ajusteSistema.timeZone || 'America/Caracas', item.fecha).toDate()
      // console.log(item)
      const baseImponible = item.items.reduce((acc, row) => acc + Number(row.costoTotal), 0)
      const iva = Number((baseImponible * (ivaData.iva || 0) / 100).toFixed(2))
      // console.log({ baseImponible })
      let contadorInventario = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'despacho-ventas' } }))?.contador
      if (contadorInventario) ++contadorInventario
      if (!contadorInventario) contadorInventario = 1
      await upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: 'despacho-ventas' }, update: { $set: { contador: contadorInventario } } })
      const documento = await createItemSD({
        nameCollection: 'documentosFiscales',
        enviromentClienteId: clienteId,
        item: {
          // datos del documento
          tipoMovimiento: 'venta',
          fecha,
          fechaCreacion: moment().toDate(),
          numeroFactura: item.documento,
          numero: item.documento,
          tipoDocumento: 'Factura',
          // activo,
          isExportacion: false,
          isDespacho: true,
          numeroControl: item.documento,
          useImpresoraFiscal: false,
          sucursalId: sucursal._id,
          almacenId: almacenPrincipal._id,
          cajaId: new ObjectId(caja._id),
          // datos de monedas
          tasaDia: 1,
          moneda: 'Bs',
          monedaSecundaria: 'Bs',
          // datos de montos e impuestos
          hasIgtf: false,
          baseImponible,
          exentoSinDescuento: 0,
          iva,
          totalDescuento: 0,
          total: baseImponible + iva,
          baseImponibleSecundaria: baseImponible,
          ivaSecundaria: iva,
          totalDescuentoSecundaria: 0,
          totalSecundaria: baseImponible + iva,
          totalIgtf: 0,
          // total pagado
          totalPagado: baseImponible + iva,
          diferenciaVenta: 0,
          // total establecido a credito
          totalCredito: 0,
          totalCreditoSecundario: 0,
          diasCredito: 0,
          fechaVencimiento: moment().toDate(),
          // cuando se realicen pagos al credito se abonara a este total
          totalAbonado: baseImponible + iva,
          // estado como primero filtro antes de buscar las que estan pagadas
          estado: 'pagada',
          fechaUltimoPago: moment().toDate(),
          // este es un arreglo que tiene el texto del total de los IVA por porcentaje
          // datos del vendedor
          creadoPor: new ObjectId(req.uid),
          // creadoPorNombre: vendedor.nombre,
          // datos del cliente de la venta
          clienteId: new ObjectId(cliente._id),
          clienteNombre: cliente.razonSocial,
          clienteDocumentoIdentidad: cliente.documentoIdentidad,
          direccion: cliente.direccion,
          direccionEnvio: cliente.direccionEnvio,
          zonaId: new ObjectId(zona._id),
          zonaNombre: zona.nombre,
          // datos del cliente del producto
          ownLogo: sucursal.logo || cliente.logo,
          ownRazonSocial: sucursal.nombre || cliente.razonSocial,
          ownDireccion: sucursal.direccion || cliente.direccion,
          ownDocumentoIdentidad: sucursal.rif || `${cliente.tipoDocumento}-${cliente.documentoIdentidad}`,
          borrar: true
        }
      })
      await createItemSD({
        nameCollection: 'transacciones',
        enviromentClienteId: clienteId,
        item: {
          documentoId: new ObjectId(documento.insertedId),
          clienteId: new ObjectId(cliente._id),
          metodo: 'banco', // caja, banco
          pago: baseImponible + iva,
          pagoSecundario: baseImponible + iva,
          fechaPago: fecha,
          referencia: generarCodigoRandom(6),
          banco: banco._id,
          caja: caja._id,
          porcentajeIgtf: 0,
          pagoIgtf: 0,
          moneda: 'Bs',
          monedaSecundaria: 'Bs',
          tasa: 1,
          tipo: 'venta',
          tipoDocumento: 'Factura',
          creadoPor: new ObjectId(req.uid),
          credito: 0,
          fechaCreacion: moment().toDate(),
          borrar: true
        }
      })
      const movimientoInventario = await createItemSD({
        nameCollection: 'movimientos',
        enviromentClienteId: clienteId,
        item: {
          fecha,
          fechaVencimiento: moment().toDate(),
          tipo: 'despacho-ventas',
          documentoId: documento.insertedId,
          tipoDocumento: 'Factura',
          almacenOrigen: almacenPrincipal._id,
          almacenDestino: null,
          zona: zona._id,
          estado: 'Despachado',
          numeroMovimiento: contadorInventario,
          creadoPor: new ObjectId(req.uid),
          fechaCreacion: moment().toDate(),
          borrar: true
        }
      })
      for (const detalle of item.items) {
        const producto = await getItemSD({
          nameCollection: 'productos',
          enviromentClienteId: clienteId,
          filters: { codigo: detalle.codigo }
        })
        detalleMovimientoInventario.push({
          movimientoId: movimientoInventario.insertedId,
          documentoId: documento.insertedId,
          tipoDocumento: 'Factura',
          productoId: producto._id,
          codigo: producto.codigo,
          nombre: producto.nombre,
          cantidad: detalle.cantidad,
          costoUnitario: Number(detalle.costoUnitario),
          borrar: true
        })
        detalleVenta.push({
          documentoId: documento.insertedId,
          tipoMovimiento: 'venta',
          tipoDocumento: 'Factura',
          productoId: new ObjectId(producto._id),
          codigo: producto.codigo,
          nombre: producto.nombre,
          cantidad: detalle.cantidad,
          tipo: 'producto',
          precioVenta: Number(detalle.costoUnitario.toFixed(2)),
          precioSinDescuento: Number(detalle.costoUnitario.toFixed(2)),
          descuento: 0,
          descuentoTotal: 0,
          precioConDescuento: Number(detalle.costoUnitario.toFixed(2)),
          baseImponible: Number(detalle.costoTotal.toFixed(2)),
          montoIva: Number((detalle.costoTotal * (ivaData?.iva || 0) / 100).toFixed(2)),
          ivaId: new ObjectId(ivaData._id),
          iva: ivaData.iva,
          precioTotal: Number(detalle.costoTotal.toFixed(2)) + Number((detalle.costoTotal * (ivaData?.iva || 0) / 100).toFixed(2)),
          costoPromedio: producto.costoPromedio,
          fechaCreacion: moment().toDate(),
          borrar: true
        })
        const datosMovivientoPorProducto = await agreggateCollectionsSD({
          nameCollection: 'productosPorAlmacen',
          enviromentClienteId: clienteId,
          pipeline: [
            { $match: { productoId: new ObjectId(producto._id), almacenId: almacenPrincipal._id } },
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
        for (const movimientos of datosMovivientoPorProducto) {
          if (detalle.cantidad === 0) break
          if (detalle.cantidad >= movimientos.cantidad) {
            dataProductoAlmace.push({
              // detalles de la venta
              documentoId: documento.insertedId,
              tipoDocumento: 'Factura',
              productoId: new ObjectId(producto._id),
              movimientoId: new ObjectId(movimientoInventario.insertedId),
              cantidad: Number(movimientos.cantidad),
              almacenId: almacenPrincipal._id,
              almacenOrigen: almacenPrincipal._id,
              almacenDestino: null,
              tipo: 'movimiento',
              tipoMovimiento: 'salida',
              lote: movimientos.lote,
              fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
              fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
              fechaMovimiento: moment(fecha).toDate(),
              costoUnitario: movimientos.costoUnitario,
              costoPromedio: movimientos.costoPromedio,
              creadoPor: new ObjectId(req.uid),
              borrar: true
            })
            detalle.cantidad -= movimientos.cantidad
            continue
          }
          if (detalle.cantidad < movimientos.cantidad) {
            dataProductoAlmace.push({
              documentoId: documento.insertedId,
              tipoDocumento: 'Factura',
              productoId: new ObjectId(producto._id),
              movimientoId: new ObjectId(movimientoInventario.insertedId),
              cantidad: Number(detalle.cantidad),
              almacenId: almacenPrincipal._id,
              almacenOrigen: almacenPrincipal._id,
              almacenDestino: null,
              tipo: 'movimiento',
              tipoMovimiento: 'salida',
              lote: movimientos.lote,
              fechaVencimiento: moment(movimientos.fechaVencimiento).toDate(),
              fechaIngreso: moment(movimientos.fechaIngreso).toDate(),
              fechaMovimiento: moment(fecha).toDate(),
              costoUnitario: movimientos.costoUnitario,
              costoPromedio: movimientos.costoPromedio,
              creadoPor: new ObjectId(req.uid),
              borrar: true
            })
            detalle.cantidad = 0
            break
          }
        }
      }
      // const uniqueItems = Array.from(new Set(dataProductoAlmace.map(a => JSON.stringify(a)))).map(a => JSON.parse(a))
    }
    console.log({ length: dataProductoAlmace.length })
    await createManyItemsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      items: dataProductoAlmace
    })
    await createManyItemsSD({
      nameCollection: 'detalleMovimientos',
      enviromentClienteId: clienteId,
      items: detalleMovimientoInventario
    })
    await createManyItemsSD({
      nameCollection: 'detalleDocumentosFiscales',
      enviromentClienteId: clienteId,
      items: detalleVenta
    })
    return res.status(200).json({ status: 'ventas guardados' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor ' + e.message })
  }
}
export const deleteImportaciones = async (req, res) => {
  try {
    const { clienteId } = req.body
    await deleteManyItemsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      filters: { borrar: true }
    })
    await deleteManyItemsSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      filters: { borrar: true }
    })
    await deleteManyItemsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      filters: { borrar: true }
    })
    await deleteManyItemsSD({
      nameCollection: 'compras',
      enviromentClienteId: clienteId,
      filters: { borrar: true }
    })
    await deleteManyItemsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      filters: { borrar: true }
    })
    deleteManyItemsSD({
      nameCollection: 'detalleCompra',
      enviromentClienteId: clienteId,
      filters: { borrar: true }
    })
    await deleteManyItemsSD({
      nameCollection: 'detalleDocumentosFiscales',
      enviromentClienteId: clienteId,
      filters: { borrar: true }
    })
    await deleteManyItemsSD({
      nameCollection: 'detalleMovimientos',
      enviromentClienteId: clienteId,
      filters: { borrar: true }
    })
    await deleteManyItemsSD({
      nameCollection: 'ajustePrecioProducto',
      enviromentClienteId: clienteId,
      filters: { borrar: true }
    })
    return res.status(200).json({ status: 'borrado' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor ' + e.message })
  }
}

function generarCodigoRandom (length) {
  return randomBytes(length)
    .toString('base64')
    .slice(0, length)
    .replace(/\+/g, '0')
    .replace(/\//g, '0')
}
