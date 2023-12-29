import moment from 'moment'
import { chromium } from 'playwright'
import { getItem, upsertItem } from './dataBaseConfing.js'

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
      filters: { fecha: moment(valorTasas.fecha) },
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
