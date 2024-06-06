import moment from 'moment'
import { getItemSD, upsertItemSD, agreggateCollectionsSD } from './dataBaseConfing.js'
/**
 * @param {object} options - Consulta del periodo
 * @param {string} options.clienteId - ID del cliente parseado por el ObjectId
 * @param {string=} options.periodoId - ID del periodo parseado por el ObjectId
 * @param {string=} options.isCierre - Busca si el periodo es cerrado o no
 * @param {string=} options.fecha - Fecha dentro del rango del periodo
 * @param {object=} options.query - Opciones adicionales de consulta en periodos
 */
export const checkPeriodo = async ({ clienteId, fecha, periodoId, isCierre, query } = { isCierre: false, query: {} }) => {
  if (!clienteId) return { status: false }
  if (!(fecha || periodoId)) return { status: false }
  const filters = {
    isCierre: { $ne: true },
    ...query
  }
  if (isCierre) {
    filters.isCierre = true
  }
  if (fecha) {
    filters.fechaInicio = { $lte: moment(fecha).toDate() }
    filters.fechaFin = { $gte: moment(fecha).toDate() }
  }
  if (periodoId) filters.periodoId = periodoId

  const periodo = await getItemSD({
    nameCollection: 'periodos',
    enviromentClienteId: clienteId,
    filters
  })
  return { periodo, status: !!periodo }
}
/**
 * @param {string} clienteId - ID del cliente parseado por el ObjectId
 * @param {object} filters - Datos de consulta o para crear el comprobante
 * @param {string | object=} filters.periodoId - ID del periodo parseado por el ObjectId
 * @param {string | object=} filters.codigo - Codigo del comprobante
 * @param {string | object=} filters.mesPeriodo - Año y mes del comprobante YYYY/MM

 * @param {object=} createProps - Datos adicionales para agregar al comprobante que se crea
 * @param {string=} createProps.codigo - Codigo del comprobante
 * @param {string=} createProps.mesPeriodo - Año y mes del comprobante YYYY/MM
 * @param {boolean=} createIfUndefined - Crear el comprobate si no existe
 * - periodoId, mesPeriodo y codigo son obligatorios y deben ser
 * incluidos en filters o en createProps
 * - campos opcionales en filters o createProps:
 * - - nombre
 * - - isBloqueado
 */
export const getOrCreateComprobante = async (
  clienteId,
  filters = {},
  createProps = {},
  createIfUndefined = false
) => {
  if (!clienteId) throw new Error('No existe el cliente')
  let [comprobante] = await agreggateCollectionsSD({
    nameCollection: 'comprobantes',
    enviromentClienteId: clienteId,
    pipeline: [
      {
        $match: filters
      }
    ]
  })
  if (comprobante) return comprobante
  if (!createIfUndefined) throw new Error('No existe el comprobante')

  const codigo = filters.codigo || createProps.codigo
  if (!codigo) throw new Error('Debe ingresar un codigo de comprobante')

  const periodoId = filters.periodoId || createProps.periodoId
  const mesPeriodo = filters.mesPeriodo || createProps.mesPeriodo
  const mesPeriodoRegex = /^([0-9]{4})+\/+([0-9]{2})$/
  if (!mesPeriodo || (mesPeriodo && !mesPeriodoRegex.test(mesPeriodo))) throw new Error('Debe ingresar una fecha de comprobante')
  const hasPeriodo = !!periodoId || (mesPeriodo && mesPeriodoRegex.test(mesPeriodo))
  if (!hasPeriodo) throw new Error('Debe ingresar un periodo o fecha valido')

  const queryPeriodo = { clienteId, isCierre: false }
  if (periodoId) queryPeriodo._id = periodoId
  else queryPeriodo.fecha = moment(mesPeriodo, 'YYYY/MM').toDate()
  console.log(queryPeriodo)
  const { periodo, status } = await checkPeriodo(queryPeriodo)
  if (!status) throw new Error('No se encontró periodo o esta cerrado, para la fecha ingresada')

  comprobante = await upsertItemSD({
    nameCollection: 'comprobantes',
    enviromentClienteId: clienteId,
    filters: {
      ...filters, codigo, mesPeriodo, periodoId: periodo._id
    },
    update: {
      $set: {
        ...createProps,
        fechaCreacion: moment().toDate()
      }
    }
  })
  return comprobante
}
