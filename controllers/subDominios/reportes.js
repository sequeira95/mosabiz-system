import { agreggateCollectionsSD, formatCollectionName } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'
import { mayorAnaliticosAgrupado, mayorAnaliticosSinAgrupar, dataBalanceComprobacion } from '../../utils/reportes.js'
import moment from 'moment'
import { subDominioName } from '../../constants.js'

export const mayorAnalitico = async (req, res) => {
  const { fechaDesde, fechaHasta, order, clienteId, periodoId, cuentaSinMovimientos, ajusteFecha, agruparTerceros } = req.body
  try {
    console.log(req.body)
    if (agruparTerceros) {
      const { dataCuentas } = await mayorAnaliticosAgrupado({ fechaDesde, fechaHasta, order, clienteId, periodoId, cuentaSinMovimientos, ajusteFecha })
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
    const { dataCuentas } = await mayorAnaliticosSinAgrupar({ fechaDesde, fechaHasta, order, clienteId, periodoId, cuentaSinMovimientos, ajusteFecha })
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
    console.log(req.body)
    let matchLimitComprobantes = []
    const fechaInit = moment(comprobanteDesde?.mesPeriodo, 'YYYY/MM').startOf('month').toDate()
    const fechaEnd = moment(comprobanteHasta?.mesPeriodo, 'YYYY/MM').endOf('month').toDate()
    if (comprobanteDesde && !comprobanteHasta) {
      console.log(1)
      matchLimitComprobantes = [
        {
          $match: {
            codigoToInt: { $gte: Number(comprobanteDesde.codigo) },
            periodoMes: { $gte: fechaInit }
          }
        }]
    } else if (!comprobanteDesde && comprobanteHasta) {
      console.log(2)
      matchLimitComprobantes = [
        {
          $match: {
            codigoToInt: { $lte: Number(comprobanteHasta.codigo) },
            periodoMes: { $lte: fechaInit }
          }
        }]
    } else if (comprobanteDesde && comprobanteHasta) {
      console.log(3)
      matchLimitComprobantes = [
        {
          $match: {
            codigoToInt: { $gte: Number(comprobanteDesde.codigo), $lte: Number(comprobanteHasta.codigo) },
            periodoMes: { $gte: fechaInit, $lte: fechaEnd }
          }
        }]
    }
    const sort = order === 'documento' ? { $sort: { documento: 1 } } : { $sort: { fecha: 1 } }
    const detalleComprobanteCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
    const comprobantes = await agreggateCollectionsSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match:
          {
            periodoId: new ObjectId(periodoId)
          }
        },
        {
          $addFields: {
            codigoToInt: { $toInt: '$codigo' },
            periodoMes: { $concat: [{ $replaceAll: { input: '$mesPeriodo', find: '/', replacement: '-' } }, '-05'] }
          }
        },
        ...matchLimitComprobantes,
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'comprobanteId',
            pipeline: [
              sort,
              {
                $group: {
                  _id: '$comprobanteId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' },
                  dataCuenta: {
                    $push: {
                      periodoId: '$periodoId',
                      cuentaId: '$cuentaId',
                      fecha: '$fecha',
                      documento: '$docReferenciaAux',
                      descripcion: '$descripcion',
                      debe: '$debe',
                      haber: '$haber'
                    }
                  }
                }
              }
            ],
            as: 'detalleComprobantes'
          }
        }
      ]
    })
    return res.status(200).json({ comprobantes })
  } catch (e) {
    console.log(e)
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos de comprobantes ' + e.message })
  }
}
