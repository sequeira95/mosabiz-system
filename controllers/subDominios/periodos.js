import moment from 'moment'
import { agreggateCollectionsSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'

export const getListPeriodo = async (req, res) => {
  const { clienteId } = req.body
  if (!clienteId) return res.status(400).json({ error: 'El clienteId es requerido' })
  try {
    const periodos = await agreggateCollectionsSD({
      nameCollection: 'periodos',
      enviromentClienteId: clienteId
    })
    return res.status(200).json({ periodos })
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la lista de periodos' + e.message })
  }
}
export const savePeriodo = async (req, res) => {
  const { clienteId, periodo } = req.body
  console.log(req.body)
  if (!clienteId) return res.status(400).json({ error: 'El clienteId es requerido' })
  try {
    const newPeriodo = await upsertItemSD({
      nameCollection: 'periodos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(periodo._id) },
      update: {
        $set: {
          periodo: `${periodo.fechaInicio.replace('/', '-')}/${periodo.fechaFin.replace('/', '-')}`,
          fechaInicio: moment(periodo.fechaInicio, 'YYYY/MM').toDate(),
          fechaFin: moment(periodo.fechaFin, 'YYYY/MM').toDate(),
          status: periodo.status,
          activo: periodo.status === 'Activo' || periodo.status === 'Pre-cierre',
          periodoAnterior: periodo.periodoAnterior._id ? new ObjectId(periodo.periodoAnterior._id) : null
        }
      }
    })
    console.log(newPeriodo)
    return res.status(200).json({ periodo: newPeriodo })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar este periodo ' + e.message })
  }
}
