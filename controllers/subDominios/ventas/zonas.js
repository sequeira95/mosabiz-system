import { ObjectId } from 'mongodb'
import moment from 'moment'
import { agreggateCollectionsSD, bulkWriteSD, deleteItemSD, deleteManyItemsSD, createItemSD, updateItemSD, formatCollectionName, getCollectionSD, getItemSD, updateManyItemSD } from '../../../utils/dataBaseConfing.js'
import { subDominioName } from '../../../constants.js'

export const getZonas = async (req, res) => {
  const { clienteId } = req.body
  try {
    const categoriaZonaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorZona' })
    const cuentasColName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
    const zonas = await agreggateCollectionsSD({
      nameCollection: 'ventaszonas',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $lookup: {
            from: cuentasColName,
            localField: 'cuentaId',
            foreignField: '_id',
            as: 'cuentaData'
          }
        },
        {
          $lookup: {
            from: categoriaZonaCollection,
            localField: '_id',
            foreignField: 'zonaId',
            as: 'detallesCategoriaPorZona'
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
  const { _id, clienteId, nombre, cuentaId, observacion } = req.body
  try {
    const cuentasColName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
    const [verify] = await agreggateCollectionsSD({
      nameCollection: 'ventaszonas',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: [{ $toLower: '$nombre' }, nombre.toLowerCase()] }
              ]
            }
          }
        }
      ]
    })
    if ((_id && verify && String(verify._id) !== _id) || (verify && !_id)) return res.status(400).json({ error: 'Ya existe una zona con este nombre' })
    let zona
    if (_id) {
      zona = await updateItemSD({
        nameCollection: 'ventaszonas',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            nombre,
            observacion,
            cuentaId: new ObjectId(cuentaId)
          }
        }
      })
      zona = await agreggateCollectionsSD({
        nameCollection: 'ventaszonas',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { _id: zona._id } },
          {
            $lookup: {
              from: cuentasColName,
              localField: 'cuentaId',
              foreignField: '_id',
              as: 'cuentaData'
            }
          },
          { $unwind: '$cuentaData' },
          {
            $addFields: {
              cuenta: '$cuentaData.codigo'
            }
          }
        ]
      })
    } else {
      const newSucursal = await createItemSD({
        nameCollection: 'ventaszonas',
        enviromentClienteId: clienteId,
        item: {
          nombre,
          observacion,
          cuentaId: cuentaId && new ObjectId(cuentaId)
        }
      })
      zona = await agreggateCollectionsSD({
        nameCollection: 'ventaszonas',
        enviromentClienteId: clienteId,
        pipeline: [
          { $match: { _id: newSucursal.insertedId } },
          {
            $lookup: {
              from: cuentasColName,
              localField: 'cuentaId',
              foreignField: '_id',
              as: 'cuentaData'
            }
          },
          { $unwind: { path: '$cuentaData', preserveNullAndEmptyArrays: true } },
          {
            $addFields: {
              cuenta: '$cuentaData.codigo'
            }
          }
        ]
      })
    }
    return res.status(200).json({ status: 'Zona guardada exitosamente', zona: zona[0] })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la zona' + e.message })
  }
}

export const saveZonasToArray = async (req, res) => {
  const { clienteId, zonas } = req.body
  try {
    const zonasData = await agreggateCollectionsSD({
      nameCollection: 'ventaszonas',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $project: {
            nombre: { $toLower: '$nombre' }
          }
        }
      ]
    })
    const zonasIndex = zonasData.reduce((acc, el) => {
      acc[el.nombre] = el._id
      return acc
    }, {})
    if (!zonas[0]) return res.status(400).json({ error: 'Hubo un error al momento de procesar la lista de zonas' })
    const bulkWrite = zonas.map(e => {
      const filters = {}
      let update = {
        observacion: e.observacion
      }
      const zonaId = zonasIndex[e.nombre.toLowerCase()]
      if (zonaId) {
        filters._id = zonaId
      } else {
        filters.nombre = e.nombre
        update = {
          nombre: e.nombre,
          observacion: e.observacion,
          fechaCreacion: moment().toDate()
        }
      }
      return {
        updateOne: {
          filter: filters,
          update: {
            $set: update
          },
          upsert: true
        }
      }
    })
    await bulkWriteSD({ nameCollection: 'ventaszonas', enviromentClienteId: clienteId, pipeline: bulkWrite })
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
      nameCollection: 'ventaszonas',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) }
    })
    deleteManyItemsSD({ nameCollection: 'zonasPorSucursales', enviromentClienteId: clienteId, filters: { zonaId: new ObjectId(_id) } })
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
                $project: {
                  cuentaId: '$detalleCuenta.cuentaId',
                  cuenta: '$detalleCuenta.codigo',
                  descripcion: '$detalleCuenta.descripcion'
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
            cuentaId: '$detalleZona.cuentaId'
          }
        }
      ]
    })
    const [cuentasUsadas] = await agreggateCollectionsSD({
      nameCollection: 'categoriaPorZona',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo } },
        {
          $group: {
            _id: 0,
            cuentaId: {
              $push: { cuenta: '$cuentaId', categoria: '$categoriaId', zona: '$zonaId', tipo: 'cuentaId' }
            }
          }
        }
      ]
    })
    const cuentas = cuentasUsadas?.cuentaId || []
    const cuentasObject = {}
    cuentas.forEach(e => { if (e.cuenta) cuentasObject[e.cuenta] = e })
    return res.status(200).json({ list: listCategorias, cuentas: cuentasObject })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la lista de categorías por zonas ' + e.message })
  }
}

export const saveCategoriasPorZonas = async (req, res) => {
  const { clienteId, tipo, categoriasPorZona, zonaId } = req.body
  try {
    await saveCategoriasPorZona({ clienteId, tipo, categoriasPorZona, zonaId })
    return res.status(200).json({ status: 'Categorias guardadas exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar las categoria por zona ' + e.message })
  }
}
const saveCategoriasPorZona = async ({ clienteId, tipo, categoriasPorZona, zonaId }) => {
  const bulkWrite = []
  try {
    for (const categoriaZona of categoriasPorZona) {
      bulkWrite.push({
        updateOne: {
          filter: { categoriaId: new ObjectId(categoriaZona.categoriaId), zonaId: new ObjectId(zonaId) },
          update: {
            $set: {
              cuentaId: categoriaZona.cuentaId ? new ObjectId(categoriaZona.cuentaId) : null,
              tipo
            }
          },
          upsert: true
        }
      })
    }
    if (bulkWrite[0]) await bulkWriteSD({ nameCollection: 'categoriaPorZona', enviromentClienteId: clienteId, pipeline: bulkWrite })
  } catch (e) {
    console.log(e)
    throw e
  }
}
