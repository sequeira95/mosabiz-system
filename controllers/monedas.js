import { ObjectId } from 'mongodb'
import moment from 'moment'
import { agreggateCollections, deleteItem, getCollection, getItem, upsertItem, bulkWrite } from '../utils/dataBaseConfing.js'
import { getValoresBcvExcel } from '../utils/tareas.js'

export const getMonedas = async (req, res) => {
  try {
    const monedas = await getCollection({ nameCollection: 'monedas' })
    return res.status(200).json({ monedas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener las monedas ' + e.message })
  }
}
export const saveMoneda = async (req, res) => {
  const { nombre, nombreCorto, simbolo, _id } = req.body
  try {
    const verifyMoneda = await getItem({ nameCollection: 'monedas', filters: { nombreCorto } })
    if (!verifyMoneda) return res.status(400).json({ error: 'No existe una moneda con este nombre interno' })
    const moneda = await upsertItem({
      nameCollection: 'monedas',
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          nombre,
          simbolo
        }
      }
    })
    return res.status(200).json({ status: 'Moneda guardada con exito', moneda })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar esta moneda ' + e.message })
  }
}
export const deleteMoneda = async (req, res) => {
  const { _id } = req.body
  try {
    await deleteItem({ nameCollection: 'monedas', filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Moneda eliminada con exito' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar esta moneda ' + e.message })
  }
}
export const getTasas = async (req, res) => {
  const { itemsPorPagina, pagina } = req.body
  try {
    // await deleteItems({nameCollection: 'tasas'})
    // await deleteItems({nameCollection: 'monedas'})
    const tasas = await agreggateCollections({
      nameCollection: 'tasas',
      pipeline: [
        { $sort: { fechaValor: -1 } },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) }
      ]
    })
    const datosExtras = await agreggateCollections(
      {
        nameCollection: 'tasas',
        pipeline: [
          { $count: 'cantidad' }
        ]
      })
    return res.status(200).json({ tasas, cantidad: datosExtras[0]?.cantidad })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar tasas monetarias' + e.message })
  }
}
export const getTasasByMonth = async (req, res) => {
  const { date } = req.body
  const inicio = moment(date).startOf('month').toDate()
  const fin = moment(date).endOf('month').toDate()
  try {
    // await deleteItems({nameCollection: 'tasas'})
    // await deleteItems({nameCollection: 'monedas'})
    const tasas = await agreggateCollections({
      nameCollection: 'tasas',
      pipeline: [
        { $match: { fechaValor: { $gte: inicio, $lte: fin } } }
      ]
    })
    // busca la tasa de menor fecha mas proxima
    let [tasaDefault] = await agreggateCollections({
      nameCollection: 'tasas',
      pipeline: [
        { $match: { fechaValor: { $lte: inicio } } },
        { $sort: { fechaValor: -1 } },
        { $limit: 1 }
      ]
    })
    if (!tasaDefault) {
      // busca la tasa de mayor fecha mas proxima
      [tasaDefault] = await agreggateCollections({
        nameCollection: 'tasas',
        pipeline: [
          { $match: { fechaValor: { $gte: fin } } },
          { $sort: { fechaValor: 1 } },
          { $limit: 1 }
        ]
      })
    }
    tasas.push(tasaDefault)
    return res.status(200).json({ tasas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar tasas monetarias' + e.message })
  }
}
export const saveTasas = async (req, res) => {
  const { tasas, monedas } = req.body
  if (!monedas[0]) return res.status(500).json({ error: 'Error de servidor al momento de guardar: No Hay monedas para crear' })
  try {
    if (!Array.isArray(tasas)) return res.status(500).json({ error: 'Error de servidor al momento de guardar las Tasas: Formato invalido' })
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
    return res.status(200).json({ status: 'Tasas guardadas con exito' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar esta moneda ' + e.message })
  }
}
export const deleteTasa = async (req, res) => {
  const { tasaId } = req.body
  try {
    await deleteItem({ nameCollection: 'tasas', filters: { _id: new ObjectId(tasaId) } })
    return res.status(200).json({ status: 'Tasa eliminada con exito' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar esta Tasa ' + e.message })
  }
}
export const getTasaByDay = async (req, res) => {
  const { fechaDia } = req.body
  try {
    // console.log(fechaDia)
    let tasa = await getItem({ nameCollection: 'tasas', filters: { fechaUpdate: fechaDia } })
    if (!tasa) {
      const ultimaTasa = await agreggateCollections({
        nameCollection: 'tasas',
        pipeline: [
          { $sort: { fechaOperacion: -1 } },
          { $match: { fechaValor: { $lte: moment(fechaDia, 'DD/MM/YYYY').toDate() } } },
          { $limit: 1 }
        ]
      })
      tasa = ultimaTasa[0] ? ultimaTasa[0] : null
    }
    return res.status(200).json({ tasa })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar tasas monetarias' + e.message })
  }
}
export const scrapingTasas = async (req, res) => {
  try {
    // console.log(fechaDia)
    const tasas = await getValoresBcvExcel()
    console.log({ tasas })
    return res.status(200).json({ tasas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar tasas monetarias' + e.message })
  }
}
