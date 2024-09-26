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
            nombre: 1
          }
        }
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
                  }
                }
              }
            ],
            as: 'transacciones'
          }
        }, /*
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
                  totalCredito: 1
                }
              },
              {
                $lookup: {
                  from: transaccionesCol,
                  localField: '_id',
                  foreignField: 'documentoId',
                  as: 'transacciones'
                }
              },
              { $unwind: { path: '$transacciones', preserveNullAndEmptyArrays: false } },
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
                  }
                }
              }
            ],
            as: 'documentos'
          }
        },
        { $unwind: { path: '$documentos', preserveNullAndEmptyArrays: true } },
         */
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
    return res.status(200).json({ cajas })
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

