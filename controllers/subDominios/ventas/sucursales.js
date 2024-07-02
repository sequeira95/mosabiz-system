import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, deleteItemSD, deleteManyItemsSD, formatCollectionName, getItemSD, updateItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { deleteImg, uploadImg } from '../../../utils/cloudImage.js'
import { subDominioName } from '../../../constants.js'

export const getSucursales = async (req, res) => {
  const { clienteId } = req.body
  try {
    const zonasNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonas' })
    const sucursales = await agreggateCollectionsSD({
      nameCollection: 'ventassucursales',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $lookup: {
            from: zonasNameCol,
            localField: 'zonaId',
            foreignField: '_id',
            as: 'zonaData'
          }
        },
        { $unwind: '$zonaData' },
        { $addFields: { zona: '$zonaData.nombre' } }
      ]
    })
    const usuarios = await agreggateCollectionsSD({
      nameCollection: 'personas',
      pipeline: [
        { $match: { isCliente: true, clienteId: new ObjectId(clienteId) } },
        { $project: { nombre: '$nombre' } }
      ]
    })
    const almacenes = await agreggateCollectionsSD({
      nameCollection: 'almacenes',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { nombre: { $nin: ['Transito', 'Auditoria'] } } },
        {
          $project: {
            _id: 1,
            nombre: { $concat: ['$codigo', ' - ', '$nombre'] }
          }
        }
      ]
    })
    return res.status(200).json({ sucursales, usuarios, almacenes })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener datos de las sucursales' + e.message })
  }
}

export const createSucursal = async (req, res) => {
  const { _id, zonaId, codigo, nombre, rif, logo: logoRef, direccion, usuarios, almacenes, clienteId } = req.body
  const file = req.files?.logo
  if (!codigo || !nombre) throw new Error('Debe un gresar un nombre y codigo valido')
  try {
    const verify = await getItemSD({
      nameCollection: 'ventassucursales',
      enviromentClienteId: clienteId,
      filters: { codigo }
    })
    if ((_id && verify && String(verify._id) !== _id) || (verify && !_id)) throw new Error('EL código de sucursal ya existe')
    const documentosAdjuntos = []
    if (req.files && req.files.logo) {
      if (file && file[0]) {
        for (const documento of file) {
          const extension = documento.mimetype.split('/')[1]
          const namePath = `${documento.name}`
          const resDoc = await uploadImg(documento.data, namePath)
          documentosAdjuntos.push(
            {
              path: resDoc.filePath,
              name: resDoc.name,
              url: resDoc.url,
              type: extension,
              fileId: resDoc.fileId
            })
        }
      }
      if (file && file.name) {
        const extension = file.mimetype.split('/')[1]
        const namePath = `${file.name}`
        const resDoc = await uploadImg(file.data, namePath)
        documentosAdjuntos.push(
          {
            path: resDoc.filePath,
            name: resDoc.name,
            url: resDoc.url,
            type: extension,
            fileId: resDoc.fileId
          })
      }
    }
    let sucursal
    const usuariosArray = Array.isArray(usuarios)
      ? usuarios
      : usuarios
        ? [usuarios]
        : undefined
    const almacenesArray = Array.isArray(almacenes)
      ? almacenes
      : almacenes
        ? [almacenes]
        : undefined
    if (_id) {
      const logo = {}
      console.log({
        logoRef,
        v: verify.logo
      })
      if (!logoRef) logo.logo = null
      if (documentosAdjuntos[0]) logo.logo = documentosAdjuntos[0]
      if (((!logoRef && verify.logo) || (logo.logo?.fileId && verify.logo.fileId !== logo.logo.fileId))) {
        await deleteImg(verify.logo.fileId)
      }
      sucursal = await updateItemSD({
        nameCollection: 'ventassucursales',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            codigo,
            nombre,
            rif,
            direccion,
            usuarios: (usuariosArray || []).map(e => new ObjectId(e)),
            almacenes: (almacenesArray || []).map(e => new ObjectId(e)),
            zonaId: new ObjectId(zonaId),
            ...logo
          }
        }
      })
    } else {
      const newSucursal = await createItemSD({
        nameCollection: 'ventassucursales',
        enviromentClienteId: clienteId,
        item: {
          codigo,
          nombre,
          rif,
          logo: documentosAdjuntos[0],
          direccion,
          usuarios: (usuariosArray || []).map(e => new ObjectId(e)),
          almacenes: (almacenesArray || []).map(e => new ObjectId(e)),
          zonaId: new ObjectId(zonaId)
        }
      })
      sucursal = await getItemSD({ nameCollection: 'ventassucursales', enviromentClienteId: clienteId, filters: { _id: newSucursal.insertedId } })
    }
    const zona = await getItemSD({ nameCollection: 'zonas', enviromentClienteId: clienteId, filters: { _id: new ObjectId(sucursal.zonaId) } })
    sucursal.zona = zona.nombre
    sucursal.zonaData = zona
    return res.status(200).json({ status: 'Sucursal guardada exitosamente', sucursal })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la sucursal: ' + e.message })
  }
}

