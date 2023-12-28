import { ObjectId } from 'mongodb'
import { agreggateCollections, deleteItem, getCollection, getItem, upsertItem } from '../utils/dataBaseConfing.js'

export const getMonedas = async (req, res) => {
  try {
    const monedas = await getCollection({ nameCollection: 'monedas' })
    return res.status(200).json({ monedas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener las monedas ' + e.message })
  }
}
export const saveMoneda = async (req, res) => {
  const { nombre, nombreCorto, nombreInterno, _id } = req.body
  try {
    const verifyMoneda = await getItem({ nameCollection: 'monedas', filters: { nombreInterno } })
    if (verifyMoneda) return res.status(400).json({ error: 'Ya existe una moneda con este nombre interno' })
    const moneda = await upsertItem({
      nameCollection: 'monedas',
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          nombre,
          nombreCorto,
          nombreInterno
        }
      }
    })
    return res.status(200).json({ status: 'Moneda guardada con exito', moneda })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar esta moneda ' + e.message })
  }
}
export const deleteMoneda = async (req, res) => {
  const { _id } = req.body
  try {
    await deleteItem({ nameCollection: 'monedas', filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Moneda eliminada con exito' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar esta moneda ' + e.message })
  }
}
export const getTasas = async (req, res) => {
  const { itemsPorPagina, pagina } = req.body
  try {
    const tasas = await agreggateCollections({
      nameCollection: 'tasas',
      pipeline: [
        { $sort: { fecha: 1 } },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) }
      ]
    })
    const datosExtras = await agreggateCollections(
      {
        nameCollection: 'tasas',
        pipeline: [
          { $count: 'cantidad' }
        ]
      })
    return res.status(200).json({ tasas, cantidad: datosExtras[0]?.cantidad })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar tasas monetarias' + e.message })
  }
}
