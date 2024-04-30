import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, deleteItemSD, formatCollectionName, getItemSD, updateItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment'
import { subDominioName } from '../../constants.js'

export const getServicios = async (req, res) => {
  const { clienteId, tipo } = req.body
  try {
    const categoriaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const zonasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonas' })
    const retencionCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'retencionISLR' })
    const servicios = await agreggateCollectionsSD({
      nameCollection: 'servicios',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo } },
        {
          $lookup: {
            from: zonasCollection,
            localField: 'zona',
            foreignField: '_id',
            as: 'detalleZona'
          }
        },
        { $unwind: { path: '$detalleZona', preserveNullAndEmptyArrays: true } },
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
          $lookup: {
            from: retencionCollection,
            localField: 'retencion',
            foreignField: '_id',
            as: 'detalleRetencion'
          }
        },
        { $unwind: { path: '$detalleRetencion', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            zonaId: '$detalleZona._id',
            zona: '$detalleZona.nombre',
            categoriaId: '$detalleCategoria._id',
            categoria: '$detalleCategoria.nombre',
            descuento: '$detalleCategoria.descuento',
            tipoDescuento: '$detalleCategoria.tipoDescuento',
            hasDescuento: '$detalleCategoria.hasDescuento',
            retencionId: '$detalleRetencion._id',
            retencion: '$detalleRetencion.nombre',
            codigo: 1,
            nombre: 1,
            moneda: 1,
            precio: 1,
            observacion: 1,
            fechaCreacion: 1
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
  const { _id, clienteId, categoria, zona, codigo, nombre, moneda, precio, retencion, observacion, tipo } = req.body
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
            zona: zona ? new ObjectId(zona) : null,
            codigo,
            nombre,
            moneda: moneda ? new ObjectId(moneda) : null,
            precio: Number(precio) || null,
            retencion: retencion ? new ObjectId(retencion) : null,
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
          zona: zona ? new ObjectId(zona) : null,
          codigo,
          nombre,
          moneda: moneda ? new ObjectId(moneda) : null,
          precio: Number(precio) || null,
          retencion: retencion ? new ObjectId(retencion) : null,
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
