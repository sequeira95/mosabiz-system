import moment from 'moment'
import { getCollectionSD, getItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'

export const getAjustesCliente = async (req, res) => {
  console.log('cambio')
  const { clienteId } = req.body
  if (!clienteId) return res.status(400).json({ error: 'Falta el cliente' })
  try {
    const ajustes = await getCollectionSD({ enviromentClienteId: clienteId, nameCollection: 'ajustes' })
    const ajusteToObject = {}
    ajustes.forEach(ajuste => {
      ajusteToObject[ajuste.tipo] = ajuste
    })
    return res.status(200).json({ status: 'ajustes obtenidos exitosamente', ajustes: ajusteToObject })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de obtener ajustes ${e.message}` })
  }
}
export const getTipoAjustesCliente = async (req, res) => {
  const clienteId = req.body.clienteId
  if (!clienteId) return res.status(400).json({ error: 'Falta el cliente' })
  const tipo = req.body.tipo
  try {
    const ajustes = await getItemSD({ enviromentClienteId: clienteId, nameCollection: 'ajustes', filters: { tipo } })
    return res.status(200).json(ajustes)
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de obtener ajustes ${tipo} ${e.message}` })
  }
}
export const upsertAjusteCliente = async (req, res) => {
  const ajuste = req.body.ajuste
  const clienteId = req.body.clienteId
  if (ajuste.cuentaSuperAvitAcum && ajuste.cuentaSuperAvitAcum._id) ajuste.cuentaSuperAvitAcum = new ObjectId(ajuste.cuentaSuperAvitAcum._id)
  if (ajuste.cuentaPerdidaAcum && ajuste.cuentaPerdidaAcum._id) ajuste.cuentaPerdidaAcum = new ObjectId(ajuste.cuentaPerdidaAcum._id)
  if (ajuste.cuentaSuperAvitOperdidaActual && ajuste.cuentaSuperAvitOperdidaActual._id) ajuste.cuentaSuperAvitOperdidaActual = new ObjectId(ajuste.cuentaSuperAvitOperdidaActual._id)
  if (ajuste._id) delete ajuste._id
  if (!clienteId) return res.status(400).json({ error: 'Falta el cliente' })
  try {
    if (!ajuste.fechaCreacion) ajuste.fechaCreacion = moment().toDate()
    if (ajuste.nivelCuenta) ajuste.nivelCuenta = parseInt(ajuste.nivelCuenta)
    const ajusteActualizado = await upsertItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'ajustes',
      filters: { tipo: ajuste.tipo },
      update: { $set: { ...ajuste } }
    })

    return res.status(200).json({ status: 'ajuste actualizado exitosamente', ajuste: ajusteActualizado })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de actualizar ajuste ${ajuste.tipo} ${e.message}` })
  }
}
