import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, formatCollectionName, getItemSD, updateItemSD } from '../../../utils/dataBaseConfing.js'
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
    return res.status(200).json({ sucursales })
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