import { ObjectId } from 'mongodb'
import { agreggateCollections, agreggateCollectionsSD, bulkWriteSD, createItemSD, deleteItemSD, deleteManyItemsSD, formatCollectionName, getCollection, getItem, getItemSD, updateItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { deleteImg, uploadImg } from '../../../utils/cloudImage.js'
import { subDominioName } from '../../../constants.js'

export const getData = async (req, res) => {
  const { clienteId, fechaDia, userId } = req.body
  try {
    const almacenNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
    const monedas = await getCollection({ nameCollection: 'monedas' })
    const sucursales = await agreggateCollectionsSD({
      nameCollection: 'ventassucursales',
      enviromentClienteId: clienteId,
      pipeline: [
        /* {
          $match: {
            usuarios: { $exists: true, $elemMatch: { $eq: new ObjectId(userId) } }
          }
        }, */
        {
          $project: {
            _id: 1,
            nombre: 1,
            almacenes: 1
          }
        },
        {
          $lookup: {
            from: almacenNameCol,
            localField: 'almacenes',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  nombre: { $concat: ['$codigo', ' - ', '$nombre'] }
                }
              }
            ],
            as: 'almacenData'
          }
        },
        {
          $match: {
            $expr: {
              $gt: [{ $size: '$almacenData' }, 0]
            }
          }
        }
      ]
    })
    let tasa = await getItem({ nameCollection: 'tasas', filters: { fechaUpdate: fechaDia } })
    if (!tasa) {
      const ultimaTasa = await agreggateCollections({
        nameCollection: 'tasas',
        pipeline: [
          { $sort: { fechaOperacion: -1 } },
          { $limit: 1 }
        ]
      })
      tasa = ultimaTasa[0] ? ultimaTasa[0] : null
    }
    const zonas = await agreggateCollectionsSD({
      nameCollection: 'ventaszonas',
      enviromentClienteId: clienteId,
      pipeline: [
        { $sort: { nombre: 1 } }
      ]
    })
    return res.status(200).json({ monedas, sucursales, tasa, zonas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la data de facturacion: ' + e.message })
  }
}
