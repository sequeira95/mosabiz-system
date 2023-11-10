import moment from 'moment'
import { agreggateCollectionsSD, deleteItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { nivelesCodigoByLength } from '../../constants.js'
import { ObjectId } from 'mongodb'

export const getPlanCuenta = async (req, res) => {
  const { clienteId } = req.body
  console.log({ clienteId })
  try {
    const planCuenta = await agreggateCollectionsSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      pipeline: [
        { $sort: { nivelCuenta: 1, codigo: 1 } }
      ]
    })
    return res.status(200).json({ planCuenta })
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de buscar el plan de cuenta' + e.message })
  }
}
export const saveCuenta = async (req, res) => {
  const { codigo, descripcion, conciliacion, tipo, nivel, _id } = req.body.cuenta
  const clienteId = req.body.clienteId
  try {
    const nivelCuenta = nivelesCodigoByLength[codigo.length]
    const fechaCreacion = req.body.cuenta.fechaCreacion ? req.body.cuenta.fechaCreacion : moment().toDate()
    const cuenta = await upsertItemSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update:
      {
        $set: {
          codigo,
          descripcion,
          conciliacion,
          tipo,
          nivel,
          nivelCuenta,
          fechaCreacion
        }
      }
    })
    console.log({ cuenta })
    return res.status(200).json({ status: 'Cuenta guardada exitosamente', cuenta })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar esta cuenta' + e.message })
  }
}
export const deleteCuenta = async (req, res) => {
  const { _id } = req.body.cuenta
  const { clienteId } = req.body
  try {
    await deleteItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Cuenta eliminada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar esta cuenta' + e.message })
  }
}
