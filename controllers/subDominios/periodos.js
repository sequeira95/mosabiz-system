import moment from 'moment'
import { agreggateCollectionsSD, getItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'
import { statusOptionsPeriodos } from '../../constants.js'
import { cerrarPeriodo, preCierrePeriodo } from '../../utils/periodoFuctrions.js'

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
  if (!clienteId) return res.status(400).json({ error: 'El clienteId es requerido' })
  // if (periodo.status === statusOptionsPeriodos.preCierre && !periodo.periodoAnterior) return res.status(400).json({ error: 'El periodo anterior es requerido para efectuar un pre-cierre' })
  /* if (periodo.status === statusOptionsPeriodos.activo) {
    // validamos que solo exista un periodo activo
    const periodoActivo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { status: statusOptionsPeriodos.activo } })
    if (periodoActivo && periodoActivo._id !== periodo?._id) return res.status(400).json({ error: 'Solo puede existir un periodo activo' })
  } */
  console.log({ body: req.body })
  try {
    if (periodo.status === statusOptionsPeriodos.preCierre) {
      const verifyPeriodoActivo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { status: statusOptionsPeriodos.activo } })
      const newPeriodo = await upsertItemSD({
        nameCollection: 'periodos',
        enviromentClienteId: clienteId,
        filters: { periodoAnterior: new ObjectId(periodo.periodoAnterior._id) },
        update: {
          $set: {
            periodo: periodo.periodo ? periodo.periodo : `${periodo.fechaInicio.replace('/', '-')}/${periodo.fechaFin.replace('/', '-')}`,
            fechaInicio: moment(periodo.fechaInicio, 'YYYY/MM').toDate(),
            fechaFin: moment(periodo.fechaFin, 'YYYY/MM').toDate(),
            status: !verifyPeriodoActivo ? statusOptionsPeriodos.activo : periodo.status,
            activo: periodo.status === 'Activo' || periodo.status === 'Pre-cierre',
            // periodoAnterior: periodo.periodoAnterior?._id ? new ObjectId(periodo.periodoAnterior._id) : null,
            periodoAnteriorNombre: periodo.periodoAnterior?._id ? periodo.periodoAnterior.periodo : null
          }
        }
      })
      console.log({ newPeriodo })
      console.log('creear o actualizar el comprobante para el nuevo periodo de pre cierre')
      preCierrePeriodo({ clienteId, periodo: newPeriodo })
      return res.status(200).json({ status: 'Periodo guardado con exito', periodo: newPeriodo })
    }
    const newPeriodo = await upsertItemSD({
      nameCollection: 'periodos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(periodo._id) },
      update: {
        $set: {
          periodo: periodo.periodo ? periodo.periodo : `${periodo.fechaInicio.replace('/', '-')}/${periodo.fechaFin.replace('/', '-')}`,
          fechaInicio: moment(periodo.fechaInicio, 'YYYY/MM').startOf('month').toDate(),
          fechaFin: moment(periodo.fechaFin, 'YYYY/MM').endOf('month').toDate(),
          status: periodo.status,
          activo: periodo.status === 'Activo' || periodo.status === 'Pre-cierre',
          periodoAnterior: periodo.periodoAnterior?._id ? new ObjectId(periodo.periodoAnterior._id) : null,
          periodoAnteriorNombre: periodo.periodoAnterior?._id ? periodo.periodoAnterior.periodo : null
        }
      }
    })
    if (newPeriodo.status === statusOptionsPeriodos.cerrado) {
      console.log('creear o actualizar el comprobante para el nuevo periodo de cierre y tambien pre cierre')
      cerrarPeriodo({ clienteId, periodo: newPeriodo })
    }

    return res.status(200).json({ status: 'Periodo guardado con exito', periodo: newPeriodo })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar este periodo ' + e.message })
  }
}
