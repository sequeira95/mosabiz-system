import { getDataEstadisticasComprasVentas } from '../../../utils/estadisticasFuction.js'

export const getDataEstadisticas = async (req, res) => {
  const { clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone } = req.body
  console.log(req.body)
  try {
    console.log('todo bien')
    const { dataCompraVentaMonths, dataCompraVentaTotalYear } = await getDataEstadisticasComprasVentas({ clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone })
    return res.status(200).json({ dataCompraVentaMonths, dataCompraVentaTotalYear })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos ' + e.message })
  }
}
