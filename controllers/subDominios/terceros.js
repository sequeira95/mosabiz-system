import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, deleteItemSD, getCollectionSD, upsertItemSD, updateManyItemSD } from '../../utils/dataBaseConfing.js'

export const getTerceros = async (req, res) => {
  const { clienteId, cuentaId } = req.body
  try {
    const terceros = await agreggateCollectionsSD({
      nameCollection: 'terceros',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { cuentaId: new ObjectId(cuentaId) } }
      ]
    })
    return res.status(200).json({ terceros })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar los terceros' + e.message })
  }
}
export const saveTerceros = async (req, res) => {
  const { nombre, clienteId, _id, cuentaId } = req.body
  try {
    const tercero = await upsertItemSD({
      nameCollection: 'terceros',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          nombre,
          cuentaId: new ObjectId(cuentaId)
        }
      }
    })
    if (_id) {
      console.log('Actualizando detalle de comprobante')
      const periodosActivos = (await getCollectionSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { activo: true } })).map(e => new ObjectId(e._id))
      await updateManyItemSD(
        {
          nameCollection: 'detallesComprobantes',
          enviromentClienteId: clienteId,
          filters: { terceroId: new ObjectId(_id), periodoId: { $in: periodosActivos } },
          update: {
            $set: {
              terceroNombre: nombre
            }
          }
        })
    }
    return res.status(200).json({ status: 'Tercero creado exitosamente', tercero })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar un tercero' + e.message })
  }
}
export const deleteTercero = async (req, res) => {
  const { clienteId, _id } = req.body
  try {
    await deleteItemSD({ nameCollection: 'terceros', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Tercero eliminado exitosamente' })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar un tercero' + e.message })
  }
}
