import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, createItemSD, createManyItemsSD, deleteItemSD, deleteManyItemsSD, formatCollectionName, getCollectionSD, getItemSD, updateItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { deleteImg, uploadImg } from '../../../utils/cloudImage.js'
import { subDominioName } from '../../../constants.js'

export const getSucursales = async (req, res) => {
  const { clienteId } = req.body
  try {
    const sucursales = await agreggateCollectionsSD({
      nameCollection: 'ventassucursales',
      enviromentClienteId: clienteId,
      pipeline: []
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
  const { _id, codigo, nombre, rif, direccion, usuarios, almacenes, clienteId } = req.body
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
      if (documentosAdjuntos[0]) logo.logo = documentosAdjuntos[0]
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
          almacenes: (almacenesArray || []).map(e => new ObjectId(e))
        }
      })
      sucursal = await getItemSD({ nameCollection: 'ventassucursales', enviromentClienteId: clienteId, filters: { _id: newSucursal.insertedId } })
    }
    return res.status(200).json({ status: 'Sucursal guardada exitosamente', sucursal })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la sucursal: ' + e.message })
  }
}

export const saveSucursales = async (req, res) => {
  const { clienteId, items } = req.body
  if (!items[0]) return res.status(400).json({ error: 'Hubo un error al momento de procesar la lista de sucursales' })
  for (const item of items) {
    const existItem = await getItemSD({
      nameCollection: 'ventassucursales',
      enviromentClienteId: clienteId,
      filters: { codigo: item.codigo }
    })
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
            usuarios: (item.usuarios || []).map(e => new ObjectId(e)),
            almacenes: (item.almacenes || []).map(e => new ObjectId(e))
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
          usuarios: (item.usuarios || []).map(e => new ObjectId(e)),
          almacenes: (item.almacenes || []).map(e => new ObjectId(e)),
          fechaCreacion: momentDate().toDate()
        }
      })
    }
  }
  return res.status(200).json({ status: 'Sucursales guardados exitosamente' })
}

export const deleteSucursales = async (req, res) => {
  const { clienteId, _id } = req.body
  try {
    await deleteItemSD({ nameCollection: 'ventassucursales', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    deleteManyItemsSD({ nameCollection: 'zonasPorSucursales', enviromentClienteId: clienteId, filters: { sucursalId: new ObjectId(_id) } })
    return res.status(200).json({ status: 'sucursal eliminada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar la sucursal' + e.message })
  }
}
