import { momentDate } from './momentDate.js'

export const validarFechaDentroRago = (fecha, fechaInicio, timeZone) => {
  const fechaObj = momentDate(timeZone, fecha)
  const fechaInicioObj = momentDate(timeZone, fechaInicio).startOf('month')
  const fechaFinObj = momentDate(timeZone, fechaInicio).endOf('month')
  const isRango = fechaObj.isBetween(fechaInicioObj, fechaFinObj, null, '[]')
  // console.log({ fecha, fechaInicio, fechaInicioObj, fechaFinObj, isRango, timeZone, fecha2: momentDate(timeZone, fecha).toDate() })
  if (isRango) return momentDate(timeZone, fecha).toDate()
  // console.log({ fecha3: momentDate(timeZone, fechaInicio).startOf('month').toDate() })
  return momentDate(timeZone, fechaInicio).startOf('month').toDate()
}
