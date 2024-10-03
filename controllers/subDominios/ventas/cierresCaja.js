import { ObjectId } from 'mongodb'
import { agreggateCollections, agreggateCollectionsSD, formatCollectionName, getItemSD, updateItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { subDominioName } from '../../../constants.js'

export const getSucursalesByUser = async (req, res) => {
  const { clienteId, userId } = req.body
  try {
    const usuario = await getItemSD({
      nameCollection: 'personas',
      pipeline: [
        { $match: { usuarioId: new ObjectId(userId) } }
      ]
    })
    if (!usuario) throw new Error('Su usuario no existe en la base de datos')
    const isEmpresa = usuario.isEmpresa
    const personasCol = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })

    const query = { usuarios: { $exists: true, $elemMatch: { $eq: new ObjectId(userId) } } }
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
            supervisor: 1
          }
        },
        {
          $lookup: {
            from: personasCol,
            localField: 'supervisor',
            foreignField: '_id',
            as: 'supervisorData'
          }
        },
        { $unwind: { path: '$supervisorData', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            nombre: 1,
            supervisor: '$supervisorData.nombre'
          }
        },
      ]
    })
    const bancos = await agreggateCollectionsSD({
      nameCollection: 'bancos',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $project: {
            nombre: '$nombre',
            descripcion: '$descripcion',
            tipo: '$tipo',
            tipoBanco: '$tipoBanco'
          }
        }
      ]
    })
    return res.status(200).json({ sucursales, bancos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener datos de las sucursales' + e.message })
  }
}

