import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, deleteItemSD, deleteManyItemsSD, formatCollectionName, getItemSD, updateItemSD, updateManyItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
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
    return res.status(200).json({ categorias })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las categoría' + e.message })
  }
}
export const saveCategorias = async (req, res) => {
  const { _id, clienteId, nombre, observacion, tipo, vidaUtil } = req.body
  if (!nombre) return res.status(400).json({ error: 'Debe ingresar un nombre de categoría valido' })
  try {
    if (!_id) {
      const [verifyCategoria] = await agreggateCollectionsSD({
        nameCollection: 'categorias',
        enviromentClienteId: clienteId,
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$tipo', tipo] },
                  { $eq: [{ $toLower: '$nombre' }, nombre.toLowerCase()] }
                ]
              }
            }
          }
        ]
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
    const [verifyCategoria] = await agreggateCollectionsSD({
      nameCollection: 'categorias',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $ne: ['$_id', new ObjectId(_id)] },
                { $eq: ['$tipo', tipo] },
                { $eq: [{ $toLower: '$nombre' }, nombre.toLowerCase()] }
              ]
            }
          }
        }
      ]
    })
    if (verifyCategoria) return res.status(400).json({ error: 'Ya existe una categoría con este nombre' })
    const categoria = await updateItemSD({
      nameCollection: 'categorias',
      enviromentClienteId: clienteId,
      filters: { tipo, _id: new ObjectId(_id) },
      update: {
        $set: {
          nombre,
          observacion,
          vidaUtil: Number(vidaUtil)
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
    const activosFijosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'activosFijos' })
    const categoriasData = await agreggateCollectionsSD({
      nameCollection: 'categorias',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo } },
        {
          $lookup: {
            from: activosFijosCollection,
            localField: '_id',
            foreignField: 'categoria',
            pipeline: [
              { $limit: 1 }
            ],
            as: 'detalleActivoFijo'
          }
        },
        {
          $project: {
            nombre: 1,
            vidaUtil: '$vidaUtil',
            hasActivo: { $size: '$detalleActivoFijo' }
          }
        }
      ]
    })
    const categoriasIndex = categoriasData.reduce((acc, el) => {
      acc[el.nombre.toLowerCase()] = el
      return acc
    }, {})
    if (!categorias[0]) return res.status(400).json({ error: 'Hubo un error al momento de procesar la lista de categorías' })
    const bulkWrite = categorias.map(e => {
      const filters = { tipo }
      let update = {
        observacion: e.observacion,
        tipo
      }
      const categoria = categoriasIndex[e.nombre.toLowerCase()]
      if (categoria?._id) {
        filters._id = categoria._id
        update.vidaUtil = Number(e.vidaUtil)
      } else {
        filters.nombre = e.nombre
        filters.tipo = tipo
        update = {
          nombre: e.nombre,
          observacion: e.observacion,
          fechaCreacion: moment().toDate(),
          vidaUtil: Number(e.vidaUtil),
          tipo
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
    await bulkWriteSD({ nameCollection: 'categorias', enviromentClienteId: clienteId, pipeline: bulkWrite })
    return res.status(200).json({ status: 'categorías guardadas exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar las categorías: ' + e.message })
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
export const updatePrecioVentaProductos = async (req, res) => {
  const { categoriaId, clienteId } = req.body
  try {
    await updateManyItemSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      filters: { categoria: new ObjectId(categoriaId) },
      update: {
        $set: {
          precioVenta: 0
        }
      }
    })
    return res.status(200).json({ status: 'Precio actualizado existosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar la categoría' + e.message })
  }
}
