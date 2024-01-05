import moment from 'moment'
import { agreggateCollectionsSD, formatCollectionName } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'
import { subDominioName } from '../../constants.js'

export const mayorAnalitico = async (req, res) => {
  const { fechaDesde, fechaHasta, order, clienteId, periodoId, cuentaSinMovimientos } = req.body
  try {
    console.log(req.body)
    const fechaInit = moment(fechaDesde, 'YYYY/MM/').startOf('month').toDate()
    const fechaEnd = moment(fechaHasta, 'YYYY/MM/').endOf('month').toDate()
    const sort = order === 'documento' ? { $sort: { documento: 1 } } : { $sort: { fecha: 1 } }
    const detalleComprobanteCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
    const dataCuentas = await agreggateCollectionsSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            tipo: 'Movimiento'
          }
        },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'cuentaId',
            pipeline: [
              {
                $match: {
                  periodoId: new ObjectId(periodoId),
                  fecha: { $gte: fechaInit, $lte: fechaEnd }
                }
              },
              sort,
              {
                $group: {
                  _id: '$cuentaId',
                  // cuentaNombre: { $first: '$cuentaNombre' },
                  // cuentaCodigo: { $first: '$cuentaCodigo' },
                  dataCuenta: {
                    $push: {
                      periodoId: '$periodoId',
                      cuentaId: '$cuentaId',
                      fecha: '$fecha',
                      comprobanteId: '$comprobanteId',
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
        },
        { $unwind: { path: '$detalleComprobantes', preserveNullAndEmptyArrays: cuentaSinMovimientos } },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'cuentaId',
            pipeline: [
              {
                $match: {
                  periodoId: new ObjectId(periodoId),
                  fecha: { $lt: fechaInit }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' },
                  fecha: { $first: '$fecha' }
                }
              }
            ],
            as: 'detalle'
          }
        },
        { $unwind: { path: '$detalle', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            cuentaNombre: '$descripcion',
            cuentaCodigo: '$codigo',
            saldo: { $subtract: ['$detalle.debe', '$detalle.haber'] },
            dataCuenta: '$detalleComprobantes.dataCuenta'
          }
        },
        { $sort: { cuentaCodigo: 1 } }
      ]
    })
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

/* export const mayorAnalitico = async (req, res) => {
  const { fechaDesde, fechaHasta, order, clienteId, periodoId } = req.body
  try {
    console.log(req.body)
    const fechaInit = moment(fechaDesde, 'YYYY/MM/DD').startOf('day').toDate()
    const fechaEnd = moment(fechaHasta, 'YYYY/MM/DD').endOf('day').toDate()
    const sort = order === 'documento' ? { $sort: { documento: 1 } } : { $sort: { fecha: 1 } }
    const detalleComprobanteCollectionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
    const dataMayor = await agreggateCollectionsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match:
          {
            fecha: { $gte: fechaInit, $lte: fechaEnd },
            periodoId: new ObjectId(periodoId)
          }
        },
        sort,
        {
          $group: {
            _id: '$cuentaId',
            cuentaNombre: { $first: '$cuentaNombre' },
            cuentaCodigo: { $first: '$cuentaCodigo' },
            dataCuenta: {
              $push: {
                periodoId: '$periodoId',
                cuentaId: '$cuentaId',
                fecha: '$fecha',
                comprobanteId: '$comprobanteId',
                documento: '$docReferenciaAux',
                descripcion: '$descripcion',
                debe: '$debe',
                haber: '$haber'
              }
            }
          }
        },
        {
          $lookup: {
            from: detalleComprobanteCollectionName,
            localField: '_id',
            foreignField: 'cuentaId',
            pipeline: [
              {
                $match: {
                  periodoId: new ObjectId(periodoId),
                  fecha: { $lt: fechaInit }
                }
              },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' },
                  fecha: { $first: '$fecha' }
                }
              }
            ],
            as: 'detalle'
          }
        },
        { $unwind: { path: '$detalle', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            cuentaNombre: 1,
            cuentaCodigo: 1,
            saldo: { $subtract: ['$detalle.debe', '$detalle.haber'] },
            dataCuenta: 1
          }
        },
        { $sort: { cuentaCodigo: 1 } }
      ]
    })
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
    return res.status(200).json({ mayorAnalitico: dataMayor, listComprobante })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar datos del mayor analitico' + e.message })
  }
} */
