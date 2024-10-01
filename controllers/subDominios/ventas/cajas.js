import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, deleteItemSD, formatCollectionName, getCollectionSD, getItemSD, updateItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { deleteImg, uploadImg } from '../../../utils/cloudImage.js'
import { subDominioName } from '../../../constants.js'

export const getCajas = async (req, res) => {
  const { clienteId } = req.body
  try {
    const cuentasColName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
    const sucursalNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'ventassucursales' })
    const cajas = await agreggateCollectionsSD({
      nameCollection: 'ventascajas',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $lookup: {
            from: sucursalNameCol,
            localField: 'sucursalId',
            foreignField: '_id',
            pipeline: [
              { $project: { codigo: '$codigo', nombre: '$nombre' } }
            ],
            as: 'sucursal'
          }
        },
        { $unwind: { path: '$sucursal', preserveNullAndEmptyArrays: true } },
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
    return res.status(200).json({ cajas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener datos de las sucursales' + e.message })
  }
}

export const getUsuariosBySucursal = async (req, res) => {
  const { clienteId, sucursalId } = req.body
  try {
    if (!sucursalId) throw new Error('Sucursal no existe')
    const personasNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const [usuarios] = await agreggateCollectionsSD({
      nameCollection: 'ventassucursales',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { _id: new ObjectId(sucursalId) } },
        {
          $lookup: {
            from: personasNameCol,
            localField: 'usuarios',
            foreignField: '_id',
            pipeline: [
              { $project: { nombre: '$nombre' } }
            ],
            as: 'personas'
          }
        },
        { $project: { usuarios: '$personas' } }
      ]
    })
    return res.status(200).json({ usuarios: usuarios?.usuarios })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener datos de las sucursales' + e.message })
  }
}

export const createCajas = async (req, res) => {
  const {
    _id,
    nombre,
    descripcion,
    clienteId,
    sucursalId,
    usuarios,
    cuentaId,
    numeroControl,
    useImpresoraFiscal,
    modeloImpresoraFiscal,
    clave
  } = req.body
  if (!nombre) throw new Error('Debe un gresar un nombre y codigo valido')
  try {
    const verify = await getItemSD({
      nameCollection: 'ventascajas',
      enviromentClienteId: clienteId,
      filters: { nombre }
    })
    if ((_id && verify && String(verify._id) !== _id) || (verify && !_id)) throw new Error('EL nombre de caja ya existe')
    let caja
    const usuariosArray = Array.isArray(usuarios)
      ? usuarios
      : usuarios
        ? [usuarios]
        : undefined
    if (_id) {
      caja = await updateItemSD({
        nameCollection: 'ventascajas',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            descripcion,
            nombre,
            numeroControl,
            useImpresoraFiscal,
            modeloImpresoraFiscal,
            sucursalId: (sucursalId && new ObjectId(sucursalId)) || null,
            usuarios: (usuariosArray || []).map(e => new ObjectId(e)),
            cuentaId: (cuentaId && new ObjectId(cuentaId)) || null,
            clave: Number(clave)
          }
        }
      })
    } else {
      const newCaja = await createItemSD({
        nameCollection: 'ventascajas',
        enviromentClienteId: clienteId,
        item: {
          descripcion,
          nombre,
          sucursalId: (sucursalId && new ObjectId(sucursalId)) || null,
          usuarios: (usuariosArray || []).map(e => new ObjectId(e)),
          cuentaId: (cuentaId && new ObjectId(cuentaId)) || null,
          numeroControl,
          useImpresoraFiscal,
          modeloImpresoraFiscal,
          clave: Number(clave)
        }
      })
      caja = await getItemSD({ nameCollection: 'ventascajas', enviromentClienteId: clienteId, filters: { _id: newCaja.insertedId } })
    }
    return res.status(200).json({ status: 'Caja guardada exitosamente', caja })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la caja: ' + e.message })
  }
}

export const saveCajas = async (req, res) => {
  const { clienteId, items } = req.body
  let index = 1
  if (!items[0]) return res.status(400).json({ error: 'Hubo un error al momento de procesar la lista de sucursales' })
  try {
    for (const item of items) {
      index++
      const existItem = await getItemSD({
        nameCollection: 'ventascajas',
        enviromentClienteId: clienteId,
        filters: { nombre: item.nombre }
      })
      if (existItem) {
        await updateItemSD({
          nameCollection: 'ventascajas',
          enviromentClienteId: clienteId,
          filters: { nombre: item.nombre },
          update: {
            $set: {
              descripcion: item.descripcion || existItem.descripcion
            }
          }
        })
      } else {
        await createItemSD({
          nameCollection: 'ventascajas',
          enviromentClienteId: clienteId,
          item: {
            nombre: item.nombre,
            descripcion: item.descripcion,
            fechaCreacion: momentDate().toDate()
          }
        })
      }
    }
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar las cajas' + e.message })
  }
  return res.status(200).json({ status: 'Cajas guardados exitosamente' })
}

export const deleteCajas = async (req, res) => {
  const { clienteId, _id } = req.body
  try {
    await deleteItemSD({ nameCollection: 'ventascajas', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Caja eliminada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar la caja' + e.message })
  }
}
