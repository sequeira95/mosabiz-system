import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, deleteItemSD, formatCollectionName, getItemSD, updateItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment'
import { subDominioName } from '../../constants.js'

export const getClientesVentas = async (req, res) => {
  const { clienteId } = req.body
  try {
    const categoriaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const zonasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'ventaszonas' })
    const clientes = await agreggateCollectionsSD({
      nameCollection: 'clientes',
      enviromentClienteId: clienteId,
      pipeline: [
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
          $project: {
            zonaId: '$detalleZona._id',
            zona: '$detalleZona.nombre',
            categoriaId: '$detalleCategoria._id',
            categoria: '$detalleCategoria.nombre',
            tipoDocumento: 1,
            documentoIdentidad: 1,
            email: 1,
            razonSocial: 1,
            telefono: 1,
            isContribuyenteEspecial: 1,
            direccion: 1,
            direccionEnvio: 1,
            observacion: 1
          }
        }
      ]
    })
    return res.status(200).json({ clientes })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar los clientes ' + e.message })
  }
}
export const saveClienteVentas = async (req, res) => {
  const {
    _id,
    clienteId,
    tipoDocumento,
    documentoIdentidad,
    email,
    razonSocial,
    telefono,
    isContribuyenteEspecial,
    direccion,
    direccionEnvio,
    zona,
    categoria,
    observacion
  } = req.body
  try {
    if (!_id) {
      const verify = await getItemSD({
        nameCollection: 'clientes',
        enviromentClienteId: clienteId,
        filters: {
          tipoDocumento,
          documentoIdentidad
        }
      })
      if (verify) return res.status(400).json({ error: 'Ya existe un cliente con este documento de identidad' })
      const cliente = await upsertItemSD({
        nameCollection: 'clientes',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            tipoDocumento,
            documentoIdentidad,
            email,
            razonSocial,
            telefono,
            isContribuyenteEspecial,
            direccion,
            direccionEnvio,
            zona: zona ? new ObjectId(zona) : null,
            categoria: categoria ? new ObjectId(categoria) : null,
            observacion,
            fechaCreacion: moment().toDate()
          }
        }
      })
      return res.status(200).json({ status: 'Cliente guardado exitosamente', cliente })
    }
    const cliente = await updateItemSD({
      nameCollection: 'clientes',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          tipoDocumento,
          documentoIdentidad,
          email,
          razonSocial,
          telefono,
          isContribuyenteEspecial,
          direccion,
          direccionEnvio,
          zona: zona ? new ObjectId(zona) : null,
          categoria: categoria ? new ObjectId(categoria) : null,
          observacion
        }
      }
    })
    return res.status(200).json({ status: 'Cliente guardado exitosamente', cliente })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el cliente' + e.message })
  }
}
export const deleteCliente = async (req, res) => {
  const { clienteId, _id } = req.body
  try {
    await deleteItemSD({ nameCollection: 'clientes', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Cliente eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar este cliente ' + e.message })
  }
}
