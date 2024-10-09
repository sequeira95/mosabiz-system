import { ObjectId } from 'mongodb'
import { subDominioName } from '../../constants.js'
import { agreggateCollectionsSD, formatCollectionName, getCollectionSD, getItemSD } from '../../utils/dataBaseConfing.js'
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
                { $match: { almacenId: { $nin: almacenesInvalid.map(e => e._id) } } },
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
    /* const prueba = await agreggateCollectionsSD({
      nameCollection: 'productosPorAlmacen',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            productoId: new ObjectId('66b6cb89f60656537bd12960'),
            fechaMovimiento: { $lte: momentDate(timeZone, hasta).endOf('month').toDate() },
            almacenId: { $ne: new ObjectId(almacenes.find(e => e.nombre === 'Auditoria')?._id) }
          }
        },
        {
          $group: {
            _id: 0,
            lasCosto: { $last: '$costoPromedio' }
          }
        }
      ]
    }) */
    if (itemsPorPagina || pagina) {
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      const groupMeses = {}
      const projectMeses = {}
      let mesesSeleccionados = 0
      const addMeses = []
      const fecha = momentDate(timeZone, desde).endOf('month')
      for (let i = 0; i < meses.length; i++) {
        if (fecha.isAfter(hasta)) break
        console.log({ fecha })
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
              else: '$costoPromedio'
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
      // console.log(groupMeses, projectMeses, fecha, mesesSeleccionados, addMeses.join(', '))
      const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
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
              totalPromedioRotacion: { $divide: [{ $add: addMeses }, mesesSeleccionados] },
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
      const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
      const groupMeses = {}
      const projectMeses = {}
      let mesesSeleccionados = 0
      const addMeses = []
      const fecha = momentDate(timeZone, desde).endOf('month')
      for (let i = 0; i < meses.length; i++) {
        if (fecha.isAfter(hasta)) break
        // console.log({ fecha })
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
              else: '$costoPromedio'
            }
          }
        }
        projectMeses[meses[i] + 'Entrada'] = 1
        projectMeses[meses[i] + 'Salida'] = 1
        projectMeses[meses[i] + 'LastCosto'] = 1
        projectMeses[meses[i]] = { $multiply: [{ $subtract: [`$${meses[i]}Entrada`, `$${meses[i]}Salida`] }, `$${meses[i]}LastCosto`] }
        addMeses.push(`$detalleSalida.${meses[i]}`)
        fecha.set('month', i + 1)
      }
      // console.log(groupMeses, projectMeses, fecha, mesesSeleccionados, addMeses)
      const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
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
                    almacenId: { $nin: almacenesInvalidSalida }
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
                    _id: '$almacenId',
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
              localField: 'detalleSalida._id',
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
  const { clienteId, desde, hasta, timeZone, itemsPorPagina, pagina } = req.body
  console.log(req.body)
  try {
    const count = await agreggateCollectionsSD({
      nameCollection: 'movimientos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { fecha: { $gte: moment(desde).toDate(), $lte: moment(hasta).toDate() }, estado: { $ne: 'Cancelado' } } },
        { $count: 'total' }
      ]
    })
    if (itemsPorPagina || pagina) {
      const alamcenesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
      const zonasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonas' })
      const movimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'movimientos' })
      const productosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productos' })
      const almacenTransito = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Transito' } })
      const almacenDevoluciones = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Devoluciones' } })
      const movimientos = await agreggateCollectionsSD({
        nameCollection: 'productosPorAlmacen',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { fechaMovimiento: { $gte: moment(desde).toDate(), $lte: moment(hasta).toDate() }, almacenId: { $ne: new ObjectId(almacenTransito?._id) }/*, estado: { $ne: 'Cancelado' } */ } },
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
                        { $eq: ['$almacenId', new ObjectId(almacenDevoluciones?._id)] }
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
