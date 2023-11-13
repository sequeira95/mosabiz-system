import moment from 'moment'
import { agreggateCollectionsSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'

export const getListPeriodo = async (req, res) => {
  const { clienteId } = req.body
  try {
    const periodos = await agreggateCollectionsSD({
      nameCollection: 'periodos',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $project:
          {
            periodo: '$periodo'
          }
        }
      ]
    })
    return res.status(200).json({ periodos })
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la lista de periodos' + e.message })
  }
}
