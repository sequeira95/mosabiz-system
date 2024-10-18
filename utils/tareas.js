import moment from 'moment'
// import { chromium } from 'playwright'
import { bulkWrite, getItem, upsertItem } from './dataBaseConfing.js'
import axios from 'axios'
import * as cheerio from 'cheerio'
import XLSX from 'xlsx'

export async function getValoresBcv () {
  console.log('Iniciando tarea de buscar las tasas diarias')
  // iniciamos el navegador
  const browser = await chromium.launch()

  // abrimos una nueva pagina en el navegador
  const page = await browser.newPage()

  // URL que queremos ir
  await page.goto('https://www.bcv.org.ve/', { timeout: 0 })
  // evaluamos la pagina y buscamos los datos de interes
  const data = await page.evaluate(() => {
    const dolar = document.querySelectorAll('#dolar')
    const valorDolar = [...dolar].map(dato => {
      const nombre = dato.querySelector('span').innerText
      const valor = dato.querySelector('strong').innerText
      return { nombre, valor }
    })
    const euro = document.querySelectorAll('#euro')
    const valorEuro = [...euro].map(dato => {
      const nombre = dato.querySelector('span').innerText
      const valor = dato.querySelector('strong').innerText
      return { nombre, valor }
    })
    const yuan = document.querySelectorAll('#yuan')
    const valorYuan = [...yuan].map(dato => {
      const nombre = dato.querySelector('span').innerText
      const valor = dato.querySelector('strong').innerText
      return { nombre, valor }
    })
    const lira = document.querySelectorAll('#lira')
    const valorLira = [...lira].map(dato => {
      const nombre = dato.querySelector('span').innerText
      const valor = dato.querySelector('strong').innerText
      return { nombre, valor }
    })
    const rublo = document.querySelectorAll('#rublo')
    const valorRublo = [...rublo].map(dato => {
      const nombre = dato.querySelector('span').innerText
      const valor = dato.querySelector('strong').innerText
      return { nombre, valor }
    })
    const fecha = document.querySelector('.date-display-single').innerText
    const tasas = [...valorDolar, ...valorEuro, ...valorYuan, ...valorLira, ...valorRublo, { nombre: 'fecha', valor: fecha }]
    return tasas
  })
  console.log({ data })
  // cerramos el navegador
  await browser.close()
  if (data && data[0]) {
    const valorTasas = {}
    for (const d of data) {
      if (d.nombre === 'fecha') {
        const fechaSplit = d.valor.split(' ')
        const month = {
          enero: '01',
          febrero: '02',
          marzo: '03',
          abril: '04',
          mayo: '05',
          junio: '06',
          julio: '07',
          agosto: '08',
          septiembre: '09',
          octubre: '10',
          noviembre: '11',
          diciembre: '12'
        }
        const fecha = `${fechaSplit[1]}/${month[fechaSplit[2].toLowerCase()]}/${fechaSplit[3]}`
        valorTasas.fecha = moment(fecha, 'DD/MM/YYYY').toDate()
      } else {
        valorTasas[d.nombre] = Number(d.valor.replace(',', '.'))
      }
    }
    console.log({ valorTasas })
    const monedaPrincipal = await getItem({ nameCollection: 'monedas', filters: { nombre: { $regex: 'bolivar', $options: 'si' } } })
    await upsertItem({
      nameCollection: 'tasas',
      filters: { fecha: valorTasas.fecha },
      update: {
        $set: {
          ...valorTasas,
          monedaPrincipal: monedaPrincipal._id
        }
      }
    })
  }
  console.log('Finalizando tarea de buscar las tasas diarias')
}
export async function getValoresBcvExcel () {
  console.log('Iniciando tarea de buscar las tasas diarias')
  try {
    // Iniciamos el navegador
    const url = 'https://www.bcv.org.ve/estadisticas/tipo-cambio-de-referencia-smc'
    let response
    try {
      response = await axios.get(url)
    } catch (error) {
      console.error('Error al acceder a la URL:', error.message)
      throw new Error('No se pudo acceder a la página del BCV.')
    }

    const html = response.data
    const $ = cheerio.load(html)

    // Buscar el enlace del archivo Excel
    const firstRow = $('.views-row-first')
    const diarioField = firstRow.find('.views-field-field-diario')
    const link = diarioField.find('span a').attr('href')

    if (!link) {
      console.error('No se encontró el enlace al archivo Excel.')
      throw new Error('Enlace al archivo Excel no encontrado.')
    }

    const fullLink = new URL(link, url).href
    console.log({ link, fullLink })

    // Descargar el archivo Excel
    let excelResponse
    try {
      excelResponse = await axios.get(fullLink, { responseType: 'arraybuffer' })
    } catch (error) {
      console.error('Error al descargar el archivo Excel:', error.message)
      throw new Error('No se pudo descargar el archivo Excel.')
    }

    // Procesar el archivo Excel
    let workbook
    try {
      workbook = XLSX.read(excelResponse.data, { type: 'buffer' })
    } catch (error) {
      console.error('Error al procesar el archivo Excel:', error.message)
      throw new Error('No se pudo procesar el archivo Excel.')
    }

    const tasas = []
    const monedas = new Set(['Bs'])

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName]
      const dataSheet = XLSX.utils.sheet_to_json(sheet, { range: 4, header: 'A' })
      const tasa = { monedaPrincipal: 'Bs', Bs: 1 }
      let DIsNumber = false
      let index = 0

      for (const row of dataSheet) {
        if (index === 0) {
          index++
          try {
            tasa.fechaOperacion = moment(row.B.replace('Fecha Operacion: ', ''), 'DD/MM/YYYY').toDate()
            tasa.fechaValor = moment(row.D.replace('Fecha Valor: ', ''), 'DD/MM/YYYY').toDate()
            tasa.fechaUpdate = row.D.replace('Fecha Valor: ', '')
          } catch (error) {
            console.error('Error al procesar las fechas:', error.message)
            throw new Error('Formato de fecha no válido en el archivo Excel.')
          }
          continue
        }

        index++
        if (typeof row.D === 'number') {
          DIsNumber = true
          tasa[row.B] = row.G
          monedas.add(row.B)
          continue
        }
        if (DIsNumber) break
      }
      tasas.push(tasa)
    }
    try {
      const monedasUpdate = []
      const bulkWritePipeline = tasas.map((e, index) => {
        const item = {}
        for (const moneda of monedas) {
          item[moneda] = e[moneda]
          item.monedaPrincipal = e.monedaPrincipal
          if (index === 0) {
            monedasUpdate.push({
              updateOne: {
                filter: { nombreCorto: moneda },
                update: {
                  $set: {}
                },
                upsert: true
              }
            })
          }
        }

        return {
          updateOne: {
            filter: { fechaUpdate: e.fechaUpdate },
            update: {
              $set: {
                ...item,
                fechaOperacion: moment(e.fechaOperacion).toDate(),
                fechaValor: moment(e.fechaValor).toDate()
              }
            },
            upsert: true
          }
        }
      })
      await bulkWrite({ nameCollection: 'tasas', pipeline: bulkWritePipeline })
      await bulkWrite({ nameCollection: 'monedas', pipeline: monedasUpdate })
    } catch (error) {
      console.error('Error al guardar las tasas:', error.message)
      throw new Error('Error en el momento de guardar las tasas.')
    }
    console.log('Finalizando tarea de buscar las tasas diarias')
    return tasas
  } catch (error) {
    console.error('Error en la función getValoresBcvExcel:', error.message)
    throw error // Lanzar el error para que el llamador de la función sepa que falló
  }
}
