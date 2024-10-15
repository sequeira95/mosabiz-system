import { ObjectId } from 'mongodb'
import { agreggateCollections, agreggateCollectionsSD, createItem, createItemSD, createManyItemsSD, formatCollectionName, getItem, getItemSD, updateItemSD, updateManyItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { subDominioName } from '../../../constants.js'
import { hasContabilidad } from '../../../utils/hasContabilidad.js'
import { getOrCreateComprobante, createMovimientos } from '../../../utils/contabilidad.js'

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
            supervisorId: '$supervisorData._id',
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
            _id: '$creadoPor',
            nombre: {
              $first: '$creadoPorNombre'
            }
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
    caja,
    sucursal,
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
    observacion,
    supervisor,
    supervisorId,
    cajeros,
    fecha,
    resumen,
    montoCalculoEfectivo,
    montoRealEfectivo,
    montoNeto
  } = req.body
  try {
    if (!cajaId) throw new Error('Debe seleccionar una caja')
    if (!sucursalId) throw new Error('Debe seleccionar una sucursal')
    let contador = (await getItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: `cierres-caja-${cajaId}` } }))?.contador
    if (contador) ++contador
    if (!contador) contador = 1

    // crea el cierre de caja
    const cierreCaja = await createItemSD({
      nameCollection: 'cierrescaja',
      enviromentClienteId: clienteId,
      item: {
        numero: contador,
        cajaId: cajaId ? new ObjectId(cajaId) : null,
        sucursalId: sucursalId ? new ObjectId(sucursalId) : null,
        apertura: apertura ? momentDate(undefined, apertura).toDate() : null,
        cierre: cierre ? momentDate(undefined, cierre).toDate() : null,
        horasTrabajadas: horasTrabajadas ? Number(horasTrabajadas) : 0,
        supervisorId: supervisorId ? new ObjectId(supervisorId) : null,
        supervisor,
        cajeros: Array.isArray(cajeros) ? cajeros.map(e => ({ _id: new ObjectId(e._id), nombre: e.nombre })) : cajeros,
        monedaPrincipal,
        efectivos,
        ventaManual,
        ventaZ,
        ventaByBanco,
        totalBanco,
        totalEfectivo,
        totalVenta,
        resumen,
        sucursal,
        caja,
        observacion,
        fecha: momentDate(undefined, fecha).toDate(),
        montoNeto: montoNeto ? Number(montoNeto) : 0,
        montoCalculoEfectivo: montoCalculoEfectivo ? Number(montoCalculoEfectivo) : 0,
        montoRealEfectivo: montoRealEfectivo ? Number(montoRealEfectivo) : 0,
      }
    })
    await upsertItemSD({ nameCollection: 'contadores', enviromentClienteId: clienteId, filters: { tipo: `cierres-caja-${cajaId}` }, update: { $set: { contador } } })

    // actualiza las transacciones de la caja
    await updateManyItemSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
      filters: {
        cierreCajaId: { $exists: false },
        caja: { $eq: new ObjectId(cajaId) },
        banco: { $eq: null }
      },
      update: {
        $set: { cierreCajaId: cierreCaja.insertedId }
      }
    })
    // actualiza las transacciones de la caja que son cobros
    const documentosFiscalesCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'documentosFiscales' })

    const cobros = await agreggateCollectionsSD({
      nameCollection: 'transacciones',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            $and: [
              { cierreCajaId: { $exists: false } },
              { isCobro: true },
              { caja: null },
            ]
          }
        },
        { $project: { _id: 1, pago: 1, documentoId: 1, caja: 1 } },
        {
          $lookup: {
            from: documentosFiscalesCol,
            localField: 'documentoId',
            foreignField: '_id',
            pipeline: [
              { $match: { cajaId: new ObjectId(cajaId) } },
              { $project: { cajaId: 1 } }
            ],
            as: 'documentos'
          }
        },
        { $unwind: { path: '$documentos', preserveNullAndEmptyArrays: false } },
        {
          $group: {
            _id: 0,
            transaccionesId: {
              $addToSet: '$_id'
            }
          }
        }
      ]
    })
    if (cobros[0]?.transaccionesId) {
      await updateManyItemSD({
        nameCollection: 'transacciones',
        enviromentClienteId: clienteId,
        filters: { _id: { $in: cobros[0]?.transaccionesId } },
        update: {
          $set: { cierreCajaId: cierreCaja.insertedId }
        }
      })
    }
    const tieneContabilidad = await hasContabilidad({ clienteId })
    if (!tieneContabilidad) return res.status(200).json({ status: 'Cierre exitoso' })
    const ajustesSistema = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })
    const ajustesVentas = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'ventas' } })
    const mesPeriodo = momentDate(ajustesSistema.timeZone, fecha).format('YYYY/MM')
    if (!ajustesVentas.cuentaDiferenciasCajas) {
      throw new Error('Cierre realizado con exito pero fallo la creacion del comprobante en contabilidad: No existe cuenta de diferencias en caja')
    }
    let comprobante
    try {
      comprobante = await getOrCreateComprobante(clienteId,
        {
          mesPeriodo,
          codigo: ajustesVentas.codigoComprobanteFacturacion
        }, {
          nombre: 'Ventas'
        },
        true
      )
    } catch (e) {
      console.log('error al crear comprobante en el cierre de caja', e)
    }
    if (!comprobante) throw new Error('Cierre realizado con exito pero fallo la creacion del comprobante en contabilidad')
    const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })

    const [cuentaCaja] = await agreggateCollectionsSD({
      nameCollection: 'ventascajas',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { _id: new ObjectId(cajaId) } },
        {
          $lookup: {
            from: planCuentaCollection,
            localField: 'cuentaId',
            foreignField: '_id',
            as: 'detalleCuenta'
          }
        },
        { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: false } },
        {
          $project: {
            nombre: '$nombre',
            descripcion: '$descripcion',
            tipo: '$tipo',
            cuentaId: '$cuentaId',
            cuentaCodigo: '$detalleCuenta.codigo',
            cuentaNombre: '$detalleCuenta.descripcion'
          }
        }
      ]
    })
    if (!cuentaCaja) {
      throw new Error(`Cierre realizado con exito pero fallo
      la creacion del movimiento contable: 
      La caja no tiene una cuenta contable asignada
      `)
    }
    const sucursalData = await getItemSD({
      nameCollection: 'ventassucursales',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(sucursalId) }
    })
    const [cuentaCajaPrincipalNacional] = await agreggateCollectionsSD({
      nameCollection: 'bancos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { _id: sucursalData.cajaNacionalId } },
        {
          $lookup: {
            from: planCuentaCollection,
            localField: 'cuentaId',
            foreignField: '_id',
            as: 'detalleCuenta'
          }
        },
        { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: false } },
        {
          $project: {
            nombre: '$nombre',
            descripcion: '$descripcion',
            tipo: '$tipo',
            cuentaId: '$cuentaId',
            cuentaCodigo: '$detalleCuenta.codigo',
            cuentaNombre: '$detalleCuenta.descripcion'
          }
        }
      ]
    })
    if (!cuentaCajaPrincipalNacional) {
      throw new Error(`Cierre realizado con exito pero fallo
      la creacion del movimiento contable: 
      La caja no tiene una cuenta contable asignada
      `)
    }
    const [cuentaCajaPrincipalDivisas] = await agreggateCollectionsSD({
      nameCollection: 'bancos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { _id: sucursalData.cajaDivisasId } },
        {
          $lookup: {
            from: planCuentaCollection,
            localField: 'cuentaId',
            foreignField: '_id',
            as: 'detalleCuenta'
          }
        },
        { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: false } },
        {
          $project: {
            nombre: '$nombre',
            descripcion: '$descripcion',
            tipo: '$tipo',
            cuentaId: '$cuentaId',
            cuentaCodigo: '$detalleCuenta.codigo',
            cuentaNombre: '$detalleCuenta.descripcion'
          }
        }
      ]
    })
    if (!cuentaCajaPrincipalDivisas) {
      throw new Error(`Cierre realizado con exito pero fallo
      la creacion del movimiento contable: 
      La caja no tiene una cuenta contable asignada
      `)
    }
    const movimientoDefault = {
      comprobanteId: comprobante._id,
      periodoId: comprobante.periodoId,
      descripcion: `Cierre caja N° ${contador} ${cuentaCaja.nombre}`,
      fecha: momentDate(ajustesSistema.timeZone, fecha).toDate(),
      fechaCreacion: momentDate().toDate(),
      docReferenciaAux: `Cierre caja N° ${contador} ${cuentaCaja.nombre}`,
      documento: {
        docReferencia: `Cierre caja N° ${contador} ${cuentaCaja.nombre}`,
        docFecha: momentDate(ajustesSistema.timeZone, fecha).toDate()
      },
      debe: 0,
      haber: 0
    }
    // fecha creacion movimientos
    const fechaCreacion = momentDate()
    let addSeconds = 1
    // movimientos contables
    let movimientos = []
    // transacciones hacia la caja principal
    const transacciones = []
    // agregar movimiento de la caja
    movimientos.push({
      ...movimientoDefault,
      cuentaId: cuentaCaja.cuentaId,
      cuentaCodigo: cuentaCaja.cuentaCodigo,
      cuentaNombre: cuentaCaja.cuentaNombre,
      haber: montoCalculoEfectivo > 0 ? montoCalculoEfectivo : 0,
      debe: montoCalculoEfectivo < 0 ? Math.abs(montoCalculoEfectivo) : 0
    })
    // agregar movimientos de la caja principal
    const montoMonedaPrincipal = Number((resumen.dataMonedaPrincipal?.montoShow || 0).toFixed(2))
    // agregar transaccion moneda principal
    transacciones.push({
      clienteId: new ObjectId(clienteId),
      cierreCajaId: cierreCaja.insertedId,
      metodo: 'caja', // caja, banco
      pago: montoMonedaPrincipal,
      pagoSecundario: montoMonedaPrincipal,
      fechaPago: momentDate(undefined, fecha).toDate(),
      caja: cuentaCajaPrincipalNacional._id,
      porcentajeIgtf: 0,
      pagoIgtf: 0,
      moneda: ajustesSistema.monedaPrincipal,
      monedaSecundaria: ajustesSistema.monedaPrincipal,
      tasa: 1,
      tipo: 'cierre',
      creadoPor: new ObjectId(req.uid),
      fechaCreacion: momentDate().toDate()
    })
    let montoMonedaDivisas = 0
    let diferenciaMontos = montoCalculoEfectivo - Number((resumen.dataMonedaPrincipal?.montoShow || 0).toFixed(2))
    for (const dataByMoneda of resumen.dataDivisas) {
      montoMonedaDivisas += Number((dataByMoneda?.montoShow || 0).toFixed(2))
      diferenciaMontos -= Number((dataByMoneda?.montoShow || 0).toFixed(2))
      transacciones.push({
        cierreCajaId: cierreCaja.insertedId,
        clienteId: new ObjectId(clienteId),
        metodo: 'caja', // caja, banco
        pago: Number((dataByMoneda?.montoShow || 0).toFixed(2)),
        pagoSecundario: Number((dataByMoneda?.totalReal || 0).toFixed(2)),
        fechaPago: momentDate(undefined, fecha).toDate(),
        caja: cuentaCajaPrincipalNacional._id,
        porcentajeIgtf: 0,
        pagoIgtf: 0,
        moneda: ajustesSistema.monedaPrincipal,
        monedaSecundaria: dataByMoneda.monedaSecundaria,
        tasa: dataByMoneda.tasa,
        tipo: 'cierre',
        creadoPor: new ObjectId(req.uid),
        fechaCreacion: momentDate().toDate()
      })
    }
    movimientos.push({
      ...movimientoDefault,
      cuentaId: cuentaCajaPrincipalNacional.cuentaId,
      cuentaCodigo: cuentaCajaPrincipalNacional.cuentaCodigo,
      cuentaNombre: cuentaCajaPrincipalNacional.cuentaNombre,
      debe: montoMonedaPrincipal > 0 ? montoMonedaPrincipal : 0,
      haber: montoMonedaPrincipal < 0 ? Math.abs(montoMonedaPrincipal) : 0
    })
    if (resumen.dataDivisas.length > 0) {
      movimientos.push({
        ...movimientoDefault,
        cuentaId: cuentaCajaPrincipalDivisas.cuentaId,
        cuentaCodigo: cuentaCajaPrincipalDivisas.cuentaCodigo,
        cuentaNombre: cuentaCajaPrincipalDivisas.cuentaNombre,
        debe: montoMonedaDivisas > 0 ? montoMonedaDivisas : 0,
        haber: montoMonedaDivisas < 0 ? Math.abs(montoMonedaDivisas) : 0
      })
    }
    const cuentaDifCajas = await getItemSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      filters: {
        _id: ajustesVentas.cuentaDiferenciasCajas
      }
    })
    if (diferenciaMontos > 0) {
      movimientos.push({
        ...movimientoDefault,
        cuentaId: cuentaDifCajas._id,
        cuentaCodigo: cuentaDifCajas.codigo,
        cuentaNombre: cuentaDifCajas.descripcion,
        debe: diferenciaMontos || 0
      })
    } else if (diferenciaMontos < 0) {
      movimientos.push({
        ...movimientoDefault,
        cuentaId: cuentaDifCajas._id,
        cuentaCodigo: cuentaDifCajas.codigo,
        cuentaNombre: cuentaDifCajas.descripcion,
        haber: Math.abs(diferenciaMontos) || 0
      })
    }
    movimientos = movimientos.sort((a, b) => b.debe > 0 ? 1 : -1).map(e => {
      addSeconds += 2
      return {
        ...e,
        fechaCreacion: momentDate(undefined, fechaCreacion).add(addSeconds, 'milliseconds').toDate()
      }
    })

    // crear transaccion
    if (transacciones && transacciones[0]) {
      createManyItemsSD({
        nameCollection: 'transacciones',
        enviromentClienteId: clienteId,
        items: transacciones
      })
    }
    // crear movimientos de contabilidad
    if (transacciones && transacciones[0]) {
      await createMovimientos({
        clienteId,
        movimientos
      })
    }
    return res.status(200).json({ status: 'Cierre exitoso' })
  } catch (e) {
    console.log(`Error de servidor al momento de realizar el cierre de la caja ${caja || 'Sin caja'}`, e)
    return res.status(500).json({ error: `Error de servidor al momento de realizar el cierre de la caja ${caja?.nombre || 'Sin nombre'}: ${e.message}` })
  }
}
