import moment from 'moment'
import { agreggateCollectionsSD, bulkWriteSD, deleteItemSD, deleteManyItemsSD, getCollectionSD, getItemSD, updateItemSD } from '../../utils/dataBaseConfing.js'
import { nivelesCodigoByLength } from '../../constants.js'
import { ObjectId } from 'mongodb'
import { updateManyDetalleComprobante } from '../../utils/updateComprobanteForChangeCuenta.js'

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
/* export const saveCuenta = async (req, res) => {
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
          tipo: tipo.toLowerCase() !== 'grupo' ? 'Movimiento' : 'Grupo',
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
} */
export const saveCuentaToArray = async (req, res) => {
  const { clienteId, planCuenta } = req.body
  console.log({ paso: 'body', planCuenta })
  const planCuentaBulkWrite = []
  const planCuentaErrors = []
  const planCuentaValid = planCuenta.filter(cuenta => cuenta.codigo && cuenta.descripcion && cuenta.tipo).map(e => {
    const nivelCuenta = nivelesCodigoByLength[String(e.codigo).length]
    return {
      _id: e._id,
      codigo: String(e.codigo),
      descripcion: e.descripcion,
      conciliacion: e.conciliacion,
      nivelCuenta,
      tipo: e.tipo.toLowerCase() !== 'grupo' ? 'Movimiento' : 'Grupo'
    }
  })
  console.log({ paso: 'filtrando y ordenando data', planCuentaValid })
  try {
    const cuentasToVerification = planCuentaValid.filter(e => !e._id).map(i => String(i.codigo))
    const verifyCuentas = await getCollectionSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { codigo: { $in: cuentasToVerification } } })
    if (verifyCuentas && verifyCuentas[0]) {
      for (const c of verifyCuentas) {
        planCuentaErrors.push(`El codigo de cuenta ${c.codigo} - ${c.descripcion} ya se encuentra registrado`)
      }
      return res.status(400).json({ error: planCuentaErrors })
    }
    console.log({ paso: 'verificando cuentas', verifyCuentas })
  } catch (e) {
    console.log(e.message)
  }
  try {
    for (const cuenta of planCuentaValid) {
      if (!cuenta._id) {
        planCuentaBulkWrite.push({
          insertOne: {
            document: {
              ...cuenta,
              codigo: String(cuenta.codigo),
              fechaCreacion: moment().toDate()
            }
          }
        })
      } else {
        planCuentaBulkWrite.push({
          updateOne: {
            filter: { _id: new ObjectId(cuenta._id) },
            update: {
              $set: {
                codigo: String(cuenta.codigo),
                descripcion: cuenta.descripcion,
                conciliacion: cuenta.conciliacion,
                tipo: cuenta.tipo,
                nivelCuenta: cuenta.nivelCuenta
              }
            }
          }
        })
      }
    }
    console.log({ paso: 'preparando bulkWrite', planCuentaBulkWrite })
    await bulkWriteSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, pipeline: planCuentaBulkWrite })
    const planCuentaActualizado = await agreggateCollectionsSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      pipeline: [
        { $sort: { codigo: 1 } }
      ]
    })
    updateManyDetalleComprobante({ clienteId, plancuentas: planCuenta.filter(e => e._id) })
    return res.status(200).json({ status: 'Cuentas guardada exitosamente', planCuenta: planCuentaActualizado })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar esta cuenta' + e.message })
  }
}

export const deleteCuenta = async (req, res) => {
  const { cuentaId, clienteId } = req.body
  console.log(req.body)
  try {
    const deleteCuenta = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(cuentaId) } })
    await deleteItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(cuentaId) } })
    await deleteManyItemsSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { codigo: { $regex: `^${deleteCuenta.codigo}` } } })
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
              // codigo: String(e.codigo),
              descripcion: e.descripcion,
              conciliacion: e.conciliacion,
              tipo: e.tipo.toLowerCase() !== 'grupo' ? 'Movimiento' : 'Grupo',
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
export const saveCuentatoExcelNewNivel = async (req, res) => {
  const { cuentas, clienteId } = req.body
  try {
    const cuentasErros = []
    const planActual = await getCollectionSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId })
    for (const c of cuentas) {
      if (!c.codigoActual) continue
      const verifyCuenta = planActual.some(e => String(e.codigo) === String(c.codigoActual).replace(/[.|,]/g, ''))
      if (!verifyCuenta) {
        cuentasErros.push(`El codigo de cuenta ${c.codigoActual} no se encuentra registrado`)
      }
    }
    const bulkWrite = []
    const planCuentaUpdate = cuentas.filter(cuenta => cuenta.nuevoCodigo && cuenta.descripcion && cuenta.codigoActual /* && cuenta.tipo */).map(e => {
      const nivelCuenta = nivelesCodigoByLength[String(e.nuevoCodigo).replace(/[.|,]/g, '').length]
      const filterCodigo = String(e.codigoActual).replace(/[.|,]/g, '')
      const itemUpdate = {
        updateOne: {
          filter: { codigo: filterCodigo },
          update: {
            $set: {
              codigo: String(e.nuevoCodigo).replace(/[.|,]/g, ''),
              descripcion: e.descripcion,
              tipo: e.tipo.toLowerCase() !== 'grupo' ? 'Movimiento' : 'Grupo',
              nivelCuenta,
              fechaCreacion: moment().toDate()
            }
          },
          upsert: true
        }
      }
      return itemUpdate
    })
    bulkWrite.push(...planCuentaUpdate)
    const planCuentaCreate = cuentas.filter(cuenta => cuenta.nuevoCodigo && cuenta.descripcion && !cuenta.codigoActual /* && cuenta.tipo */).map(e => {
      const nivelCuenta = nivelesCodigoByLength[String(e.nuevoCodigo).replace(/[.|,]/g, '').length]
      const itemCreate = {
        insertOne: {
          document: {
            codigo: String(e.nuevoCodigo).replace(/[.|,]/g, ''),
            descripcion: e.descripcion,
            tipo: e.tipo.toLowerCase() !== 'grupo' ? 'Movimiento' : 'Grupo',
            nivelCuenta,
            fechaCreacion: moment().toDate()
          }
        }
      }
      return itemCreate
    })
    bulkWrite.push(...planCuentaCreate)
    await bulkWriteSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, pipeline: bulkWrite })
    updateManyDetalleComprobante({ clienteId })
    return res.status(200).json({ status: 'Cuentas guardada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de cargar datos del plan de cuenta' + e.message })
  }
}
export const addTerceroToCuenta = async (req, res) => {
  const { clienteId, cuenta, terceros } = req.body
  if (!clienteId) return res.status(400).json({ error: 'Seleccione un cliente' })
  try {
    const tercerosId = terceros.map(e => new ObjectId(e._id))
    const planCuenta = await updateItemSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(cuenta._id) },
      update: { $set: { terceros: tercerosId } }
    })
    return res.status(200).json({ status: 'Cuentas guardada exitosamente', cuenta: planCuenta })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de agregar terceros en esta cuenta' + e.message })
  }
}
