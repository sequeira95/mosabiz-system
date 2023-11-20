import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, upsertItemSD } from '../../utils/dataBaseConfing.js'

export const getTerceros = async (req, res) => {
  const { clienteId } = req.body
  try {
    const terceros = await agreggateCollectionsSD({
      nameCollection: 'terceros',
      enviromentClienteId: clienteId
    })
    return res.status(200).json({ terceros })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar los terceros' + e.message })
  }
}
export const createTerceros = async (req, res) => {
  const { nombre, clienteId, _id } = req.body
  try {
    const tercero = await upsertItemSD({
      nameCollection: 'terceros',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          nombre
        }
      }
    })
    return res.status(200).json({ status: 'cliente creado exitosamente', tercero })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar un tercero' + e.message })
  }
}
