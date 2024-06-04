import moment from 'moment'
import { agreggateCollectionsSD, formatCollectionName, getItemSD, upsertItemSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'
import { statusOptionsPeriodos, subDominioName } from '../../constants.js'
import { cerrarPeriodo, preCierrePeriodo } from '../../utils/periodoFuctrions.js'
import { validComprobantesDescuadre } from '../../utils/hasContabilidad.js'

export const getListPeriodo = async (req, res) => {
  const { clienteId } = req.body
  if (!clienteId) return res.status(400).json({ error: 'El clienteId es requerido' })
  try {
    const comprobantesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'comprobantes' })
    const detallesComprobantesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
    const periodos = await agreggateCollectionsSD({
      nameCollection: 'periodos',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $lookup: {
            from: comprobantesCollection,
            localField: '_id',
            foreignField: 'periodoId',
            pipeline: [
              { $match: { isPreCierre: { $eq: true } } },
              {
                $lookup: {
                  from: detallesComprobantesCollection,
                  localField: '_id',
                  foreignField: 'comprobanteId',
                  pipeline: [
                    { $limit: 1 }
                  ],
                  as: 'detalleComprobante'
                }
              },
              { $unwind: { path: '$detalleComprobante', preserveNullAndEmptyArrays: true } },
              { $project: { _id: 1, detalleComprobante: '$detalleComprobante._id' } }
            ],
            as: 'comprobantePreCierre'
          }
        },
        { $unwind: { path: '$comprobantePreCierre', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: comprobantesCollection,
            localField: '_id',
            foreignField: 'periodoId',
            pipeline: [
              { $match: { isCierre: { $eq: true } } },
              {
                $lookup: {
                  from: detallesComprobantesCollection,
                  localField: '_id',
                  foreignField: 'comprobanteId',
                  pipeline: [
                    { $limit: 1 }
                  ],
                  as: 'detalleComprobante'
                }
              },
              { $unwind: { path: '$detalleComprobante', preserveNullAndEmptyArrays: true } },
              { $project: { _id: 1, detalleComprobante: '$detalleComprobante._id' } }
            ],
            as: 'comprobanteCierre'
          }
        },
        { $unwind: { path: '$comprobanteCierre', preserveNullAndEmptyArrays: true } }
      ]
    })
    return res.status(200).json({ periodos })
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la lista de periodos' + e.message })
  }
}
export const savePeriodo = async (req, res) => {
  const { clienteId, periodo } = req.body
  if (periodo.status === statusOptionsPeriodos.preCierre) {
    const validComprobantes = await validComprobantesDescuadre({ clienteId, periodoId: periodo.periodoAnterior._id })
    if (validComprobantes && validComprobantes.message) {
      return res.status(500).json({ error: 'Error al momento de validar datos para el pre-cierre: ' + validComprobantes.message })
    }
  }
  if (periodo.status === statusOptionsPeriodos.cerrado) {
    const validComprobantes = await validComprobantesDescuadre({ clienteId, periodoId: periodo._id })
    if (validComprobantes && validComprobantes.message) {
      return res.status(500).json({ error: 'Error al momento de validar datos para el cierre: ' + validComprobantes.message })
    }
  }
  if (!clienteId) return res.status(400).json({ error: 'El clienteId es requerido' })
  const ajustesContables = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'contable' } })
  if (!ajustesContables.cuentaSuperAvitAcum || !ajustesContables.cuentaPerdidaAcum) return res.status(400).json({ error: 'Por favor seleccione cuentas contables para el resultado acumulado en los ajustes.' })
  // if (periodo.status === statusOptionsPeriodos.preCierre && !periodo.periodoAnterior) return res.status(400).json({ error: 'El periodo anterior es requerido para efectuar un pre-cierre' })
  /* if (periodo.status === statusOptionsPeriodos.activo) {
    // validamos que solo exista un periodo activo
    const periodoActivo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { status: statusOptionsPeriodos.activo } })
    if (periodoActivo && periodoActivo._id !== periodo?._id) return res.status(400).json({ error: 'Solo puede existir un periodo activo' })
  } */
  console.log({ body: req.body })
  try {
    if (periodo.status === statusOptionsPeriodos.preCierre) {
      console.log({ 1: periodo.status === statusOptionsPeriodos.preCierre })
      const verifyPeriodoActivo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { status: statusOptionsPeriodos.activo } })
      console.log({ verifyPeriodoActivo })
      const newPeriodo = await upsertItemSD({
        nameCollection: 'periodos',
        enviromentClienteId: clienteId,
        filters: { periodoAnterior: new ObjectId(periodo.periodoAnterior._id) },
        update: {
          $set: {
            // periodo: periodo.periodo ? periodo.periodo : `${periodo.fechaInicio.replace('/', '-')}/${periodo.fechaFin.replace('/', '-')}`,
            periodo: periodo.periodo,
            fechaInicio: moment(periodo.fechaInicio).toDate(),
            fechaFin: moment(periodo.fechaFin).toDate(),
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
          /* periodo: periodo.periodo ? periodo.periodo : `${periodo.fechaInicio.replace('/', '-')}/${periodo.fechaFin.replace('/', '-')}`,
          fechaInicio: moment(periodo.fechaInicio).startOf('month').toDate(),
          fechaFin: moment(periodo.fechaFin).endOf('month').toDate(), */
          status: periodo.status,
          activo: periodo.status === 'Activo' || periodo.status === 'Pre-cierre'
          /* periodoAnterior: periodo.periodoAnterior?._id ? new ObjectId(periodo.periodoAnterior._id) : null,
          periodoAnteriorNombre: periodo.periodoAnterior?._id ? periodo.periodoAnterior.periodo : null */
        }
      }
    })
    if (newPeriodo.status === statusOptionsPeriodos.cerrado) {
      console.log('creear o actualizar el comprobante para el nuevo periodo de cierre y tambien pre cierre')
      await cerrarPeriodo({ clienteId, periodo: newPeriodo })
      const verifyPeriodoAPreCierre = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { status: statusOptionsPeriodos.preCierre, periodoAnterior: newPeriodo._id } })
      if (!verifyPeriodoAPreCierre) {
        // const periodoFormat = `${moment(periodo.fechaInitNewPeriodo).format('YYYY-MM')}/${moment(periodo.fechaFinNewPeriodo).format('YYYY-MM')}`
        const preCierrePeriodo1 = await upsertItemSD({
          nameCollection: 'periodos',
          enviromentClienteId: clienteId,
          filters: { periodoAnterior: newPeriodo._id },
          update: {
            $set: {
              periodo: periodo.newPeriodoFormat,
              fechaInicio: moment(periodo.fechaInitNewPeriodo).toDate(),
              fechaFin: moment(periodo.fechaFinNewPeriodo).toDate(),
              status: 'Activo',
              activo: true,
              periodoAnterior: new ObjectId(newPeriodo._id),
              periodoAnteriorNombre: newPeriodo.periodo
            }
          }
        })
        preCierrePeriodo({ clienteId, periodo: preCierrePeriodo1 })
      } else {
        const preCierrePeriodo1 = await upsertItemSD({
          nameCollection: 'periodos',
          enviromentClienteId: clienteId,
          filters: { periodoAnterior: newPeriodo._id },
          update: {
            $set: {
              status: 'Activo',
              activo: true
            }
          }
        })
        preCierrePeriodo({ clienteId, periodo: preCierrePeriodo1 })
      }
    }

    return res.status(200).json({ status: 'Periodo guardado con exito', periodo: newPeriodo })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar este periodo ' + e.message })
  }
}
