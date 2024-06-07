import { ObjectId } from 'mongodb'
import { agreggateCollections, deleteItem, updateItem, upsertItem } from '../utils/dataBaseConfing.js'

export const getIva = async (req, res) => {
  try {
    const { pais, itemsPorPagina, pagina } = req.body
    const matchConfig = {}
    if (pais) {
      matchConfig.pais = { $eq: pais }
    }
    const iva = await agreggateCollections({
      nameCollection: 'iva',
      pipeline: [
        { $match: matchConfig },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) }
      ]
    })
    const countIva = await agreggateCollections({
      nameCollection: 'iva',
      pipeline: [
        { $match: matchConfig },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ iva, countIva: countIva.length ? countIva[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la liste del I.V.A ' + e.message })
  }
}
export const saveIva = async (req, res) => {
  const { _id, iva, descripcion, pais } = req.body
  try {
    if (!_id) {
      const ivaSave = await upsertItem({
        nameCollection: 'iva',
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            iva: Number(iva),
            descripcion,
            pais
          }
        }
      })
      return res.status(200).json({ status: 'I.V.A guardado exitosamente', iva: ivaSave })
    }
    const ivaSave = await updateItem({
      nameCollection: 'iva',
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          iva: Number(iva),
          descripcion,
          pais
        }
      }
    })
    return res.status(200).json({ status: 'I.V.A guardado exitosamente', iva: ivaSave })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar este I.V.A' + e.message })
  }
}
export const deleteIva = async (req, res) => {
  const { _id } = req.body
  try {
    await deleteItem({ nameCollection: 'iva', filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'I.V.A eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar este I.V.A ' + e.message })
  }
}
export const getIslr = async (req, res) => {
  try {
    const { pais, itemsPorPagina, pagina } = req.body
    console.log(req.body)
    const matchConfig = {}
    if (pais) {
      matchConfig.pais = { $eq: pais }
    }
    const islr = await agreggateCollections({
      nameCollection: 'islr',
      pipeline: [
        { $match: matchConfig },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) }
      ]
    })
    console.log({ islr })
    const countIslr = await agreggateCollections({
      nameCollection: 'islr',
      pipeline: [
        { $match: matchConfig },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ islr, countIslr: countIslr.length ? countIslr[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la liste del ISLR ' + e.message })
  }
}
export const saveIslr = async (req, res) => {
  const { _id, nombre, valorRet, codigo, tipoCalculo, sustraendo, minimo, pais } = req.body
  try {
    if (!_id) {
      const islrSave = await upsertItem({
        nameCollection: 'islr',
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            codigo,
            nombre,
            pais,
            valorRet: valorRet ? Number(valorRet) : 0,
            tipoCalculo,
            sustraendo: sustraendo ? Number(sustraendo) : 0,
            minimo: minimo ? Number(minimo) : 0
          }
        }
      })
      return res.status(200).json({ status: 'ISLR guardado exitosamente', islr: islrSave })
    }
    const islrSave = await updateItem({
      nameCollection: 'islr',
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          codigo,
          nombre,
          pais,
          valorRet: valorRet ? Number(valorRet) : 0,
          tipoCalculo,
          sustraendo: sustraendo ? Number(sustraendo) : 0,
          minimo: minimo ? Number(minimo) : 0
        }
      }
    })
    return res.status(200).json({ status: 'ISLR guardado exitosamente', islr: islrSave })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar este ISLR' + e.message })
  }
}
export const deleteIslr = async (req, res) => {
  const { _id } = req.body
  try {
    await deleteItem({ nameCollection: 'islr', filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'ISLR eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar este ISLR ' + e.message })
  }
}
