import { ObjectId } from 'mongodb'
import { agreggateCollections, deleteItem, getItem, upsertItem } from '../utils/dataBaseConfing.js'

export const getBancos = async (req, res) => {
  try {
    const { pais, itemsPorPagina, pagina } = req.body
    console.log(req.body)
    const matchConfig = {}
    if (pais) {
      matchConfig.pais = { $eq: pais }
    }
    const bancos = await agreggateCollections({
      nameCollection: 'bancos',
      pipeline: [
        { $match: matchConfig },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) }
      ]
    })
    const countBancos = await agreggateCollections({
      nameCollection: 'bancos',
      pipeline: [
        { $match: matchConfig },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ bancos, countBancos: countBancos.length ? countBancos[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener las monedas ' + e.message })
  }
}
export const saveBancos = async (req, res) => {
  const { nombre, pais, _id } = req.body
  try {
    const verifyBanco = await getItem({ nameCollection: 'bancos', filters: { nombre, pais } })
    if (verifyBanco && !_id) return res.status(400).json({ error: 'Ya existe este banco' })
    const banco = await upsertItem({
      nameCollection: 'bancos',
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          nombre,
          pais
        }
      }
    })
    return res.status(200).json({ status: 'Banco guardado con exito', banco })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar este banco ' + e.message })
  }
}
export const deleteBanco = async (req, res) => {
  const { _id } = req.body
  try {
    await deleteItem({ nameCollection: 'bancos', filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Banco eliminado con exito' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar esta banco ' + e.message })
  }
}
