import { momentDate } from './momentDate.js'
import { getItemSD, upsertItemSD, agreggateCollectionsSD, createManyItemsSD, createItemSD } from './dataBaseConfing.js'
/**
 * @param {object} options - Consulta del periodo
 * @param {string} options.clienteId - ID del cliente
 * @param {string=} options.periodoId - ID del periodo parseado por el ObjectId
 * @param {string=} options.isCierre - Busca si el periodo es cerrado o no
 * @param {string=} options.fecha - Fecha dentro del rango del periodo
 * @param {object=} options.query - Opciones adicionales de consulta en periodos
 */
export const checkPeriodo = async ({ clienteId, fecha, periodoId, isCierre, query } = { isCierre: false, query: {} }) => {
  if (!clienteId) return { status: false }
  if (!(fecha || periodoId)) return { status: false }
  const ajustesSistema = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })
  const timeZone = ajustesSistema?.timeZone
  const filters = {
    isCierre: { $ne: true },
    ...query
  }
  if (isCierre) {
    filters.isCierre = true
  }
  if (fecha) {
    filters.fechaInicio = { $lte: momentDate(timeZone, fecha).toDate() }
    filters.fechaFin = { $gte: momentDate(timeZone, fecha).toDate() }
  }
  if (periodoId) filters._id = periodoId
  const periodo = await getItemSD({
    nameCollection: 'periodos',
    enviromentClienteId: clienteId,
    filters
  })
  return { periodo, status: !!periodo }
}

/**
 * @param {string} clienteId - ID del cliente
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
  const ajustesSistema = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })
  const timeZone = ajustesSistema?.timeZone
  if (periodoId) queryPeriodo._id = periodoId
  else queryPeriodo.fecha = momentDate(timeZone, mesPeriodo, 'YYYY/MM').toDate()
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
        fechaCreacion: momentDate(timeZone).toDate()
      }
    }
  })
  return comprobante
}

/**
 * @param {string} clienteId - ID del cliente
 * @param {object | Array} movimientos - Objeto o arreglo de movimientos a crear
 */
export const createMovimientos = async ({
  clienteId,
  movimientos
}) => {
  if (!clienteId) throw new Error('No existe el cliente')
  if (!movimientos) throw new Error('No existe el movimiento')
  let result
  if (Array.isArray(movimientos)) {
    for (const movimiento of movimientos) {
      const { status } = await checkPeriodo({ clienteId, periodoId: movimiento.periodoId })
      if (!status) throw new Error('No se pueden crear movimientos en periodos cerrados')
    }
    result = await createManyItemsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      items: movimientos
    })
  } else {
    const { status } = await checkPeriodo({ clienteId, periodoId: movimientos.periodoId })
    if (!status) throw new Error('No se pueden crear movimientos en periodos cerrados')
    result = await createItemSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      item: movimientos
    })
  }
  return result
}
