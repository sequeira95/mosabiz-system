import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, createManyItemsSD, deleteItemSD, formatCollectionName, getItemSD, updateItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment'
import { subDominioName } from '../../constants.js'

export const getServicios = async (req, res) => {
  const { clienteId, tipo } = req.body
  try {
    const categoriaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const servicios = await agreggateCollectionsSD({
      nameCollection: 'servicios',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo } },
        {
          $lookup: {
            from: categoriaCollection,
            localField: 'categoria',
            foreignField: '_id',
            as: 'detalleCategoria'
          }
        },
        { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            categoriaId: '$detalleCategoria._id',
            categoria: '$detalleCategoria.nombre',
            descuento: '$detalleCategoria.descuento',
            tipoDescuento: '$detalleCategoria.tipoDescuento',
            hasDescuento: '$detalleCategoria.hasDescuento',
            iva: '$iva',
            ivaId: '$ivaId',
            codigo: 1,
            nombre: 1,
            moneda: 1,
            precio: 1,
            observacion: 1,
            fechaCreacion: 1,
            tipo: 1
          }
        }
      ]
    })
    return res.status(200).json({ servicios })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar los servicios ' + e.message })
  }
}
export const saveServicios = async (req, res) => {
  const { _id, clienteId, categoria, codigo, nombre, moneda, precio, observacion, tipo, ivaId } = req.body
  try {
    if (!_id) {
      const verify = await getItemSD({
        nameCollection: 'servicios',
        enviromentClienteId: clienteId,
        filters: {
          codigo
        }
      })
      if (verify) return res.status(400).json({ error: 'Ya existe un servicio con este código' })
      const servicio = await upsertItemSD({
        nameCollection: 'servicios',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            categoria: categoria ? new ObjectId(categoria) : null,
            codigo,
            nombre,
            moneda,
            precio: Number(precio) || null,
            ivaId: (ivaId && new ObjectId(ivaId)) || null,
            observacion,
            fechaCreacion: moment().toDate(),
            tipo
          }
        }
      })
      return res.status(200).json({ status: 'Servicio guardado exitosamente', servicio })
    }
    const servicio = await updateItemSD({
      nameCollection: 'servicios',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          categoria: categoria ? new ObjectId(categoria) : null,
          codigo,
          nombre,
          moneda,
          precio: Number(precio) || null,
          ivaId: (ivaId && new ObjectId(ivaId)) || null,
          observacion,
          tipo
        }
      }
    })
    return res.status(200).json({ status: 'Servicio guardado exitosamente', servicio })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar este servicio' + e.message })
  }
}
export const saveToArrayServicios = async (req, res) => {
  const { clienteId, servicios, tipo } = req.body
  try {
    if (!servicios[0]) return res.status(400).json({ error: 'Hubo un error al momento de procesar la lista de proveedores' })
    const verifyServicios = await agreggateCollectionsSD({
      nameCollection: 'servicios',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { codigo: { $in: servicios.map(e => e.codigo), tipo } } }
      ]
    })
    if (verifyServicios[0]) return res.status(400).json({ error: 'Existen codigos de servicios que ya se encuentran registrados' })
    const bulkWrite = servicios.map(e => {
      return {
        ...e,
        categoria: e.categoria ? new ObjectId(e.categoria) : null,
        tipo,
        fechaCreacion: moment().toDate()
      }
    })
    createManyItemsSD({ nameCollection: 'servicios', enviromentClienteId: clienteId, items: bulkWrite })
    return res.status(200).json({ status: 'Servicios guardados exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar los servicios' + e.message })
  }
}
// para ventas
export const saveToArray = async (req, res) => {
  const { clienteId, productos } = req.body
  try {
    if (!productos[0]) return res.status(400).json({ error: 'Hubo un error al momento de procesar la lista de productos' })
    const bulkWrite = productos.map(e => {
      return {
        updateOne: {
          filter: { codigo: e.codigo, tipo: e.tipo },
          update: {
            $set: {
              descripcion: e.descripcion,
              nombre: e.nombre,
              precio: e.precio,
              moneda: e.moneda,
              ivaId: e.ivaId ? new ObjectId(e.ivaId) : null,
              categoria: e.categoria ? new ObjectId(e.categoria) : null,
              observacion: e.observacion
            }
          },
          upsert: true
        }
      }
    })
    await bulkWriteSD({ nameCollection: 'servicios', enviromentClienteId: clienteId, pipeline: bulkWrite })
    return res.status(200).json({ status: 'Servicios guardados exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar los servicios ' + e.message })
  }
}
export const deleteServicio = async (req, res) => {
  const { clienteId, _id } = req.body
  try {
    await deleteItemSD({ nameCollection: 'servicios', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Servicio eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar este servicio ' + e.message })
  }
}
