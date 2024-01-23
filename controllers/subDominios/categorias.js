import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, deleteItemSD, deleteManyItemsSD, formatCollectionName, getItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment'
import { subDominioName } from '../../constants.js'

export const getCategorias = async (req, res) => {
  const { clienteId, tipo } = req.body
  try {
    const activosFijosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'activosFijos' })
    const categorias = await agreggateCollectionsSD({
      nameCollection: 'categorias',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo } },
        {
          $lookup: {
            from: activosFijosCollection,
            localField: '_id',
            foreignField: 'categoria',
            as: 'detalleActivoFijo'
          }
        },
        {
          $project: {
            nombre: 1,
            tipo: 1,
            observacion: 1,
            hasActivo: { $size: '$detalleActivoFijo' }
          }
        }
      ]
    })
    return res.status(200).json({ categorias })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las categoría' + e.message })
  }
}
export const saveCategorias = async (req, res) => {
  const { _id, clienteId, nombre, observacion, tipo, fechaCreacion } = req.body
  try {
    if (!_id) {
      const verifyCategoria = await getItemSD({
        nameCollection: 'categorias',
        enviromentClienteId: clienteId,
        filters: {
          tipo,
          nombre
        }
      })
      if (verifyCategoria) return res.status(400).json({ error: 'Ya existe una categoría con este nombre' })
    }
    const categoria = await upsertItemSD({
      nameCollection: 'categorias',
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

    return res.status(200).json({ status: 'categoría guardada exitosamente', categoria })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la categoría' + e.message })
  }
}
export const saveCategoriaToArray = async (req, res) => {
  const { clienteId, categorias, tipo } = req.body
  try {
    if (!categorias[0]) return res.status(400).json({ error: 'Hubo un error al momento de procesar la lista de categorías' })
    const bulkWrite = categorias.map(e => {
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
    await bulkWriteSD({ nameCollection: 'categorias', enviromentClienteId: clienteId, pipeline: bulkWrite })
    return res.status(200).json({ status: 'categorías guardadas exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar las categorías' + e.message })
  }
}
export const deleteCategorias = async (req, res) => {
  const { _id, clienteId } = req.body
  try {
    await deleteItemSD({
      nameCollection: 'categorias',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) }
    })
    deleteManyItemsSD({ nameCollection: 'categoriaPorAlmacen', enviromentClienteId: clienteId, filters: { categoriaId: new ObjectId(_id) } })
    deleteManyItemsSD({ nameCollection: 'categoriaPorZona', enviromentClienteId: clienteId, filters: { categoriaId: new ObjectId(_id) } })
    return res.status(200).json({ status: 'categoría eliminada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar la categoría' + e.message })
  }
}
