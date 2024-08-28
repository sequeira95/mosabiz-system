import { ObjectId } from 'mongodb'
import { agreggateCollections, deleteItem, getItem, updateItem, upsertItem } from '../utils/dataBaseConfing.js'
import moment from 'moment-timezone'

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
        { $skip: (Number(pagina || 1) - 1) * Number(itemsPorPagina || 1000) },
        { $limit: Number(itemsPorPagina || 1000) }
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
  const { _id, iva, descripcion, pais, isExento, isExonerado, isNoSujeto, SinDeretoCredito, nombreCorto, tipo } = req.body
  try {
    if (!_id) {
      const ivaSave = await upsertItem({
        nameCollection: 'iva',
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            iva: Number(iva),
            descripcion,
            pais,
            isExento,
            isExonerado,
            isNoSujeto,
            SinDeretoCredito,
            nombreCorto,
            tipo
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
          pais,
          isExento,
          isExonerado,
          isNoSujeto,
          SinDeretoCredito,
          nombreCorto,
          tipo
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
    const countIslr = await agreggateCollections({
      nameCollection: 'islr',
      pipeline: [
        { $match: matchConfig },
        { $count: 'total' }
      ]
    })
    console.log({ body: req.body, countIslr, islr })
    return res.status(200).json({ islr, countIslr: countIslr.length ? countIslr[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la liste del ISLR ' + e.message })
  }
}
export const saveIslr = async (req, res) => {
  const { _id, nombre, valorRet, codigo, tipoCalculo, sustraendo, minimo, pais, tipoRetencion, valorBaseImponible, valorUT } = req.body
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
            minimo: minimo ? Number(minimo) : 0,
            tipoRetencion,
            valorBaseImponible: Number(valorBaseImponible),
            valorUT: Number(valorUT)
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
          minimo: minimo ? Number(minimo) : 0,
          tipoRetencion,
          valorBaseImponible: Number(valorBaseImponible),
          valorUT: valorUT ? Number(valorUT) : 0
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
export const getRetIva = async (req, res) => {
  try {
    const { pais, itemsPorPagina, pagina } = req.body
    const matchConfig = {}
    if (pais) {
      matchConfig.pais = { $eq: pais }
    }
    const retIva = await agreggateCollections({
      nameCollection: 'retIva',
      pipeline: [
        { $match: matchConfig },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) }
      ]
    })
    const count = await agreggateCollections({
      nameCollection: 'retIva',
      pipeline: [
        { $match: matchConfig },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ retIva, count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la liste del I.V.A ' + e.message })
  }
}
export const saveRetIva = async (req, res) => {
  const { _id, descripcion, retIva, pais } = req.body
  try {
    if (!_id) {
      const retIvaSave = await upsertItem({
        nameCollection: 'retIva',
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            descripcion,
            pais,
            retIva: retIva ? Number(retIva) : 0
          }
        }
      })
      return res.status(200).json({ status: 'Retención de I.V.A guardada exitosamente', retIva: retIvaSave })
    }
    const retIvaSave = await updateItem({
      nameCollection: 'retIva',
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          descripcion,
          pais,
          retIva: retIva ? Number(retIva) : 0
        }
      }
    })
    return res.status(200).json({ status: 'Retención de I.V.A guardada exitosamente', retIva: retIvaSave })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar este retención de I.V.A' + e.message })
  }
}
export const deleteRetIva = async (req, res) => {
  const { _id } = req.body
  try {
    await deleteItem({ nameCollection: 'retIva', filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Retención de I.V.A eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar esta retención de I.V.A ' + e.message })
  }
}
export const getCiclos = async (req, res) => {
  try {
    const { pais, itemsPorPagina, pagina } = req.body
    const matchConfig = {}
    if (pais) {
      matchConfig.pais = { $eq: pais }
    }
    const ciclos = await agreggateCollections({
      nameCollection: 'ciclosImpuestos',
      pipeline: [
        { $match: matchConfig },
        { $skip: (Number(pagina) - 1) * Number(itemsPorPagina) },
        { $limit: Number(itemsPorPagina) }
      ]
    })
    const count = await agreggateCollections({
      nameCollection: 'ciclosImpuestos',
      pipeline: [
        { $match: matchConfig },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ ciclos, count: count.length ? count[0].total : 0 })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la liste del I.V.A ' + e.message })
  }
}
export const saveCiclos = async (req, res) => {
  const { _id, descripcion, fechaInicio, fechaFin, isFechaActual, pais, tipoCiclo, tipoImpuesto, isSujetoPasivoEspecial } = req.body
  console.log({ ciclo: req.body })
  try {
    if (isFechaActual) {
      const verifyCicloFechaActual = await getItem({
        nameCollection: 'ciclosImpuestos',
        filters: { pais, isFechaActual, tipoImpuesto, isSujetoPasivoEspecial }
      })
      console.log({ verifyCicloFechaActual })
      if (verifyCicloFechaActual && verifyCicloFechaActual._id.toString() !== _id.toString()) return res.status(400).json({ error: 'Ya existe un ciclo de impuestos hasta la fecha actual.' })
    }
    const verifyFechaIinit = await getItem({
      nameCollection: 'ciclosImpuestos',
      filters: { pais, fechaFin: { $gte: new Date(fechaInicio) }, tipoImpuesto, isSujetoPasivoEspecial }
    })
    console.log({ verifyFechaIinit })
    if (verifyFechaIinit && verifyFechaIinit._id.toString() !== _id.toString()) return res.status(400).json({ error: 'No puede crear un ciclo que la fecha de inicio sea menor o igual a la fecha final de otro ciclo.' })
    if (!_id) {
      const ciclo = await upsertItem({
        nameCollection: 'ciclosImpuestos',
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            descripcion,
            fechaInicio: moment(fechaInicio).toDate(),
            fechaFin: fechaFin ? moment(fechaFin).toDate() : null,
            isFechaActual,
            pais,
            tipoCiclo,
            tipoImpuesto,
            isSujetoPasivoEspecial
          }
        }
      })
      return res.status(200).json({ status: 'Ciclo de impuesto guardado exitosamente', ciclo })
    }
    const ciclo = await updateItem({
      nameCollection: 'ciclosImpuestos',
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          descripcion,
          fechaInicio: moment(fechaInicio).toDate(),
          fechaFin: fechaFin ? moment(fechaFin).toDate() : null,
          isFechaActual,
          pais,
          tipoCiclo,
          tipoImpuesto,
          isSujetoPasivoEspecial
        }
      }
    })
    return res.status(200).json({ status: 'Ciclo de impuesto guardado exitosamente', ciclo })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar este retención de I.V.A' + e.message })
  }
}
export const deleteCiclo = async (req, res) => {
  const { _id } = req.body
  try {
    await deleteItem({ nameCollection: 'ciclosImpuestos', filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Ciclo eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar este ciclo ' + e.message })
  }
}
