import { ObjectId } from 'mongodb'
import { agreggateCollections, deleteItem, updateItem, upsertItem } from '../utils/dataBaseConfing.js'

export const getIva = async (req, res) => {
  try {
    const { pais, itemsPorPagina, pagina } = req.body
    console.log(req.body)
    const matchConfig = {}
    if (pais) {
      matchConfig.pais = { $eq: pais }
    }
    const iva = await agreggateCollections({
      nameCollection: 'iva',
      pipeline: [
        { $match: matchConfig },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) }
      ]
    })
    const countIva = await agreggateCollections({
      nameCollection: 'bancos',
      pipeline: [
        { $match: matchConfig },
        { $count: 'total' }
      ]
    })
    console.log({ iva })
    return res.status(200).json({ iva, countIva: countIva.length ? countIva[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la liste del I.V.A ' + e.message })
  }
}
export const saveIva = async (req, res) => {
  const { _id, iva, descripcion, pais } = req.body
  try {
    if (!_id) {
      const ivaSave = await upsertItem({
        nameCollection: 'iva',
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            iva: Number(iva),
            descripcion,
            pais
          }
        }
      })
      return res.status(200).json({ status: 'I.V.A guardado exitosamente', iva: ivaSave })
    }
    const ivaSave = await updateItem({
      nameCollection: 'iva',
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          iva: Number(iva),
          descripcion,
          pais
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
  const { _id } = req.body
  try {
    await deleteItem({ nameCollection: 'iva', filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'I.V.A eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar este I.V.A ' + e.message })
  }
}
