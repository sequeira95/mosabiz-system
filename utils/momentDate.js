import moment from 'moment-timezone'
/**
 * @param  {string=} timezone - Zona horaria de los ajustes del cliente,
 * Etc/UTC por defecto
 * @param  {...any} args - argumentos de la funcion: fecha, format, strict, formatOptonal
 * @param {string | Date} args.fecha - Fecha a parsear
 * @param {string=} args.format - Formato de la fecha
 * @param {boolean=} args.strict - Boolean para indicar que el formato es estricto
 * @param {boolean=} args.formatOptonal - Formato de la fecha opcional,
 * parsea la fecha y si no es valida, ingresa la fecha sin formato
 * @returns
 */
export const momentDate = (timezone = 'Etc/UTC', ...args) => {
  const timeZone = timezone

  const MomentDate = class {
    constructor (fecha, format, strict = false, formatOptonal = false) {
      this.fecha = moment.tz(fecha, format, strict, timeZone)
      if (formatOptonal && !this.isValid) {
        this.fecha = moment.tz(fecha, null, timeZone)
      }
    }

    get isValid () {
      return this.fecha.isValid()
    }

    toDate () {
      return this.fecha.toDate()
    }

    toDateUTC () {
      return moment(this.fecha).toDate()
    }

    year () {
      return this.fecha.year()
    }

    month () {
      return this.fecha.month()
    }

    date () {
      return this.fecha.date()
    }

    locale (...args) {
      return this.fecha.locale(...args)
    }

    format (mask) {
      this.fecha = this.fecha.format(mask)
      return this.fecha
    }

    add (...args) {
      this.fecha = this.fecha.add(...args)
      return this
    }

    subtract (...args) {
      this.fecha = this.fecha.subtract(...args)
      return this
    }

    startOf (type) {
      this.fecha = this.fecha.startOf(type)
      return this
    }

    endOf (type) {
      this.fecha = this.fecha.endOf(type)
      return this
    }

    set (...args) {
      this.fecha = this.fecha.set(...args)
      return this
    }

    diff (...args) {
      const diferencia = this.fecha.diff(...args)
      return diferencia
    }
  }
  return new MomentDate(...args)
}
