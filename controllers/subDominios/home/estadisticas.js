import { getDataEstadisticasComprasVentas, getDataEstadisticasTransacciones } from '../../../utils/estadisticasFuction.js'

export const getDataEstadisticas = async (req, res) => {
  const { clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone } = req.body
  try {
    const { dataCompraVentaMonths } = await getDataEstadisticasComprasVentas({ clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone })
    return res.status(200).json({ dataCompraVentaMonths })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos ' + e.message })
  }
}

export const getEstadisticasTransacciones = async (req, res) => {
  const { clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone } = req.body
  console.log(req.body)
  try {
    console.log('todo b54en')
    const { dataTransaccionesMonths, dataTransaccionesTotalYear } = await getDataEstadisticasTransacciones({ clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone })
    return res.status(200).json({ dataTransaccionesMonths, dataTransaccionesTotalYear })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos ' + e.message })
  }
}
