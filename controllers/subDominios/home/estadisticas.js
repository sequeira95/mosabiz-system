import { getDataAntiguedadCuentas, getDataEstadisticasComprasVentas, getDataEstadisticasPosicionMonetaria, getDataEstadisticasTransacciones } from '../../../utils/estadisticasFuction.js'
import fetch from 'node-fetch'
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
  try {
    console.log('todo b54en')
    const { dataTransaccionesMonths, dataTransaccionesTotalYear } = await getDataEstadisticasTransacciones({ clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone })
    return res.status(200).json({ dataTransaccionesMonths, dataTransaccionesTotalYear })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos ' + e.message })
  }
}
export const getEstadisticasPosicionMonetaria = async (req, res) => {
  const { clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone, fechaACtual } = req.body
  try {
    const { dataDocumentos, rangosEjexString } = await getDataEstadisticasPosicionMonetaria({ clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone, fechaACtual })
    return res.status(200).json({ dataDocumentos, rangosEjexString })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos ' + e.message })
  }
}
export const getEstadisticasAntiguedadCuentas = async (req, res) => {
  const { clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone, fechaACtual } = req.body
  try {
    const { dataDocumentos } = await getDataAntiguedadCuentas({ clienteId, dateInitYear, dataEnd, dateInitLastSixMonth, timeZone, fechaACtual })
    return res.status(200).json({ dataDocumentos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos ' + e.message })
  }
}

export const prubaMetric = async (req, res) => {
  // Configurar las credenciales de MongoDB Atlas
  const auth = Buffer.from(`${'fhmgirth'}:${'351be8f4-36c1-420e-a2d7-e321c52a351d'}`).toString('base64')
  const projectId = '657a3bd3f01bfa13c47dc544'
  const clusterName = 'aibiz-cluster-db'
  // URL de la API de MongoDB Atlas
  const url = `https://cloud.mongodb.com/api/atlas/v1.0/groups/${projectId}/clusters/${clusterName}/processes/mongodb-queries`
  try {
    const startTime = '2024-10-01T00:00:00Z'
    const endTime = '2024-10-31T23:59:59Z'

    // Configurar los encabezados para la autenticación
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Basic ${auth}`
    }

    // Configurar los parámetros de la consulta
    const params = new URLSearchParams({
      granularity: 'PT1M', // Granularidad de 1 minuto
      period: 'PT1H', // Período de 1 hora
      start: startTime,
      end: endTime,
      metric: 'QUERY_EXECUTOR_TOTALS'
    })

    // Hacer la solicitud a la API de MongoDB Atlas
    const response = await fetch(`${url}?${params.toString()}`, {
      method: 'GET',
      headers
    })
    console.log(response, response?.urlList)
    if (response.ok) {
      const data = await response.json()
      // Procesar los datos según lo necesario para el frontend
      const formattedData = data.measurements.map(item => ({
        month: new Date(item.timestamp).getMonth() + 1,
        reads: item.readUnits,
        writes: item.writeUnits
      }))
      console.log({ formattedData })
      return res.json(formattedData)
    } else {
      return res.status(response.status).send(`Error: ${response.statusText}`)
    }
  } catch (err) {
    console.error(err)
    res.status(500).send('Error al obtener los datos de MongoDB Atlas')
  }
}
