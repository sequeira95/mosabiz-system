import { upsertItemSD } from '../../utils/dataBaseConfing.js'

export const createTerceros = async (req, res) => {
  const { nombre, clienteId } = req.body
  try {
    const tercero = await upsertItemSD({
      nameCollection: 'terceros',
      enviromentClienteId: clienteId,
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
