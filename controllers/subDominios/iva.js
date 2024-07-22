import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, deleteItemSD, updateItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment'

export const getIva = async (req, res) => {
  const { clienteId } = req.body
  try {
    console.log({ clienteId })
    const iva = await agreggateCollectionsSD({ nameCollection: 'iva', enviromentClienteId: clienteId })
    console.log({ iva })
    return res.status(200).json({ iva })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la liste del I.V.A ' + e.message })
  }
}
export const saveIva = async (req, res) => {
  const { _id, clienteId, iva, descripcion } = req.body
  try {
    console.log(req.body)
    if (!_id) {
      const ivaSave = await upsertItemSD({
        nameCollection: 'iva',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            iva: Number(iva),
            descripcion,
            fechaCreacion: moment().toDate()
          }
        }
      })
      return res.status(200).json({ status: 'I.V.A guardado exitosamente', iva: ivaSave })
    }
    const ivaSave = await updateItemSD({
      nameCollection: 'iva',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          iva: Number(iva),
          descripcion
        }
      }
    })
    return res.status(200).json({ status: 'I.V.A guardado exitosamente', iva: ivaSave })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar este I.V.A' + e.message })
  }
}
export const deleteIva = async (req, res) => {
  const { clienteId, _id } = req.body
  try {
    await deleteItemSD({ nameCollection: 'iva', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'I.V.A eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar este I.V.A ' + e.message })
  }
}