export const getCajasBySucursal = async (req, res) => {
  const { clienteId, filters } = req.body
  try {
    const query = {}
    if (filters.sucursalId) query.sucursalId = new ObjectId(filters.sucursalId)
    const documentosFiscalesCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const transaccionesCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'transacciones' })
    const cajas = await agreggateCollectionsSD({
      nameCollection: 'ventascajas',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: query },
        {
          $lookup: {
            from: documentosFiscalesCol,
            localField: '_id',
            foreignField: 'cajaId',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  cajaId: 1,
                  tipoDocumento: 1,
                  totalCredito: 1,
                  totalPagado: 1,
                  fechaCreacion: 1
                }
              }
            ],
            as: 'documentos'
          }
        },
        { $unwind: { path: '$documentos', preserveNullAndEmptyArrays: false } },
        {
          $facet: {
            cajas: [
              { $sort: { 'documentos.fechaCreacion': 1 } },
              {
                $group: {
                  _id: '$_id',
                  nombre: {
                    $first: '$nombre'
                  },
                  ventas: {
                    $sum: {
                      $cond: {
                        if: { $in: ['$documentos.tipoDocumento', ['Nota de crédito', 'Devolución']] },
                        then: { $multiply: ['$documentos.totalPagado', -1] },
                        else: '$documentos.totalPagado'
                      }
                    }
                  },
                  caja: {
                    $sum: {
                      $cond: {
                        if: { $in: ['$documentos.tipoDocumento', ['Nota de crédito', 'Devolución']] },
                        then: { $multiply: [{ $subtract: ['$documentos.totalPagado', '$documentos.totalCredito']}, -1] },
                        else: { $subtract: ['$documentos.totalPagado', '$documentos.totalCredito'] }
                      }
                    }
                  },
                  credito: {
                    $sum: {
                      $cond: {
                        if: { $in: ['$documentos.tipoDocumento', ['Nota de crédito', 'Devolución']] },
                        then: { $multiply: ['$documentos.totalCredito', -1] },
                        else: '$documentos.totalCredito'
                      }
                    }
                  },
                  apertura: {
                    $first: '$documentos.fechaCreacion'
                  },
                  cierre: {
                    $last: '$documentos.fechaCreacion'
                  }
                }
              },
              {
                $addFields: {
                  diff: {
                    $dateDiff: {
                      startDate: '$apertura',
                      endDate: '$cierre',
                      unit: 'hour'
                    }
                  }
                }
              }
            ],
            cobros: [
              { $match: { 'documentos.totalCredito': { $gt: 0 } } },
              {
                $lookup: {
                  from: transaccionesCol,
                  localField: 'documentos._id',
                  foreignField: 'documentoId',
                  pipeline: [
                    { $match: { cierreCajaId: { $exists: false } } }
                  ],
                  as: 'transacciones'
                }
              },
              { $unwind: { path: '$transacciones', preserveNullAndEmptyArrays: false } },
              {
                $group: {
                  _id: { $ifNull: ['$transacciones.caja', '$_id'] },
                  cobro: {
                    $sum: {
                      $cond: {
                        if: { $in: ['$documentos.tipoDocumento', ['Nota de crédito', 'Devolución']] },
                        then: { $multiply: ['$transacciones.pago', -1] },
                        else: '$transacciones.pago'
                      }
                    }
                  }
                }
              }
            ]
          }
        }
      ]
    })
    const cajasData = cajas[0]?.cajas || []
    const cobros = cajas[0]?.cobros || []
    for (const cobro of cobros) {
      const caja = cajasData.find(e => String(e._id) === String(cobro._id))
      if (!caja) {
        const cajaNombre = await getItemSD({
          nameCollection: 'ventascajas',
          enviromentClienteId: clienteId,
          filters: { _id: cobro._id }
        })
        cajasData.push({ ...cobro, nombre: cajaNombre?.nombre })
        continue
      } else {
        caja.cobro = cobro?.cobro || 0
      }
    }
    /*
      const cajas = await agreggateCollectionsSD({
      nameCollection: 'ventascajas',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: query },
        {
          $lookup: {
            from: transaccionesCol,
            localField: '_id',
            foreignField: 'caja',
            pipeline: [
              {
                $match: {
                  cierreCajaId: { $exists: false }
                }
              },
              {
                $lookup: {
                  from: documentosFiscalesCol,
                  localField: 'documentoId',
                  foreignField: '_id',
                  pipeline: [
                    {
                      $project: {
                        _id: 1,
                        cajaId: 1,
                        tipoDocumento: 1,
                        totalCredito: 1
                      }
                    }
                  ],
                  as: 'documentos'
                }
              },
              { $unwind: { path: '$documentos', preserveNullAndEmptyArrays: false } },
              {
                $project: {
                  _id: '$documentos._id',
                  cajaId: '$documentos.cajaId',
                  tipoDocumento: '$documentos.tipoDocumento',
                  totalCredito: '$documentos.totalCredito',
                  transacciones: {
                    pago: '$pago',
                    caja: '$caja',
                    banco: '$banco'
                  }
                }
              },
              {
                $group: {
                  _id: 0,
                  cobros: {
                    $sum: {
                      $cond: {
                        if: {
                          $and: [
                            { $gt: ['$totalCredito', 0] },
                            { $in: ['$tipoDocumento', ['Factura', 'Nota de entrega', 'Nota de débito']] }
                          ]
                        },
                        then: '$transacciones.pago',
                        else: 0
                      }
                    }
                  },
                  efectivo: {
                    $sum: {
                      $cond: {
                        if: {
                          $and: [
                            { $eq: ['$transacciones.caja', '$cajaId'] },
                            { $ne: [{ $type: '$transacciones.banco' }, 'objectId'] },
                            { $in: ['$tipoDocumento', ['Factura', 'Nota de entrega', 'Nota de débito']] }
                          ]
                        },
                        then: '$transacciones.pago',
                        else: {
                          $cond: {
                            if: { $ne: [{ $type: '$transacciones.banco' }, 'objectId'] },
                            then: { $multiply: ['$transacciones.pago', -1] },
                            else: 0
                          }
                        }
                      }
                    }
                  },
                  banco: {
                    $sum: {
                      $cond: {
                        if: {
                          $and: [
                            { $eq: [{ $type: '$transacciones.banco' }, 'objectId'] },
                            { $in: ['$tipoDocumento', ['Factura', 'Nota de entrega', 'Nota de débito']] }
                          ]
                        },
                        then: '$transacciones.pago',
                        else: {
                          $cond: {
                            if: { $eq: [{ $type: '$transacciones.banco' }, 'objectId'] },
                            then: { $multiply: ['$transacciones.pago', -1] },
                            else: 0
                          }
                        }
                      }
                    }
                  },
                  ventas: {
                    $sum: {
                      $cond: {
                        if: { $in: ['$tipoDocumento', ['Nota de crédito', 'Devolución']] },
                        then: { $multiply: ['$transacciones.pago', -1] },
                        else: '$transacciones.pago'
                      }
                    }
                  },
                  caja: {
                    $sum: {
                      $cond: {
                        if: {
                          $and: [
                            {
                              $or: [
                                { $eq: ['$transacciones.caja', '$cajaId'] },
                                { $eq: [{ $type: '$transacciones.banco' }, 'objectId'] },
                              ]
                            }
                            
                            
                            { $in: ['$tipoDocumento', ['Factura', 'Nota de entrega', 'Nota de débito']] }
                          ]
                        },
                        then: '$transacciones.pago',
                        else: {
                          $cond: {
                            if: { $ne: [{ $type: '$transacciones.banco' }, 'objectId'] },
                            then: { $multiply: ['$transacciones.pago', -1] },
                            else: 0
                          }
                        }
                      }
                    }
                  },
                }
              }
            ],
            as: 'transacciones'
          }
        },
        { $unwind: { path: '$transacciones', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            nombre: 1,
            cobros: { $ifNull: ['$transacciones.cobros', 0] },
            efectivo: { $ifNull: ['$transacciones.efectivo', 0] },
            banco: { $ifNull: ['$transacciones.banco', 0] }
          }
        }
      ]
      })
    */
    return res.status(200).json({ cajas: cajasData })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener datos de las sucursales' + e.message })
  }
}

