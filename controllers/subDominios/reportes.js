import { agreggateCollectionsSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'
import { mayorAnaliticosAgrupado, mayorAnaliticosSinAgrupar, dataBalanceComprobacion, dataComprobantes, dataLibroDiario, dataLibroMayor, datosESF, datosER } from '../../utils/reportes.js'

export const mayorAnalitico = async (req, res) => {
  const { fechaDesde, fechaHasta, order, clienteId, periodoId, cuentaSinMovimientos, ajusteFecha, agruparTerceros, cuentaDesde, cuentaHasta } = req.body
  try {
    console.log(req.body)
    if (agruparTerceros) {
      const { dataCuentas } = await mayorAnaliticosAgrupado({ fechaDesde, fechaHasta, order, clienteId, periodoId, cuentaSinMovimientos, ajusteFecha, cuentaDesde, cuentaHasta })
      const listComprobante = await agreggateCollectionsSD({
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        pipeline: [
          {
            $match: {
              periodoId: new ObjectId(periodoId)
            }
          }
        ]
      })
      return res.status(200).json({ mayorAnalitico: dataCuentas, listComprobante })
    }
    const { dataCuentas } = await mayorAnaliticosSinAgrupar({ fechaDesde, fechaHasta, order, clienteId, periodoId, cuentaSinMovimientos, ajusteFecha, cuentaDesde, cuentaHasta })
    const listComprobante = await agreggateCollectionsSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            periodoId: new ObjectId(periodoId)
          }
        }
      ]
    })
    return res.status(200).json({ mayorAnalitico: dataCuentas, listComprobante })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos del mayor analitico' + e.message })
  }
}
export const balanceComprobacion = async (req, res) => {
  const { clienteId, periodoId, fecha, nivel, cuentaSinMovimientos } = req.body
  try {
    const { dataCuentas } = await dataBalanceComprobacion({ clienteId, periodoId, fecha, nivel, cuentaSinMovimientos })
    console.log(dataCuentas)
    return res.status(200).json({ balanceComprobacion: dataCuentas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos del balance de comprobación' + e.message })
  }
}
export const comprobantes = async (req, res) => {
  const { clienteId, periodoId, order, comprobanteDesde, comprobanteHasta } = req.body
  try {
    const { comprobantes } = await dataComprobantes({ clienteId, periodoId, order, comprobanteDesde, comprobanteHasta })
    return res.status(200).json({ comprobantes })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos de comprobantes ' + e.message })
  }
}
export const libroDiario = async (req, res) => {
  const { clienteId, periodoId, fecha, nivel, cuentaSinMovimientos } = req.body
  try {
    const { dataCuentas } = await dataLibroDiario({ clienteId, periodoId, fecha, nivel, cuentaSinMovimientos })
    return res.status(200).json({ libroDiario: dataCuentas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos del libro diario ' + e.message })
  }
}
export const libroMayor = async (req, res) => {
  const { clienteId, periodoId, fecha, nivel, cuentaSinMovimientos } = req.body
  try {
    const { dataCuentas } = await dataLibroMayor({ clienteId, periodoId, fecha, nivel, cuentaSinMovimientos })
    return res.status(200).json({ libroMayor: dataCuentas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos del libro mayor ' + e.message })
  }
}
export const estadoSituacionFinanciera = async (req, res) => {
  const { clienteId, periodoId, fecha, nivel, cuentaSinMovimientos } = req.body
  try {
    const { dataCuentas } = await datosESF({ clienteId, periodoId, fecha, nivel, cuentaSinMovimientos })
    return res.status(200).json({ ESF: dataCuentas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos del estado de situación financiera ' + e.message })
  }
}
export const estadoResultado = async (req, res) => {
  const { clienteId, periodoId, fechaDesde, fechaHasta, nivel, cuentaSinMovimientos, ajusteFecha } = req.body
  try {
    const { dataCuentas } = await datosER({ clienteId, periodoId, fechaDesde, fechaHasta, nivel, cuentaSinMovimientos, ajusteFecha })
    return res.status(200).json({ ER: dataCuentas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos del estado de situación financiera ' + e.message })
  }
}
