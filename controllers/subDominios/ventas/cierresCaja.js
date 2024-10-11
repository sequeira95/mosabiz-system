import { ObjectId } from 'mongodb'
import { agreggateCollections, agreggateCollectionsSD, createItem, createItemSD, formatCollectionName, getItem, getItemSD, updateItemSD } from '../../../utils/dataBaseConfing.js'
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
    let tasa = await getItem({ nameCollection: 'tasas', filters: { fechaUpdate: momentDate().format('DD/MM/YYYY') } })
    if (!tasa) {
      const ultimaTasa = await agreggateCollections({
        nameCollection: 'tasas',
        pipeline: [
          { $sort: { fechaOperacion: -1 } },
          { $limit: 1 }
        ]
      })
      tasa = ultimaTasa[0] || {}
    }
    return res.status(200).json({ sucursales, bancos, tasa })
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
    const queryDocs = {}
    const lastCierre = await agreggateCollectionsSD({
      nameCollection: 'cierrescaja',
      enviromentClienteId: clienteId,
      pipeline: [
        { $sort: { fecha: -1 } },
        { $limit: 1 }
      ]
    })
    if (lastCierre[0]?.fecha) {
      queryDocs.fechaUltimoPago = { $gte: momentDate(undefined, lastCierre[0]?.fecha).toDate() }
    }
    const documentosFiscalesCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
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
              { $match: queryDocs },
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
        { $unwind: { path: '$documentos', preserveNullAndEmptyArrays: true } },
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
        { $sort: { nombre: 1 } },
        {
          $addFields: {
            diff: {
              $dateDiff: {
                startDate: '$apertura',
                endDate: '$cierre',
                unit: 'hour',
              }
            }
          }
        }
      ]
    })
    const cobros = await agreggateCollectionsSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            $and: [
              { cierreCajaId: { $exists: false } },
              { isCobro: true }
            ]
          }
        },
        { $project: { pago: 1, documentoId: 1, caja: 1 } },
        {
          $group: {
            _id: { documento: '$documentoId', cajaId: '$caja' },
            pago: {
              $sum: '$pago'
            }
          }
        },
        {
          $lookup: {
            from: documentosFiscalesCol,
            localField: '_id.documento',
            foreignField: '_id',
            pipeline: [
              { $project: { tipoDocumento: 1, cajaId: 1 } }
            ],
            as: 'documentos'
          }
        },
        { $unwind: { path: '$documentos', preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: { $ifNull: ['$_id.cajaId', '$documentos.cajaId'] },
            cobro: {
              $sum: {
                $cond: {
                  if: { $in: ['$documentos.tipoDocumento', ['Nota de crédito', 'Devolución']] },
                  then: { $multiply: ['$pago', -1] },
                  else: '$pago'
                }
              }
            }
          }
        }
      ]
    })
    const cajasData = cajas
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
    const queryDocs = { cajaId: new ObjectId(cajaId) }
    const lastCierre = await agreggateCollectionsSD({
      nameCollection: 'cierrescaja',
      enviromentClienteId: clienteId,
      pipeline: [
        { $sort: { fecha: -1 } },
        { $limit: 1 }
      ]
    })
    if (lastCierre[0]?.fecha) {
      queryDocs.fechaUltimoPago = { $gte: momentDate(undefined, lastCierre[0]?.fecha).toDate() }
    }
    const documentosFiscalesCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })
    const transaccionesCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'transacciones' })
    const ventas = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: queryDocs },
        {
          $group: {
            _id: {
              tipoDocumento: '$tipoDocumento',
              isFiscal: {
                $cond: {
                  if: { $ne: ['$numeroControl', ''] },
                  then: true,
                  else: false
                }
              }
            },
            monto: {
              $sum: '$totalPagado'
            },
          }
        },
        {
          $group: {
            _id: '$_id.isFiscal',
            documentos: {
              $push: {
                tipoDocumento: '$_id.tipoDocumento',
                monto: '$monto'
              }
            },
            totalVenta: {
              $sum: {
                $cond: {
                  if: { $in: ['$_id.tipoDocumento', ['Nota de crédito', 'Devolución']] },
                  then: { $multiply: ['$monto', -1] },
                  else: '$monto'
                }
              }
            },
          }
        }
      ]
    })
    const cajeros = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: queryDocs },
        {
          $group: {
            _id: '$creadoPorNombre'
          }
        }
      ]
    })
    const creditos = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            ...queryDocs,
            totalCredito: { $ne: 0 }
          }
        },
        {
          $project: {
            _id: 1,
            totalCredito: 1,
            tipoDocumento: 1
          }
        },
        {
          $lookup: {
            from: transaccionesCol,
            localField: '_id',
            foreignField: 'documentoId',
            pipeline: [
              { $match: { cierreCajaId: { $exists: false } } },
              { $match: { $or: [{ caja: null }, { caja: new ObjectId(cajaId) }] } },
              { $project: { pago: 1 } }
            ],
            as: 'transacciones'
          }
        },
        { $unwind: { path: '$transacciones', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$_id',
            totalCredito: {
              $first: {
                $cond: {
                  if: { $in: ['$tipoDocumento', ['Nota de crédito', 'Devolución']] },
                  then: { $multiply: ['$totalCredito', -1] },
                  else: '$totalCredito'
                }
              }
            }
          }
        },
        {
          $group: {
            _id: 0,
            totalCredito: {
              $sum: '$totalCredito'
            }
          }
        }
      ]
    })
    const cobros = await agreggateCollectionsSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            $and: [
              { cierreCajaId: { $exists: false } },
              { isCobro: true },
              {
                $or: [
                  { caja: null },
                  { caja: new ObjectId(cajaId) }
                ]
              }
            ]
          }
        },
        { $project: { pago: 1, documentoId: 1, caja: 1 } },
        {
          $group: {
            _id: { documento: '$documentoId', cajaId: '$caja' },
            pago: {
              $sum: '$pago'
            }
          }
        },
        {
          $lookup: {
            from: documentosFiscalesCol,
            localField: '_id.documento',
            foreignField: '_id',
            pipeline: [
              { $project: { tipoDocumento: 1, cajaId: 1 } }
            ],
            as: 'documentos'
          }
        },
        { $unwind: { path: '$documentos', preserveNullAndEmptyArrays: false } },
        {
          $match: {
            $expr: {
              $eq: [{ $ifNull: ['$_id.cajaId', '$documentos.cajaId'] }, new ObjectId(cajaId)]
            }
          }
        },
        {
          $group: {
            _id: 0,
            pago: {
              $sum: {
                $cond: {
                  if: { $in: ['$documentos.tipoDocumento', ['Nota de crédito', 'Devolución']] },
                  then: { $multiply: ['$pago', -1] },
                  else: '$pago'
                }
              }
            }
          }
        }
      ]
    })
    const efectivo = await agreggateCollectionsSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            cierreCajaId: { $exists: false },
            caja: { $eq: new ObjectId(cajaId) },
            banco: { $eq: null }
          }
        },
        {
          $group: {
            _id: {
              documentoId: '$documentoId',
              monedaSecundaria: '$monedaSecundaria'
            },
            pago: {
              $sum: '$pago'
            },
            pagoSecundario: {
              $sum: '$pagoSecundario'
            }
          }
        },
        {
          $lookup: {
            from: documentosFiscalesCol,
            localField: '_id.documentoId',
            foreignField: '_id',
            pipeline: [
              { $project: { tipoDocumento: 1 } }
            ],
            as: 'documentos'
          }
        },
        { $unwind: { path: '$documentos', preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: '$_id.monedaSecundaria',
            pago: {
              $sum: {
                $cond: {
                  if: { $in: ['$documentos.tipoDocumento', ['Nota de crédito', 'Devolución']] },
                  then: { $multiply: ['$pago', -1] },
                  else: '$pago'
                }
              }
            },
            pagoSecundario: {
              $sum: {
                $cond: {
                  if: { $in: ['$documentos.tipoDocumento', ['Nota de crédito', 'Devolución']] },
                  then: { $multiply: ['$pagoSecundario', -1] },
                  else: '$pagoSecundario'
                }
              }
            }
          }
        },
        {
          $project: {
            pago: { $round: ['$pago', 2] },
            pagoSecundario: { $round: ['$pagoSecundario', 2] }
          }
        }
      ]
    })
    const banco = await agreggateCollectionsSD({
      nameCollection: 'documentosFiscales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: queryDocs },
        {
          $lookup: {
            from: transaccionesCol,
            localField: '_id',
            foreignField: 'documentoId',
            pipeline: [
              { $match: { cierreCajaId: { $exists: false } } },
              { $match: { $expr: { $eq: [{ $type: '$banco' }, 'objectId'] } } },
              {
                $group: {
                  _id: {
                    monedaSecundaria: '$monedaSecundaria',
                    banco: '$banco'
                  },
                  pago: {
                    $sum: '$pago'
                  },
                  pagoSecundario: {
                    $sum: '$pagoSecundario'
                  }
                }
              }
            ],
            as: 'transacciones'
          }
        },
        { $unwind: { path: '$transacciones', preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: {
              monedaSecundaria: '$transacciones._id.monedaSecundaria',
              banco: '$transacciones._id.banco'
            },
            pago: {
              $sum: {
                $cond: {
                  if: { $in: ['$tipoDocumento', ['Nota de crédito', 'Devolución']] },
                  then: { $multiply: ['$transacciones.pago', -1] },
                  else: '$transacciones.pago'
                }
              }
            },
            pagoSecundario: {
              $sum: {
                $cond: {
                  if: { $in: ['$tipoDocumento', ['Nota de crédito', 'Devolución']] },
                  then: { $multiply: ['$transacciones.pagoSecundario', -1] },
                  else: '$transacciones.pagoSecundario'
                }
              }
            }
          }
        }
      ]
    })
    return res.status(200).json({
      ventas,
      creditos: creditos[0]?.totalCredito || 0,
      cobros: cobros[0]?.pago || 0,
      efectivo,
      banco,
      cajeros
    })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener datos de las sucursales' + e.message })
  }
}

