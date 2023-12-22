import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, getItemSD, updateItemSD } from './dataBaseConfing.js'
import moment from 'moment'
import { statusOptionsPeriodos } from '../constants.js'

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
  // console.log({ comprobantePreCierre })
  let comprobanteId = comprobantePreCierre && comprobantePreCierre._id ? comprobantePreCierre._id : null
  // en caso de que el comprobante no exista lo creamos
  if (!comprobanteId) {
    comprobanteId = (await createItemSD(
      {
        nameCollection: 'comprobantes',
        enviromentClienteId: clienteId,
        item: {
          periodoId: new ObjectId(periodo._id),
          mesPeriodo: moment(periodo.fechaInicio).format('YYYY/MM'),
          codigo: '99998',
          nombre: 'Pre-cierre',
          isBloqueado: true,
          isPreCierre: true,
          fechaCreacion: moment().toDate()
        }
      })).insertedId
  }
  // console.log({ comprobanteId })
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
          _id: {
            cuentaId: '$cuentaId',
            terceroId: '$terceroId'
          },
          debe: { $sum: '$debe' },
          haber: { $sum: '$haber' },
          cuentaCodigo: { $first: '$cuentaCodigo' },
          cuentaNombre: { $first: '$cuentaNombre' },
          terceroNombre: { $first: '$terceroNombre' }
        }
      },
      {
        $project: {
          cuentaId: '$_id.cuentaId',
          terceroId: '$_id.terceroId',
          cuentaCodigo: '$cuentaCodigo',
          cuentaNombre: '$cuentaNombre',
          debe: '$debe',
          haber: '$haber',
          saldo: { $subtract: ['$debe', '$haber'] },
          terceroNombre: '$terceroNombre'
        }
      }
    ]
  })
  let saldosAcumulados = 0
  const detalleSaldosIniciales = detallePeriodoAnterior.map(e => {
    saldosAcumulados += Number(e.cuentaCodigo[0]) >= 4 ? e.saldo : 0
    return {
      updateOne: {
        filter: { cuentaId: new ObjectId(e.cuentaId), periodoId: new ObjectId(periodo._id), comprobanteId: new ObjectId(comprobanteId), terceroId: e.terceroId ? new ObjectId(e.terceroId) : '' },
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
            debe: e.saldo < 0 && Number(e.cuentaCodigo[0]) < 4 ? Math.abs(parseFloat(e.saldo)) : 0,
            haber: e.saldo > 0 && Number(e.cuentaCodigo[0]) < 4 ? Math.abs(parseFloat(e.saldo)) : 0,
            terceroNombre: Number(e.cuentaCodigo[0]) < 4 ? e.terceroNombre : null,
            isPreCierre: true,
            fechaCreacion: moment().toDate()
          }
        },
        upsert: true
      }
    }
  })
  // console.log({ detallePeriodoAnterior })
  const ajustesContables = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'contable' } })
  if (saldosAcumulados > 0) {
    const cuenta = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(ajustesContables.cuentaSuperAvitAcum) } })
    if (cuenta && cuenta._id) {
      detalleSaldosIniciales.push({
        updateOne: {
          filter: { cuentaId: new ObjectId(cuenta._id), periodoId: new ObjectId(periodo._id), comprobanteId: new ObjectId(comprobanteId) },
          update: {
            $set:
            {
              // cuentaId: new ObjectId(cuenta.cuentaId),
              cuentaCodigo: cuenta.codigo,
              cuentaNombre: cuenta.descripcion,
              //  comprobanteId: new ObjectId(comprobanteId),
              // periodoId: new ObjectId(periodo._id),
              descripcion: `Saldo inicial ${cuenta.descripcion}`,
              fecha: moment().toDate(),
              debe: 0,
              haber: Math.abs(parseFloat(saldosAcumulados)),
              isPreCierre: true,
              fechaCreacion: moment().toDate()
            }
          },
          upsert: true
        }
      })
    }
  }
  if (saldosAcumulados < 0) {
    const cuenta = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(ajustesContables.cuentaPerdidaAcum) } })
    // console.log({ cuenta })
    if (cuenta && cuenta._id) {
      detalleSaldosIniciales.push({
        updateOne: {
          filter: { cuentaId: new ObjectId(cuenta._id), periodoId: new ObjectId(periodo._id), comprobanteId: new ObjectId(comprobanteId) },
          update: {
            $set:
            {
              // cuentaId: new ObjectId(cuenta.cuentaId),
              cuentaCodigo: cuenta.codigo,
              cuentaNombre: cuenta.descripcion,
              //  comprobanteId: new ObjectId(comprobanteId),
              // periodoId: new ObjectId(periodo._id),
              descripcion: `Saldo inicial ${cuenta.descripcion}`,
              fecha: moment().toDate(),
              debe: Math.abs(parseFloat(saldosAcumulados)),
              haber: 0,
              isPreCierre: true,
              fechaCreacion: moment().toDate()
            }
          },
          upsert: true
        }
      })
    }
  }
  if (detalleSaldosIniciales[0]) await bulkWriteSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, pipeline: detalleSaldosIniciales })
  // console.log({ detalleSaldosIniciales })
}
export async function cerrarPeriodo ({ clienteId, periodo }) {
  // creamos el comprobante de cierre
  const comprobante = (await createItemSD(
    {
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      item: {
        periodoId: new ObjectId(periodo._id),
        mesPeriodo: moment(periodo.fechaInicio).format('YYYY/MM'),
        codigo: '99999',
        nombre: 'Cierre',
        isBloqueado: true,
        isCierre: true,
        fechaCreacion: moment().toDate()
      }
    })).insertedId
  // actualizamos el detalle en caso de que ya exista detalle y si no lo creamos, verificaremos por codigo de cuenta dado a que tiene que ser una fila por codigo
  // buscamos en el periodo anterior todos los movimientos para sacar el total si el saldo queda positivo el valor se coloca en el haber
  // si el saldo queda negativo el valor se coloca en el debe
  const detallePeriodo = await agreggateCollectionsSD({
    nameCollection: 'detallesComprobantes',
    enviromentClienteId: clienteId,
    pipeline: [
      {
        $match: {
          periodoId: new ObjectId(periodo._id)
        }
      },
      {
        $group: {
          _id: {
            cuentaId: '$cuentaId',
            terceroId: '$terceroId'
          },
          debe: { $sum: '$debe' },
          haber: { $sum: '$haber' },
          cuentaCodigo: { $first: '$cuentaCodigo' },
          cuentaNombre: { $first: '$cuentaNombre' },
          terceroNombre: { $first: '$terceroNombre' }
        }
      },
      {
        $project: {
          cuentaId: '$_id.cuentaId',
          terceroId: '$_id.terceroId',
          cuentaCodigo: '$cuentaCodigo',
          cuentaNombre: '$cuentaNombre',
          terceroNombre: '$terceroNombre',
          debe: '$debe',
          haber: '$haber',
          saldo: { $subtract: ['$debe', '$haber'] }
        }
      }
    ]
  })
  let saldosAcumulados = 0
  const detalleSaldosCierre = detallePeriodo.map(e => {
    saldosAcumulados += Number(e.cuentaCodigo[0]) >= 4 ? e.saldo : 0
    return {
      updateOne: {
        filter: { cuentaId: new ObjectId(e.cuentaId), periodoId: new ObjectId(periodo._id), comprobanteId: new ObjectId(comprobante), terceroId: e.terceroId ? new ObjectId(e.terceroId) : '' },
        update: {
          $set:
          {
            cuentaId: new ObjectId(e.cuentaId),
            cuentaCodigo: e.cuentaCodigo,
            cuentaNombre: e.cuentaNombre,
            //  comprobanteId: new ObjectId(comprobanteId),
            // periodoId: new ObjectId(periodo._id),
            descripcion: `Saldo de cierre ${e.cuentaNombre}`,
            fecha: moment().toDate(),
            debe: e.saldo < 0 && Number(e.cuentaCodigo[0]) < 4 ? Math.abs(parseFloat(e.saldo)) : 0,
            haber: e.saldo > 0 && Number(e.cuentaCodigo[0]) < 4 ? Math.abs(parseFloat(e.saldo)) : 0,
            terceroNombre: Number(e.cuentaCodigo[0]) < 4 ? e.terceroNombre : null,
            isCierre: true,
            fechaCreacion: moment().toDate()
          }
        },
        upsert: true
      }
    }
  })
  const ajustesContables = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'contable' } })
  if (saldosAcumulados > 0) {
    const cuenta = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(ajustesContables.cuentaSuperAvitAcum) } })
    if (cuenta && cuenta._id) {
      detalleSaldosCierre.push({
        updateOne: {
          filter: { cuentaId: new ObjectId(cuenta._id), periodoId: new ObjectId(periodo._id), comprobanteId: new ObjectId(comprobante) },
          update: {
            $set:
            {
              // cuentaId: new ObjectId(cuenta._id),
              cuentaCodigo: cuenta.codigo,
              cuentaNombre: cuenta.descripcion,
              //  comprobanteId: new ObjectId(comprobanteId),
              // periodoId: new ObjectId(periodo._id),
              descripcion: `Saldo de cierre ${cuenta.descripcion}`,
              fecha: moment().toDate(),
              debe: 0,
              haber: Math.abs(parseFloat(saldosAcumulados)),
              isCierre: true,
              fechaCreacion: moment().toDate()
            }
          },
          upsert: true
        }
      })
    }
  }
  if (saldosAcumulados < 0) {
    const cuenta = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(ajustesContables.cuentaPerdidaAcum) } })
    if (cuenta && cuenta._id) {
      detalleSaldosCierre.push({
        updateOne: {
          filter: { cuentaId: new ObjectId(cuenta._id), periodoId: new ObjectId(periodo._id), comprobanteId: new ObjectId(comprobante) },
          update: {
            $set:
            {
              // cuentaId: new ObjectId(cuenta.cuentaId),
              cuentaCodigo: cuenta.codigo,
              cuentaNombre: cuenta.descripcion,
              //  comprobanteId: new ObjectId(comprobanteId),
              // periodoId: new ObjectId(periodo._id),
              descripcion: `Saldo de cierre ${cuenta.descripcion}`,
              fecha: moment().toDate(),
              debe: Math.abs(parseFloat(saldosAcumulados)),
              haber: 0,
              isCierre: true,
              fechaCreacion: moment().toDate()
            }
          },
          upsert: true
        }
      })
    }
  }
  if (detalleSaldosCierre[0]) await await bulkWriteSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, pipeline: detalleSaldosCierre })
  // actualizamos el periodo siguiente, le cambiamos el status por activo y actualizamos los saldos iniciales a los saldos de cierre
  const periodoPosterior = await updateItemSD({
    nameCollection: 'periodos',
    enviromentClienteId: clienteId,
    filters: { periodoAnterior: new ObjectId(periodo._id) },
    update: {
      $set: {
        status: statusOptionsPeriodos.activo
      }
    }
  })
  const comprobantePreCierre = await getItemSD({
    nameCollection: 'comprobantes',
    enviromentClienteId: clienteId,
    filters: { periodoId: new ObjectId(periodoPosterior._id), isPreCierre: true }
  })
  if (!comprobantePreCierre) return
  let saldosAcumuladosCierre = 0
  const detalleSaldosIniciales = detallePeriodo.map(e => {
    saldosAcumuladosCierre += Number(e.cuentaCodigo[0]) >= 4 ? e.saldo : 0
    return {
      updateOne: {
        filter: { cuentaId: new ObjectId(e.cuentaId), periodoId: new ObjectId(periodo._id), comprobanteId: new ObjectId(comprobantePreCierre._id), terceroId: e.terceroId ? new ObjectId(e.terceroId) : '' },
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
            debe: e.saldo < 0 && Number(e.cuentaCodigo[0]) < 4 ? Math.abs(parseFloat(e.saldo)) : 0,
            haber: e.saldo > 0 && Number(e.cuentaCodigo[0]) < 4 ? Math.abs(parseFloat(e.saldo)) : 0,
            terceroNombre: Number(e.cuentaCodigo[0]) < 4 ? e.terceroNombre : null,
            isPreCierre: true,
            fechaCreacion: moment().toDate()
          }
        },
        upsert: true
      }
    }
  })
  if (saldosAcumuladosCierre > 0) {
    const cuenta = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(ajustesContables.cuentaSuperAvitAcum) } })
    if (cuenta && cuenta._id) {
      detalleSaldosIniciales.push({
        updateOne: {
          filter: { cuentaId: new ObjectId(cuenta._id), periodoId: new ObjectId(periodo._id), comprobanteId: new ObjectId(comprobantePreCierre._id) },
          update: {
            $set:
            {
              // cuentaId: new ObjectId(cuenta.cuentaId),
              cuentaCodigo: cuenta.codigo,
              cuentaNombre: cuenta.descripcion,
              //  comprobanteId: new ObjectId(comprobanteId),
              // periodoId: new ObjectId(periodo._id),
              descripcion: `Saldo inicial ${cuenta.descripcion}`,
              fecha: moment().toDate(),
              debe: 0,
              haber: Math.abs(parseFloat(saldosAcumuladosCierre)),
              isPreCierre: true,
              fechaCreacion: moment().toDate()
            }
          },
          upsert: true
        }
      })
    }
  }
  if (saldosAcumuladosCierre < 0) {
    const cuenta = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(ajustesContables.cuentaPerdidaAcum) } })
    if (cuenta && cuenta._id) {
      detalleSaldosIniciales.push({
        updateOne: {
          filter: { cuentaId: new ObjectId(cuenta._id), periodoId: new ObjectId(periodo._id), comprobanteId: new ObjectId(comprobantePreCierre._id) },
          update: {
            $set:
            {
              // cuentaId: new ObjectId(cuenta.cuentaId),
              cuentaCodigo: cuenta.codigo,
              cuentaNombre: cuenta.descripcion,
              //  comprobanteId: new ObjectId(comprobanteId),
              // periodoId: new ObjectId(periodo._id),
              descripcion: `Saldo inicial ${cuenta.descripcion}`,
              fecha: moment().toDate(),
              debe: Math.abs(parseFloat(saldosAcumuladosCierre)),
              haber: 0,
              isPreCierre: true,
              fechaCreacion: moment().toDate()
            }
          },
          upsert: true
        }
      })
    }
  }
  if (detalleSaldosIniciales[0]) await await bulkWriteSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, pipeline: detalleSaldosIniciales })
}
