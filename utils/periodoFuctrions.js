import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, getItemSD } from './dataBaseConfing.js'
import moment from 'moment'

export async function preCierrePeriodo ({ clienteId, periodo }) {
  // verificamos si existe ya comprobante de pre cierre
  const comprobantePreCierre = await getItemSD({
    nameCollection: 'comprobantes',
    enviromentClienteId: clienteId,
    filters: {
      periodoId: new ObjectId(periodo._id),
      isPreCierre: true
    }
  })
  console.log({ comprobantePreCierre })
  let comprobanteId = comprobantePreCierre && comprobantePreCierre._id ? comprobantePreCierre[0]._id : null
  // en caso de que el comprobante no exista lo creamos
  if (!comprobanteId) {
    comprobanteId = (await createItemSD(
      {
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        item: {
          periodoId: new ObjectId(periodo._id),
          mesPeriodo: moment(periodo.fechaInicio).format('YYYY/MM'),
          codigo: '600',
          nombre: 'Pre-cierre',
          isBloqueado: true,
          isPreCierre: true,
          fechaCreacion: moment().toDate()
        }
      })).insertedId
  }
  console.log({ comprobanteId })
  // actualizamos el detalle en caso de que ya exista detalle y si no lo creamos, verificaremos por codigo de cuenta dado a que tiene que ser una fila por codigo
  // buscamos en el periodo anterior todos los movimientos para sacar el total si el saldo queda positivo el valor se coloca en el haber
  // si el saldo queda negativo el valor se coloca en el debe
  const detallePeriodoAnterior = await agreggateCollectionsSD({
    nameCollection: 'detallesComprobantes',
    enviromentClienteId: clienteId,
    pipeline: [
      {
        $match: {
          periodoId: new ObjectId(periodo.periodoAnterior)
        }
      },
      {
        $group: {
          _id: '$cuentaId',
          debe: { $sum: '$debe' },
          haber: { $sum: '$haber' },
          cuentaCodigo: { $first: '$cuentaCodigo' },
          cuentaNombre: { $first: '$cuentaNombre' }
        }
      },
      {
        $project: {
          cuentaId: '$_id',
          cuentaCodigo: '$cuentaCodigo',
          cuentaNombre: '$cuentaNombre',
          debe: '$debe',
          haber: '$haber',
          saldo: { $subtract: ['$debe', '$haber'] }
        }
      }
    ]
  })
  console.log({ detallePeriodoAnterior })
  const detalleSaldosIniciales = detallePeriodoAnterior.map(e => {
    return {
      updateOne: {
        filter: { cuentaId: new ObjectId(e.cuentaId), periodoId: new ObjectId(periodo._id), comprobanteId: new ObjectId(comprobanteId) },
        update: {
          $set:
          {
            cuentaId: new ObjectId(e.cuentaId),
            cuentaCodigo: e.cuentaCodigo,
            cuentaNombre: e.cuentaNombre,
            //  comprobanteId: new ObjectId(comprobanteId),
            // periodoId: new ObjectId(periodo._id),
            descripcion: `Saldo inicial ${e.cuentaNombre}`,
            fecha: moment().toDate(),
            debe: e.saldo < 0 ? parseFloat(e.saldo) : 0,
            haber: e.saldo > 0 ? parseFloat(e.saldo) : 0,
            isPreCierre: true,
            fechaCreacion: moment().toDate()
          }
        },
        upsert: true
      }
    }
  })
  if (detalleSaldosIniciales[0]) await await bulkWriteSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, pipeline: detalleSaldosIniciales })
  console.log({ detalleSaldosIniciales })
}