export const getCorteCaja = async (req, res) => {
  const { clienteId, sucursalId, cajaId } = req.body
  try {
    if (!cajaId) throw new Error('Debe seleccionar una caja valida')
    if (!sucursalId) throw new Error('Debe seleccionar una sucursal valida')
    const query = {
      sucursalId: new ObjectId(sucursalId),
      _id: new ObjectId(cajaId)
    }
    const queryDocs = {}
    const lastCierre = await agreggateCollectionsSD({
      nameCollection: 'cierrescaja',
      enviromentClienteId: clienteId,
      pipeline: [
        { $sort: { fecha: -1 } },
        { $limit: 1 }
      ]
    })
    if (lastCierre.fecha) {
      queryDocs.fecha = { $gte: momentDate(undefined, lastCierre.fecha).toDate() }
    }
    const ajustesSistema = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })
    const monedaPrincipal = ajustesSistema.monedaPrincipal || 'Bs'
    const documentosFiscalesCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const transaccionesCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'transacciones' })
    const corte = await agreggateCollectionsSD({
      nameCollection: 'ventascajas',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: query },
        {
          $lookup: {
            from: documentosFiscalesCol,
            localField: '_id',
            foreignField: 'cajaId',
            pipeline: [
              { $match: queryDocs },
              {
                $project: {
                  _id: 1,
                  tipoDocumento: 1,
                  totalPagado: 1,
                  totalCredito: 1,
                  numeroControl: 1,
                }
              },
              {
                $lookup: {
                  from: transaccionesCol,
                  localField: '_id',
                  foreignField: 'documentoId',
                  pipeline: [
                    { $match: { cierreCajaId: { $exists: false } } }
                  ],
                  as: 'transacciones'
                }
              },
              {
                $facet: {
                  venta: [
                    // { $match: { $expr: { $ne: [{ $size: '$transacciones' }, 0] } } },
                    {
                      $group: {
                        _id: '$tipoDocumento',
                        montoZ: {
                          $sum: {
                            $cond: {
                              if: { $ne: ['$numeroControl', ''] },
                              then: '$totalPagado',
                              else: 0
                            }
                          }
                        },
                        montoManual: {
                          $sum: {
                            $cond: {
                              if: { $ne: ['$numeroControl', ''] },
                              then: 0,
                              else: '$totalPagado'
                            }
                          }
                        }
                      }
                    },
                    {
                      $match: {
                        $or: [
                          { montoZ: { $ne: 0 } },
                          { montoManual: { $ne: 0 } }
                        ]
                      }
                    },
                    { $sort: { _id: 1 } }
                  ],
                  cobros: [
                    { $match: { $expr: { $ne: [{ $size: '$transacciones' }, 0] } } },
                    // { $match: { totalCredito: { $gt: 0 } } },
                    { $unwind: { path: '$transacciones', preserveNullAndEmptyArrays: true } },
                    {
                      $group: {
                        _id: {
                          metodo: {
                            $cond: {
                              if: { $eq: [{ $type: '$transacciones.banco' }, 'objectId'] },
                              then: 'banco',
                              else: 'caja'
                            }
                          },
                          divisas: {
                            $cond: {
                              if: { $ne: ['$transacciones.monedaSecundaria', monedaPrincipal] },
                              then: true,
                              else: false
                            }
                          },
                          cajaId: { $ifNull: ['$transacciones.caja', '$cajaId'] },
                          banco: '$transacciones.banco'
                        },
                        monto: {
                          $sum: {
                            $cond: {
                              if: { $in: ['$tipoDocumento', ['Nota de crédito', 'Devolución']] },
                              then: { $multiply: ['$transacciones.pago', -1] },
                              else: '$transacciones.pago'
                            }
                          }
                        },
                        montoSecundario: {
                          $sum: {
                            $cond: {
                              if: { $in: ['$tipoDocumento', ['Nota de crédito', 'Devolución']] },
                              then: { $multiply: ['$transacciones.pagoSecundario', -1] },
                              else: '$transacciones.pagoSecundario'
                            }
                          }
                        }
                      }
                    },
                    {
                      $match: {
                        '_id.cajaId': query._id
                      }
                    }
                  ],
                  credito: [
                    { $match: { totalCredito: { $gt: 0 } } },
                    {
                      $group: {
                        _id: '$_id',
                        totalCredito: {
                          $first: '$totalCredito'
                        },
                        transacciones: {
                          $first: '$transacciones'
                        }
                      }
                    },
                    { $unwind: { path: '$transacciones', preserveNullAndEmptyArrays: true } },
                    {
                      $group: {
                        _id: {
                          doc: '$_id',
                          cajaId: { $ifNull: ['$transacciones.caja', query._id] },
                        },
                        totalCredito: {
                          $first: '$totalCredito'
                        },
                        pagos: {
                          $sum: '$transacciones.pago'
                        }
                      }
                    },
                    {
                      $match: {
                        '_id.cajaId': query._id
                      }
                    },
                    {
                      $group: {
                        _id: 0,
                        totalCredito: {
                          $sum: '$totalCredito'
                        },
                        totalPagos: {
                          $sum: '$pagos'
                        }
                      }
                    },
                  ]
                }
              }
            ],
            as: 'documentos'
          }
        },
        { $unwind: { path: '$documentos', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$documentos.credito', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            venta: '$documentos.venta',
            cobros: '$documentos.cobros',
            totalCredito: { $ifNull: ['$documentos.credito.totalCredito', 0] },
            totalPagos: { $ifNull: ['$documentos.credito.totalPagos', 0] }
          }
        }
      ]
    })
    return res.status(200).json({ corte: corte[0] })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener datos de las sucursales' + e.message })
  }
}
/*
export const getCorteCaja = async (req, res) => {
  const { clienteId, sucursalId, cajaId } = req.body
  try {
    if (!cajaId) throw new Error('Debe seleccionar una caja valida')
    if (!sucursalId) throw new Error('Debe seleccionar una sucursal valida')
    const query = {
      sucursalId: new ObjectId(sucursalId),
      _id: new ObjectId(cajaId),
    }
    const ajustesSistema = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })
    const monedaPrincipal = ajustesSistema.monedaPrincipal || 'Bs'
    const documentosFiscalesCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const transaccionesCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'transacciones' })
    const corte = await agreggateCollectionsSD({
      nameCollection: 'ventascajas',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: query },
        {
          $lookup: {
            from: documentosFiscalesCol,
            localField: '_id',
            foreignField: 'cajaId',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  tipoDocumento: 1,
                  totalPagado: 1,
                  totalCredito: 1
                }
              },
              {
                $lookup: {
                  from: transaccionesCol,
                  localField: '_id',
                  foreignField: 'documentoId',
                  pipeline: [
                    { $match: { cierreCajaId: { $exists: false } } }
                  ],
                  as: 'transacciones'
                }
              },
              {
                $facet: {
                  venta: [
                    { $match: { $expr: { $ne: [{ $size: '$transacciones' }, 0] } } },
                    {
                      $group: {
                        _id: '$tipoDocumento',
                        monto: {
                          $sum: '$totalPagado'
                        }
                      }
                    },
                    { $sort: { _id: 1 } }
                  ],
                  cobros: [
                    { $match: { $expr: { $ne: [{ $size: '$transacciones' }, 0] } } },
                    // { $match: { totalCredito: { $gt: 0 } } },
                    { $unwind: { path: '$transacciones', preserveNullAndEmptyArrays: true } },
                    {
                      $group: {
                        _id: {
                          metodo: {
                            $cond: {
                              if: { $eq: [{ $type: '$transacciones.banco' }, 'objectId'] },
                              then: 'banco',
                              else: 'caja'
                            }
                          },
                          divisas: {
                            $cond: {
                              if: { $ne: ['$transacciones.monedaSecundaria', monedaPrincipal] },
                              then: true,
                              else: false
                            }
                          },
                          cajaId: { $ifNull: ['$transacciones.caja', '$cajaId'] },
                          banco: '$transacciones.banco'
                        },
                        monto: {
                          $sum: {
                            $cond: {
                              if: { $in: ['$tipoDocumento', ['Nota de crédito', 'Devolución']] },
                              then: { $multiply: ['$transacciones.pago', -1] },
                              else: '$transacciones.pago'
                            }
                          }
                        }
                      }
                    },
                    {
                      $match: {
                        '_id.cajaId': query._id
                      }
                    }
                  ],
                  credito: [
                    { $match: { totalCredito: { $gt: 0 } } },
                    {
                      $group: {
                        _id: '$_id',
                        totalCredito: {
                          $first: '$totalCredito'
                        },
                        transacciones: {
                          $first: '$transacciones'
                        }
                      }
                    },
                    { $unwind: { path: '$transacciones', preserveNullAndEmptyArrays: true } },
                    {
                      $group: {
                        _id: {
                          doc: '$_id',
                          cajaId: { $ifNull: ['$transacciones.caja', query._id] },
                        },
                        totalCredito: {
                          $first: '$totalCredito'
                        },
                        pagos: {
                          $sum: '$transacciones.pago'
                        }
                      }
                    },
                    {
                      $match: {
                        '_id.cajaId': query._id
                      }
                    },
                    {
                      $group: {
                        _id: 0,
                        totalCredito: {
                          $sum: '$totalCredito'
                        },
                        totalPagos: {
                          $sum: '$pagos'
                        }
                      }
                    },
                    {
                      $project: {
                        totalCredito: { $subtract: ['$totalCredito', '$totalPagos'] }
                      }
                    }
                  ]
                }
              }
            ],
            as: 'documentos'
          }
        },
        { $unwind: { path: '$documentos', preserveNullAndEmptyArrays: true } },
        { $unwind: { path: '$documentos.credito', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            venta: '$documentos.venta',
            cobros: '$documentos.cobros',
            totalCredito: { $ifNull: ['$documentos.credito.totalCredito', 0] }
          }
        }
      ]
    })
    return res.status(200).json({ corte: corte[0] })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener datos de las sucursales' + e.message })
  }
}
*/