export const saveCorte = async (req, res) => {
  const {
    clienteId,
    cajaId,
    sucursalId,
    corte,
    apertura,
    cierre,
    horasTrabajadas,
    monedaPrincipal,
    efectivos,
    ventaManual,
    ventaZ,
    ventaByBanco,
    totalBanco,
    totalEfectivo,
    totalVenta,
    resumen
  } = req.body
  try {
    await createItemSD({
      nameCollection: 'cierrescaja',
      enviromentClienteId: clienteId,
      item: {
        cajaId: cajaId ? new ObjectId(cajaId): null,
        sucursalId: sucursalId ? new ObjectId(sucursalId): null,
        corte,
        apertura: apertura ? moment(apertura).toDate() : null,
        cierre: cierre ? moment(cierre).toDate() : null,
        horasTrabajadas: horasTrabajadas ? Number(horasTrabajadas) : 0,
        monedaPrincipal,
        efectivos,
        ventaManual,
        ventaZ,
        ventaByBanco,
        totalBanco,
        totalEfectivo,
        totalVenta,
        resumen
      }
    })
    const lastCierre = await agreggateCollectionsSD({
      nameCollection: 'cierrescaja',
      enviromentClienteId: clienteId,
      pipeline: [
        { $sort: { fecha: -1 } },
        { $limit: 1 }
      ]
    })
  } catch(e) {
    console.log(`Error de servidor al momento de realizar el cierre de la caja ${caja?._id || 'Sin caja'}`, e)
    return res.status(500).json({ error: `Error de servidor al momento de realizar el cierre de la caja ${caja?.nombre || 'Sin nombre'}: ${e.message}` })
  }
}
