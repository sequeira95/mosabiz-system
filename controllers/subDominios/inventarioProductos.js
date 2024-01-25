import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, deleteItemSD, formatCollectionName, getItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { subDominioName } from '../../constants.js'

export const getProductos = async (req, res) => {
  const { clienteId } = req.body
  try {
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const productos = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $lookup: {
            from: categoriasCollection,
            localField: 'categoria',
            foreignField: '_id',
            as: 'detalleCategoria'
          }
        },
        { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            codigo: '$codigo',
            nombre: '$nombre',
            descripcion: '$descripcion',
            unidad: '$unidad',
            categoriaId: '$categoria',
            categoria: '$detalleCategoria.nombre',
            observacion: '$observacion'
          }
        }
      ]
    })
    console.log(productos)
    return res.status(200).json({ productos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtner datos de los activo fijos' + e.message })
  }
}
export const saveProducto = async (req, res) => {
  const { codigo, nombre, descripcion, unidad, categoria, observacion, clienteId, _id } = req.body
  try {
    if (!_id) {
      const verify = await getItemSD({
        nameCollection: 'productos',
        enviromentClienteId: clienteId,
        filters: {
          codigo,
          nombre
        }
      })
      if (verify) return res.status(400).json({ error: 'Ya existe un producto con este código y nombre' })
    }
    const producto = await upsertItemSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          codigo,
          nombre,
          descripcion,
          unidad,
          categoria: new ObjectId(categoria),
          observacion
        }
      }
    })
    return res.status(200).json({ status: 'Producto guardado exitosamente', producto })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el producto ' + e.message })
  }
}
export const deleteProducto = async (req, res) => {
  const { _id, clienteId } = req.body
  try {
    await deleteItemSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) }
    })
    return res.status(200).json({ status: 'Producto eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar el producto ' + e.message })
  }
}
export const saveToArray = async (req, res) => {
  const { clienteId, productos } = req.body
  try {
    if (!productos[0]) return res.status(400).json({ error: 'Hubo un error al momento de procesar la lista de productos' })
    const bulkWrite = productos.map(e => {
      return {
        updateOne: {
          filter: { nombre: e.nombre, codigo: e.codigo },
          update: {
            $set: {
              descripcion: e.descripcion,
              unidad: e.unidad,
              categoria: e.categoria ? new ObjectId(e.categoria) : null,
              observacion: e.observacion
            }
          },
          upsert: true
        }
      }
    })
    await bulkWriteSD({ nameCollection: 'productos', enviromentClienteId: clienteId, pipeline: bulkWrite })
    return res.status(200).json({ status: 'Productos guardados exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar los productos ' + e.message })
  }
}
