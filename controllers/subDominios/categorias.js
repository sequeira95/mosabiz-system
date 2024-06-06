import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, deleteItemSD, deleteManyItemsSD, formatCollectionName, getItemSD, updateItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
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
            vidaUtil: 1,
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
export const getCategoriasForVentas = async (req, res) => {
  const { clienteId } = req.body
  try {
    const categoriasProductos = await agreggateCollectionsSD({
      nameCollection: 'categorias',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo: 'inventario' } }
      ]
    })
    const categoriasServicios = await agreggateCollectionsSD({
      nameCollection: 'categorias',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo: 'servicios' } }
      ]
    })
    console.log(categoriasProductos, categoriasServicios)
    return res.status(200).json({ categoriasProductos, categoriasServicios })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las categoría' + e.message })
  }
}
export const getCategoriasForCompras = async (req, res) => {
  const { clienteId, tipo } = req.body
  try {
    let matchConfig = { tipo: { $in: ['compras/proveedor', 'compras/servicio'] } }
    if (tipo === 'compras/proveedor') matchConfig = { tipo: 'compras/proveedor' }
    if (tipo === 'compras/servicio') matchConfig = { tipo: 'compras/servicio' }
    const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
    const categorias = await agreggateCollectionsSD({
      nameCollection: 'categorias',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: matchConfig },
        {
          $lookup: {
            from: planCuentaCollection,
            localField: 'cuentaId',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  descripcion: 1,
                  codigo: 1
                }
              }
            ],
            as: 'detalleCuenta'
          }
        },
        { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            nombre: 1,
            tipo: 1,
            cuentaId: 1,
            cuentaCodigo: '$detalleCuenta.codigo',
            cuentaDescripcion: '$detalleCuenta.descripcion',
            observacion: 1
          }
        }
      ]
    })
    console.log(categorias)
    return res.status(200).json({ categorias })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las categoría' + e.message })
  }
}
export const saveCategorias = async (req, res) => {
  const { _id, clienteId, nombre, observacion, tipo, vidaUtil } = req.body
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
      const categoria = await upsertItemSD({
        nameCollection: 'categorias',
        enviromentClienteId: clienteId,
        filters: { tipo, _id: new ObjectId(_id) },
        update: {
          $set: {
            nombre,
            observacion,
            vidaUtil: Number(vidaUtil),
            fechaCreacion: moment().toDate()
          }
        }
      })
      return res.status(200).json({ status: 'categoría guardada exitosamente', categoria })
    }
    const categoria = await updateItemSD({
      nameCollection: 'categorias',
      enviromentClienteId: clienteId,
      filters: { tipo, _id: new ObjectId(_id) },
      update: {
        $set: {
          nombre,
          observacion,
          vidaUtil: Number(vidaUtil)
          // fechaCreacion: fechaCreacion ? moment(fechaCreacion).toDate() : moment().toDate()
        }
      }
    })

    return res.status(200).json({ status: 'categoría guardada exitosamente', categoria })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la categoría' + e.message })
  }
}
export const saveCategoriasForVentas = async (req, res) => {
  const { _id, clienteId, nombre, utilidad, hasDescuento, descuento, tipoDescuento, observacion, tipo } = req.body
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
      const categoria = await upsertItemSD({
        nameCollection: 'categorias',
        enviromentClienteId: clienteId,
        filters: { tipo, _id: new ObjectId(_id) },
        update: {
          $set: {
            nombre,
            observacion,
            utilidad: Number(utilidad) || null,
            hasDescuento,
            descuento: Number(descuento) || null,
            tipoDescuento,
            tipo,
            fechaCreacion: moment().toDate()
          }
        }
      })
      return res.status(200).json({ status: 'categoría guardada exitosamente', categoria })
    }
    const categoria = await updateItemSD({
      nameCollection: 'categorias',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          nombre,
          observacion,
          utilidad: Number(utilidad) || null,
          hasDescuento,
          descuento: Number(descuento) || null,
          tipoDescuento,
          fechaCreacion: moment().toDate()
        }
      }
    })

    return res.status(200).json({ status: 'categoría guardada exitosamente', categoria })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la categoría' + e.message })
  }
}
export const saveCategoriasForCompras = async (req, res) => {
  const { _id, clienteId, nombre, cuentaId, observacion, tipo } = req.body
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
      const categoria = await upsertItemSD({
        nameCollection: 'categorias',
        enviromentClienteId: clienteId,
        filters: { tipo, _id: new ObjectId(_id) },
        update: {
          $set: {
            nombre,
            observacion,
            cuentaId: cuentaId ? new ObjectId(cuentaId) : null,
            tipo,
            fechaCreacion: moment().toDate()
          }
        }
      })
      return res.status(200).json({ status: 'categoría guardada exitosamente', categoria })
    }
    const categoria = await updateItemSD({
      nameCollection: 'categorias',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          nombre,
          observacion,
          tipo,
          cuentaId: cuentaId ? new ObjectId(cuentaId) : null,
          fechaCreacion: moment().toDate()
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
