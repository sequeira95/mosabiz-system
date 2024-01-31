import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, deleteItemSD, deleteManyItemsSD, formatCollectionName, getCollectionSD, getItemSD, updateManyItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment'
import { subDominioName } from '../../constants.js'

export const getZonas = async (req, res) => {
  const { clienteId, tipo } = req.body
  try {
    const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
    const activosFijosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'activosFijos' })
    const categoriaZonaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorZona' })
    const zonas = await agreggateCollectionsSD({
      nameCollection: 'zonas',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo } },
        {
          $lookup: {
            from: activosFijosCollection,
            localField: '_id',
            foreignField: 'zona',
            as: 'detalleActivoFijo'
          }
        },
        {
          $lookup: {
            from: planCuentaCollection,
            localField: 'cuentaId',
            foreignField: '_id',
            pipeline: [
              { $project: { descripcion: 1, codigo: 1 } }
            ],
            as: 'detalleCuenta'
          }
        },
        { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: categoriaZonaCollection,
            localField: '_id',
            foreignField: 'zonaId',
            as: 'detallesCategoriaPorZona'
          }
        },
        {
          $project: {
            nombre: 1,
            observacion: 1,
            cuentaId: 1,
            detalleCuenta: 1,
            hasActivo: { $size: '$detalleActivoFijo' },
            detallesCategoriaPorZona: '$detallesCategoriaPorZona'
          }
        }
      ]
    })
    return res.status(200).json({ zonas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las zonas ' + e.message })
  }
}
export const saveZonas = async (req, res) => {
  const { _id, clienteId, nombre, observacion, tipo, fechaCreacion, cuentaId } = req.body
  try {
    if (!_id) {
      const verify = await getItemSD({
        nameCollection: 'zonas',
        enviromentClienteId: clienteId,
        filters: {
          tipo,
          nombre
        }
      })
      if (verify) return res.status(400).json({ error: 'Ya existe una zona con este nombre' })
    }
    const zona = await upsertItemSD({
      nameCollection: 'zonas',
      enviromentClienteId: clienteId,
      filters: { tipo, _id: new ObjectId(_id) },
      update: {
        $set: {
          nombre,
          observacion,
          cuentaId: cuentaId ? new ObjectId(cuentaId) : null,
          fechaCreacion: fechaCreacion ? moment(fechaCreacion).toDate() : moment().toDate()
        }
      }
    })
    return res.status(200).json({ status: 'Zona guardada exitosamente', zona })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la zona' + e.message })
  }
}
export const saveZonasToArray = async (req, res) => {
  const { clienteId, zonas, tipo } = req.body
  console.log(req.body)
  try {
    if (!zonas[0]) return res.status(400).json({ error: 'Hubo un error al momento de procesar la lista de zonas' })
    const bulkWrite = zonas.map(e => {
      return {
        updateOne: {
          filter: { nombre: e.nombre, tipo },
          update: {
            $set: {
              nombre: e.nombre,
              observacion: e.observacion,
              fechaCreacion: moment().toDate(),
              tipo
            }
          },
          upsert: true
        }
      }
    })
    await bulkWriteSD({ nameCollection: 'zonas', enviromentClienteId: clienteId, pipeline: bulkWrite })
    return res.status(200).json({ status: 'Zonas guardadas exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar las zonas' + e.message })
  }
}
export const deleteZonas = async (req, res) => {
  const { _id, clienteId } = req.body
  try {
    await deleteItemSD({
      nameCollection: 'zonas',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) }
    })
    deleteManyItemsSD({ nameCollection: 'categoriaPorZona', enviromentClienteId: clienteId, filters: { zonaId: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Zona eliminada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar la zona' + e.message })
  }
}
export const listCategoriasPorZonas = async (req, res) => {
  const { clienteId, zonaId, tipo } = req.body
  try {
    const categoriaZonaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorZona' })
    const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
    const listCategorias = await agreggateCollectionsSD({
      nameCollection: 'categorias',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo } },
        {
          $lookup: {
            from: categoriaZonaCollection,
            localField: '_id',
            foreignField: 'categoriaId',
            pipeline: [
              {
                $match: {
                  zonaId: new ObjectId(zonaId)
                }
              },
              {
                $lookup: {
                  from: planCuentaCollection,
                  localField: 'cuentaId',
                  foreignField: '_id',
                  pipeline: [
                    {
                      $project: {
                        cuentaId: '$_id',
                        codigo: '$codigo',
                        descripcion: '$descripcion'
                      }
                    }
                  ],
                  as: 'detalleCuenta'
                }
              },
              { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: true } },
              {
                $lookup: {
                  from: planCuentaCollection,
                  localField: 'cuentaDepreciacionAcumulada',
                  foreignField: '_id',
                  pipeline: [
                    {
                      $project: {
                        cuentaId: '$_id',
                        codigo: '$codigo',
                        descripcion: '$descripcion'
                      }
                    }
                  ],
                  as: 'detalleCuentaDepreciacionAcumulada'
                }
              },
              { $unwind: { path: '$detalleCuentaDepreciacionAcumulada', preserveNullAndEmptyArrays: true } },
              {
                $lookup: {
                  from: planCuentaCollection,
                  localField: 'cuentaGastosDepreciacion',
                  foreignField: '_id',
                  pipeline: [
                    {
                      $project: {
                        cuentaId: '$_id',
                        codigo: '$codigo',
                        descripcion: '$descripcion'
                      }
                    }
                  ],
                  as: 'detalleCuentaGastosDepreciacion'
                }
              },
              { $unwind: { path: '$detalleCuentaGastosDepreciacion', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  cuentaId: '$detalleCuenta.cuentaId',
                  cuenta: '$detalleCuenta.codigo',
                  descripcion: '$detalleCuenta.descripcion',
                  cuentaDepreciacionAcumuladaId: '$detalleCuentaDepreciacionAcumulada.cuentaId',
                  cuentaDepreciacionAcumulada: '$detalleCuentaDepreciacionAcumulada.codigo',
                  cuentaGastosDepreciacionId: '$detalleCuentaGastosDepreciacion.cuentaId',
                  cuentaGastosDepreciacion: '$detalleCuentaGastosDepreciacion.codigo'
                }
              }
            ],
            as: 'detalleZona'
          }
        },
        { $unwind: { path: '$detalleZona', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            categoriaId: '$_id',
            categoria: '$nombre',
            cuentaCodigo: '$detalleZona.cuenta',
            cuentaId: '$detalleZona.cuentaId',
            cuentaDepreciacionAcumuladaId: '$detalleZona.cuentaDepreciacionAcumuladaId',
            cuentaDepreciacionAcumulada: '$detalleZona.cuentaDepreciacionAcumulada',
            cuentaGastosDepreciacionId: '$detalleZona.cuentaGastosDepreciacionId',
            cuentaGastosDepreciacion: '$detalleZona.cuentaGastosDepreciacion'
            // detalle: '$detalleZona'
          }
        }
      ]
    })
    return res.status(200).json({ listCategorias })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la lista de categorías por zonas ' + e.message })
  }
}
export const saveCategoriasPorZonas = async (req, res) => {
  const { clienteId, tipo, categoriasPorZona, zonaId } = req.body
  console.log(categoriasPorZona)
  try {
    saveCategoriasPorZona({ clienteId, tipo, categoriasPorZona, zonaId })
    return res.status(200).json({ status: 'Categorias guardadas exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar las categoria por zona ' + e.message })
  }
}
const saveCategoriasPorZona = async ({ clienteId, tipo, categoriasPorZona, zonaId }) => {
  const bulkWrite = []
  const periodoActivos = (await getCollectionSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { activo: true } })).map(e => new ObjectId(e._id))
  try {
    for (const categoriaZona of categoriasPorZona) {
      const dataAnterior = await getItemSD({
        nameCollection: 'categoriaPorZona',
        enviromentClienteId: clienteId,
        filters: { categoriaId: new ObjectId(categoriaZona.categoriaId), zonaId: new ObjectId(zonaId) }
      })
      if (!dataAnterior) {
        console.log('No existe data anterior')
        bulkWrite.push({
          updateOne: {
            filter: { categoriaId: new ObjectId(categoriaZona.categoriaId), zonaId: new ObjectId(zonaId) },
            update: {
              $set: {
                cuentaId: categoriaZona.cuentaId ? new ObjectId(categoriaZona.cuentaId) : null,
                cuentaDepreciacionAcumulada: categoriaZona.cuentaDepreciacionAcumuladaId ? new ObjectId(categoriaZona.cuentaDepreciacionAcumuladaId) : null,
                cuentaGastosDepreciacion: categoriaZona.cuentaGastosDepreciacionId ? new ObjectId(categoriaZona.cuentaGastosDepreciacionId) : null,
                tipo
              }
            },
            upsert: true
          }
        })
        continue
      }
      if (dataAnterior.cuentaId && categoriaZona.cuentaId && dataAnterior.cuentaId.toJSON() !== categoriaZona.cuentaId) {
        console.log('entrando cuentaId primer if', dataAnterior.cuentaId.toJSON(), categoriaZona.cuentaId)
        const newCuenta = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(categoriaZona.cuentaId) }
        })
        bulkWrite.push({
          updateOne: {
            filter: { categoriaId: new ObjectId(categoriaZona.categoriaId), zonaId: new ObjectId(zonaId) },
            update: {
              $set: {
                cuentaId: new ObjectId(categoriaZona.cuentaId)
              }
            }
          }
        })
        updateManyItemSD({
          nameCollection: 'detallesComprobantes',
          enviromentClienteId: clienteId,
          filters: { cuentaId: dataAnterior.cuentaId, periodoId: { $in: periodoActivos } },
          update: {
            $set: {
              cuentaId: newCuenta._id,
              cuentaCodigo: newCuenta.codigo,
              cuentaNombre: newCuenta.descripcion
            }
          }
        })
      } else if (!dataAnterior.cuentaId && categoriaZona.cuentaId) {
        console.log('entrando cuentaId segundo if if', dataAnterior?.cuentaId, categoriaZona.cuentaId)
        bulkWrite.push({
          updateOne: {
            filter: { categoriaId: new ObjectId(categoriaZona.categoriaId), zonaId: new ObjectId(zonaId) },
            update: {
              $set: {
                cuentaId: new ObjectId(categoriaZona.cuentaId)
              }
            }
          }
        })
      }
      if (dataAnterior.cuentaDepreciacionAcumulada && categoriaZona.cuentaDepreciacionAcumuladaId && dataAnterior.cuentaDepreciacionAcumulada.toJSON() !== categoriaZona.cuentaDepreciacionAcumuladaId) {
        console.log('entrando cuentaDepreciacionAcumulada primer if', dataAnterior.cuentaDepreciacionAcumulada.toJSON(), categoriaZona.cuentaDepreciacionAcumuladaId)
        const newCuenta = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(categoriaZona.cuentaDepreciacionAcumuladaId) }
        })
        bulkWrite.push({
          updateOne: {
            filter: { categoriaId: new ObjectId(categoriaZona.categoriaId), zonaId: new ObjectId(zonaId) },
            update: {
              $set: {
                cuentaDepreciacionAcumulada: new ObjectId(categoriaZona.cuentaDepreciacionAcumuladaId)
              }
            }
          }
        })
        updateManyItemSD({
          nameCollection: 'detallesComprobantes',
          enviromentClienteId: clienteId,
          filters: { cuentaId: dataAnterior.cuentaDepreciacionAcumulada, periodoId: { $in: periodoActivos } },
          update: {
            $set: {
              cuentaId: newCuenta._id,
              cuentaCodigo: newCuenta.codigo,
              cuentaNombre: newCuenta.descripcion
            }
          }
        })
      } else if (!dataAnterior.cuentaDepreciacionAcumulada && categoriaZona.cuentaDepreciacionAcumuladaId) {
        console.log('entrando cuentaDepreciacionAcumulada segundo if if', dataAnterior?.cuentaDepreciacionAcumulada, categoriaZona.cuentaDepreciacionAcumuladaId)
        bulkWrite.push({
          updateOne: {
            filter: { categoriaId: new ObjectId(categoriaZona.categoriaId), zonaId: new ObjectId(zonaId) },
            update: {
              $set: {
                cuentaDepreciacionAcumulada: new ObjectId(categoriaZona.cuentaDepreciacionAcumuladaId)
              }
            }
          }
        })
      }
      if (dataAnterior.cuentaGastosDepreciacion && categoriaZona.cuentaGastosDepreciacionId && dataAnterior.cuentaGastosDepreciacion.toJSON() !== categoriaZona.cuentaGastosDepreciacionId) {
        console.log('entrando cuentaGastosDepreciacionId primer if', dataAnterior.cuentaGastosDepreciacion.toJSON(), categoriaZona.cuentaGastosDepreciacionId)
        const newCuenta = await getItemSD({
          nameCollection: 'planCuenta',
          enviromentClienteId: clienteId,
          filters: { _id: new ObjectId(categoriaZona.cuentaGastosDepreciacionId) }
        })
        bulkWrite.push({
          updateOne: {
            filter: { categoriaId: new ObjectId(categoriaZona.categoriaId), zonaId: new ObjectId(zonaId) },
            update: {
              $set: {
                cuentaGastosDepreciacion: new ObjectId(categoriaZona.cuentaGastosDepreciacionId)
              }
            }
          }
        })
        updateManyItemSD({
          nameCollection: 'detallesComprobantes',
          enviromentClienteId: clienteId,
          filters: { cuentaId: dataAnterior.cuentaGastosDepreciacion, periodoId: { $in: periodoActivos } },
          update: {
            $set: {
              cuentaId: newCuenta._id,
              cuentaCodigo: newCuenta.codigo,
              cuentaNombre: newCuenta.descripcion
            }
          }
        })
      } else if (!dataAnterior.cuentaGastosDepreciacion && categoriaZona.cuentaGastosDepreciacionId) {
        console.log('entrando cuentaGastosDepreciacion segundo if if', dataAnterior?.cuentaGastosDepreciacion, categoriaZona.cuentaGastosDepreciacionId)
        bulkWrite.push({
          updateOne: {
            filter: { categoriaId: new ObjectId(categoriaZona.categoriaId), zonaId: new ObjectId(zonaId) },
            update: {
              $set: {
                cuentaGastosDepreciacion: new ObjectId(categoriaZona.cuentaGastosDepreciacionId)
              }
            }
          }
        })
      }
    }
    if (bulkWrite[0]) await bulkWriteSD({ nameCollection: 'categoriaPorZona', enviromentClienteId: clienteId, pipeline: bulkWrite })
  } catch (e) {
    console.log(e)
    return e
  }
}