export const saveSucursales = async (req, res) => {
  const { clienteId, items } = req.body
  let index = 1
  if (!items[0]) return res.status(400).json({ error: 'Hubo un error al momento de procesar la lista de sucursales' })
  try {
    for (const item of items) {
      index++
      const existItem = await getItemSD({
        nameCollection: 'ventassucursales',
        enviromentClienteId: clienteId,
        filters: { codigo: item.codigo }
      })
      const zona = await getItemSD({
        nameCollection: 'zonas',
        enviromentClienteId: clienteId,
        filters: { nombre: item.zona, tipo: 'inventario' }
      })
      if (!zona) throw new Error(`La linea ${index} no tiene una zona valida`)
      if (existItem) {
        await updateItemSD({
          nameCollection: 'ventassucursales',
          enviromentClienteId: clienteId,
          filters: { codigo: item.codigo },
          update: {
            $set: {
              nombre: item.nombre,
              rif: item.rif,
              direccion: item.direccion,
              zonaId: zona._id
            }
          }
        })
      } else {
        await createItemSD({
          nameCollection: 'ventassucursales',
          enviromentClienteId: clienteId,
          item: {
            codigo: item.codigo,
            nombre: item.nombre,
            rif: item.rif,
            direccion: item.direccion,
            zonaId: zona._id,
            fechaCreacion: momentDate().toDate()
          }
        })
      }
    }
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar la sucursal' + e.message })
  }
  return res.status(200).json({ status: 'Sucursales guardados exitosamente' })
}

export const deleteSucursales = async (req, res) => {
  const { clienteId, _id } = req.body
  try {
    await deleteItemSD({ nameCollection: 'ventassucursales', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'sucursal eliminada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar la sucursal' + e.message })
  }
}

export const listSucursalesPorZonas = async (req, res) => {
  const { clienteId, sucursalId } = req.body
  try {
    const zonasPorSucursales = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonasPorSucursales' })
    const list = await agreggateCollectionsSD({
      nameCollection: 'ventaszonas',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $lookup: {
            from: zonasPorSucursales,
            localField: '_id',
            foreignField: 'zonaId',
            pipeline: [
              { $match: { sucursalId: new ObjectId(sucursalId) } }
            ],
            as: 'zonasPorSucursales'
          }
        },
        { $unwind: { path: '$zonasPorSucursales', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 1,
            zona: '$nombre',
            zonaId: '$_id',
            sucursalId: '$zonasPorSucursales.sucursalId',
            cuentaId: '$zonasPorSucursales.cuentaId'
          }
        }
      ]
    })
    return res.status(200).json({ list })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la lista de categorías por zonas ' + e.message })
  }
}

export const saveSucursalesPorZonas = async (req, res) => {
  const { clienteId, tipo, categoriasPorZona, sucursalId } = req.body
  try {
    await saveSucursalPorZona({ clienteId, tipo, categoriasPorZona, sucursalId })
    return res.status(200).json({ status: 'Categorias guardadas exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar las categoria por zona ' + e.message })
  }
}

const saveSucursalPorZona = async ({ clienteId, categoriasPorZona, sucursalId }) => {
  const bulkWrite = []
  try {
    for (const categoriaZona of categoriasPorZona) {
      bulkWrite.push({
        updateOne: {
          filter: { zonaId: new ObjectId(categoriaZona.zonaId), sucursalId: new ObjectId(sucursalId) },
          update: {
            $set: {
              cuentaId: categoriaZona.cuentaId ? new ObjectId(categoriaZona.cuentaId) : null
            }
          },
          upsert: true
        }
      })
    }
    if (bulkWrite[0]) await bulkWriteSD({ nameCollection: 'zonasPorSucursales', enviromentClienteId: clienteId, pipeline: bulkWrite })
  } catch (e) {
    console.log(e)
    throw e
  }
}
