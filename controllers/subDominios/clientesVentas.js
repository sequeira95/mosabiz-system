import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, deleteItemSD, getItemSD, updateItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment'

export const getClientesVentas = async (req, res) => {
  const { clienteId } = req.body
  try {
    const clientes = await agreggateCollectionsSD({
      nameCollection: 'clientes',
      enviromentClienteId: clienteId
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
            zona,
            categoria,
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
          zona,
          categoria,
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
