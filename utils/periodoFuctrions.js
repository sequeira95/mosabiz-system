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
  let saldosAcumulados = 0
  const detalleSaldosIniciales = detallePeriodoAnterior.map(e => {
    saldosAcumulados += Number(e.cuentaCodigo[0]) >= 4 ? e.saldo : 0
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
            debe: e.saldo < 0 && Number(e.cuentaCodigo[0]) < 4 ? parseFloat(e.saldo) : 0,
            haber: e.saldo > 0 && Number(e.cuentaCodigo[0]) < 4 ? parseFloat(e.saldo) : 0,
            isPreCierre: true,
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
    detalleSaldosIniciales.push({
      updateOne: {
        filter: { cuentaId: new ObjectId(cuenta.cuentaId), periodoId: new ObjectId(periodo._id), comprobanteId: new ObjectId(comprobanteId) },
        update: {
          $set:
          {
            cuentaId: new ObjectId(cuenta.cuentaId),
            cuentaCodigo: cuenta.cuentaCodigo,
            cuentaNombre: cuenta.cuentaNombre,
            //  comprobanteId: new ObjectId(comprobanteId),
            // periodoId: new ObjectId(periodo._id),
            descripcion: `Saldo inicial ${cuenta.cuentaNombre}`,
            fecha: moment().toDate(),
            debe: 0,
            haber: saldosAcumulados,
            isCierre: true,
            fechaCreacion: moment().toDate()
          }
        },
        upsert: true
      }
    })
  }
  if (saldosAcumulados < 0) {
    const cuenta = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(ajustesContables.cuentaPerdidaAcum) } })
    detalleSaldosIniciales.push({
      updateOne: {
        filter: { cuentaId: new ObjectId(cuenta.cuentaId), periodoId: new ObjectId(periodo._id), comprobanteId: new ObjectId(comprobanteId) },
        update: {
          $set:
          {
            cuentaId: new ObjectId(cuenta.cuentaId),
            cuentaCodigo: cuenta.cuentaCodigo,
            cuentaNombre: cuenta.cuentaNombre,
            //  comprobanteId: new ObjectId(comprobanteId),
            // periodoId: new ObjectId(periodo._id),
            descripcion: `Saldo inicial ${cuenta.cuentaNombre}`,
            fecha: moment().toDate(),
            debe: saldosAcumulados,
            haber: 0,
            isCierre: true,
            fechaCreacion: moment().toDate()
          }
        },
        upsert: true
      }
    })
  }
  if (detalleSaldosIniciales[0]) await await bulkWriteSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, pipeline: detalleSaldosIniciales })
  console.log({ detalleSaldosIniciales })
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
        codigo: '999',
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
  let saldosAcumulados = 0
  const detalleSaldosCierre = detallePeriodo.map(e => {
    saldosAcumulados += Number(e.cuentaCodigo[0]) >= 4 ? e.saldo : 0
    return {
      updateOne: {
        filter: { cuentaId: new ObjectId(e.cuentaId), periodoId: new ObjectId(periodo._id), comprobanteId: new ObjectId(comprobante) },
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
    detalleSaldosCierre.push({
      updateOne: {
        filter: { cuentaId: new ObjectId(cuenta.cuentaId), periodoId: new ObjectId(periodo._id), comprobanteId: new ObjectId(comprobante) },
        update: {
          $set:
          {
            cuentaId: new ObjectId(cuenta.cuentaId),
            cuentaCodigo: cuenta.cuentaCodigo,
            cuentaNombre: cuenta.cuentaNombre,
            //  comprobanteId: new ObjectId(comprobanteId),
            // periodoId: new ObjectId(periodo._id),
            descripcion: `Saldo de cierre ${cuenta.cuentaNombre}`,
            fecha: moment().toDate(),
            debe: 0,
            haber: saldosAcumulados,
            isCierre: true,
            fechaCreacion: moment().toDate()
          }
        },
        upsert: true
      }
    })
  }
  if (saldosAcumulados < 0) {
    const cuenta = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(ajustesContables.cuentaPerdidaAcum) } })
    detalleSaldosCierre.push({
      updateOne: {
        filter: { cuentaId: new ObjectId(cuenta.cuentaId), periodoId: new ObjectId(periodo._id), comprobanteId: new ObjectId(comprobante) },
        update: {
          $set:
          {
            cuentaId: new ObjectId(cuenta.cuentaId),
            cuentaCodigo: cuenta.cuentaCodigo,
            cuentaNombre: cuenta.cuentaNombre,
            //  comprobanteId: new ObjectId(comprobanteId),
            // periodoId: new ObjectId(periodo._id),
            descripcion: `Saldo de cierre ${cuenta.cuentaNombre}`,
            fecha: moment().toDate(),
            debe: saldosAcumulados,
            haber: 0,
            isCierre: true,
            fechaCreacion: moment().toDate()
          }
        },
        upsert: true
      }
    })
  }
  if (detalleSaldosCierre[0]) await await bulkWriteSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, pipeline: detalleSaldosCierre })
  // actualizamos el periodo siguiente, le cambiamos el status por activo y actualizamos los saldos iniciales a los saldos de cierre
  // const verifyPeriodo = await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { periodoAnterior: new ObjectId(periodo._id) } })
  // let periodoPosterior = null
  // let comprobantePreCierre = null
  /* if (!verifyPeriodo) {
    const fechaInitNewPeriodo = moment(periodo.fechaFin).add(1, 'months').format('YYYY/MM')
    const fechaFinNewPeriodo = moment(fechaInitNewPeriodo, 'YYYY/MM').add(11, 'months').format('YYYY/MM')
    periodoPosterior = (await createItemSD({
      nameCollection: 'periodos',
      enviromentClienteId: clienteId,
      item: {
        activo: true,
        fechaFin: moment(fechaFinNewPeriodo, 'YYYY/MM').toDate(),
        fechaInicio: moment(fechaInitNewPeriodo, 'YYYY/MM').toDate(),
        periodo: `${fechaInitNewPeriodo.replace('/', '-')}/${fechaFinNewPeriodo.replace('/', '-')}`,
        periodoAnterior: periodo._id ? new ObjectId(periodo._id) : null,
        periodoAnteriorNombre: periodo._id ? periodo.periodo : null,
        status: statusOptionsPeriodos.activo
      }
    })).insertedId
    comprobantePreCierre = await createItemSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      item: {
        periodoId: new ObjectId(periodoPosterior),
        mesPeriodo: fechaInitNewPeriodo,
        codigo: '600',
        nombre: 'Pre-cierre',
        isBloqueado: true,
        isCierre: true,
        fechaCreacion: moment().toDate()
      }
    })
  } else { */
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
  // }
  if (!comprobantePreCierre) return
  let saldosAcumuladosCierre = 0
  const detalleSaldosIniciales = detallePeriodo.map(e => {
    saldosAcumuladosCierre += Number(e.cuentaCodigo[0]) >= 4 ? e.saldo : 0
    return {
      updateOne: {
        filter: { cuentaId: new ObjectId(e.cuentaId), periodoId: new ObjectId(periodoPosterior._id), comprobanteId: new ObjectId(comprobantePreCierre._id) },
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
    detalleSaldosIniciales.push({
      updateOne: {
        filter: { cuentaId: new ObjectId(cuenta.cuentaId), periodoId: new ObjectId(periodoPosterior._id), comprobanteId: new ObjectId(comprobantePreCierre._id) },
        update: {
          $set:
          {
            cuentaId: new ObjectId(cuenta.cuentaId),
            cuentaCodigo: cuenta.cuentaCodigo,
            cuentaNombre: cuenta.cuentaNombre,
            //  comprobanteId: new ObjectId(comprobanteId),
            // periodoId: new ObjectId(periodo._id),
            descripcion: `Saldo inicial ${cuenta.cuentaNombre}`,
            fecha: moment().toDate(),
            debe: 0,
            haber: saldosAcumuladosCierre,
            isPreCierre: true,
            fechaCreacion: moment().toDate()
          }
        },
        upsert: true
      }
    })
  }
  if (saldosAcumuladosCierre < 0) {
    const cuenta = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(ajustesContables.cuentaPerdidaAcum) } })
    detalleSaldosIniciales.push({
      updateOne: {
        filter: { cuentaId: new ObjectId(cuenta.cuentaId), periodoId: new ObjectId(periodoPosterior._id), comprobanteId: new ObjectId(comprobantePreCierre._id) },
        update: {
          $set:
          {
            cuentaId: new ObjectId(cuenta.cuentaId),
            cuentaCodigo: cuenta.cuentaCodigo,
            cuentaNombre: cuenta.cuentaNombre,
            //  comprobanteId: new ObjectId(comprobanteId),
            // periodoId: new ObjectId(periodo._id),
            descripcion: `Saldo inicial ${cuenta.cuentaNombre}`,
            fecha: moment().toDate(),
            debe: saldosAcumuladosCierre,
            haber: 0,
            isPreCierre: true,
            fechaCreacion: moment().toDate()
          }
        },
        upsert: true
      }
    })
  }
  if (detalleSaldosIniciales[0]) await await bulkWriteSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, pipeline: detalleSaldosIniciales })
}
