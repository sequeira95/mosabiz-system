import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, deleteItemSD, formatCollectionName, getItemSD, updateItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment'
import { subDominioName } from '../../constants.js'

export const getListBancos = async (req, res) => {
  const { clienteId } = req.body
  try {
    const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
    const bancos = await agreggateCollectionsSD({
      nameCollection: 'bancos',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $lookup: {
            from: planCuentaCollection,
            localField: 'cuentaId',
            foreignField: '_id',
            as: 'detalleCuenta'
          }
        },
        { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            nombre: '$nombre',
            cuentaId: '$cuentaId',
            cuentaCodigo: '$detalleCuenta.codigo',
            cuentaNombre: '$detalleCuenta.descripcion'
          }
        }
      ]
    })
    return res.status(200).json({ bancos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar las retenciones de ISLR ' + e.message })
  }
}
export const saveBancos = async (req, res) => {
  const { _id, clienteId, nombre, cuentaId /*, cuentaCodigo */ } = req.body
  try {
    if (!_id) {
      const verify = await getItemSD({
        nameCollection: 'bancos',
        enviromentClienteId: clienteId,
        filters: {
          nombre
        }
      })
      if (verify) return res.status(400).json({ error: 'Ya existe un banco con este nombre' })
      const banco = await upsertItemSD({
        nameCollection: 'bancos',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            nombre,
            cuentaId: new ObjectId(cuentaId),
            fechaCreacion: moment().toDate()
          }
        }
      })
      return res.status(200).json({ status: 'Banco guardado exitosamente', banco })
    }
    const banco = await updateItemSD({
      nameCollection: 'bancos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          nombre,
          cuentaId: new ObjectId(cuentaId)
        }
      }
    })
    return res.status(200).json({ status: 'Banco guardado exitosamente', banco })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el banco' + e.message })
  }
}
export const deleteRetencion = async (req, res) => {
  const { clienteId, _id } = req.body
  try {
    await deleteItemSD({ nameCollection: 'bancos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Banco eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar este banco ' + e.message })
  }
}
