import moment from 'moment-timezone'
import { agreggateCollections } from '../../../utils/dataBaseConfing.js'

export const getCiclos = async (req, res) => {
  const { fecha } = req.body
  console.log(fecha)
  try {
    const ciclos = await agreggateCollections({
      nameCollection: 'ciclosImpuestos',
      pipeline: [
        /* {
          $match:
          {
            $or: [
              {
                $and: 
              }
            fechaFind: { $lte: moment(fecha).toDate() },
              {
                $and: [
                  { isFechaActual: true },
                  { fechaInicio: { $lte: moment(fecha).toDate() } }
                ]
              }
            ]
          }
        } */
      ]
    })
    return res.status(200).json({ ciclos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las retenciones de ISLR ' + e.message })
  }
}
