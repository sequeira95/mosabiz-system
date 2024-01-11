import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, deleteItemSD, formatCollectionName, getCollectionSD, getItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment'
import { subDominioName } from '../../constants.js'

export const getZonas = async (req, res) => {
  const { clienteId, tipo } = req.body
  try {
    const zonas = await getCollectionSD({
      nameCollection: 'zonas',
      enviromentClienteId: clienteId,
      filters: { tipo }
    })
    return res.status(200).json({ zonas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las zonas ' + e.message })
  }
}
export const saveZonas = async (req, res) => {
  const { _id, clienteId, nombre, observacion, tipo, fechaCreacion } = req.body
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
            detalleZona: '$detalleZona'
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
