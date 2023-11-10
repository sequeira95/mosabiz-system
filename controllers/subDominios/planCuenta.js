import moment from 'moment'
import { agreggateCollectionsSD, bulkWriteSD, deleteItemSD, getItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { nivelesCodigoByLength } from '../../constants.js'
import { ObjectId } from 'mongodb'

export const getPlanCuenta = async (req, res) => {
  const { clienteId } = req.body
  try {
    const planCuenta = await agreggateCollectionsSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      pipeline: [
        { $sort: { codigo: 1 } }
      ]
    })
    // console.log(planCuenta)
    return res.status(200).json({ planCuenta })
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de buscar el plan de cuenta' + e.message })
  }
}
export const saveCuenta = async (req, res) => {
  const { codigo, descripcion, conciliacion, tipo, _id } = req.body.cuenta
  const clienteId = req.body.clienteId
  try {
    const nivelCuenta = nivelesCodigoByLength[codigo.length]
    const fechaCreacion = req.body.cuenta.fechaCreacion ? req.body.cuenta.fechaCreacion : moment().toDate()
    const verifyCuenta = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { codigo } })
    if (!_id && verifyCuenta) return res.status(400).json({ error: 'Ya existe una cuenta con este codigo' })
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
          nivelCuenta,
          fechaCreacion
        }
      }
    })
    return res.status(200).json({ status: 'Cuenta guardada exitosamente', cuenta })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar esta cuenta' + e.message })
  }
}
export const deleteCuenta = async (req, res) => {
  const { cuentaId, clienteId } = req.body
  try {
    await deleteItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(cuentaId) } })
    return res.status(200).json({ status: 'Cuenta eliminada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar esta cuenta' + e.message })
  }
}
export const saveCuentaToExcel = async (req, res) => {
  const { cuentas, clienteId } = req.body
  try {
    const planCuenta = cuentas.filter(cuenta => cuenta.codigo && cuenta.descripcion && cuenta.tipo).map(e => {
      const nivelCuenta = nivelesCodigoByLength[String(e.codigo).length]
      return {
        updateOne: {
          filter: { codigo: String(e.codigo) },
          update: {
            $set: {
              codigo: String(e.codigo),
              descripcion: e.descripcion,
              conciliacion: e.conciliacion,
              tipo: e.tipo.toLowerCase() !== 'grupo' ? 'Movimiento' : e.tipo,
              nivelCuenta,
              fechaCreacion: moment().toDate()
            }
          },
          upsert: true
        }
      }
    })
    await bulkWriteSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, pipeline: planCuenta })
    const planCuentaActualizado = await agreggateCollectionsSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      pipeline: [
        { $sort: { codigo: 1 } }
      ]
    })
    return res.status(200).json({ status: 'Cuentas guardada exitosamente', planCuenta: planCuentaActualizado })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de cargar datos del plan de cuenta' + e.message })
  }
}
