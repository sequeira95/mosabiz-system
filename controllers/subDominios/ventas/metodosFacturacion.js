import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, deleteItemSD, formatCollectionName, getCollectionSD, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { subDominioName } from '../../../constants.js'

export const getMetodosFacturacion = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina, metodosId } = req.body
  try {
    const contadoresNameCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'contadores' })
    const stageMatch = metodosId ? [{ $match: { _id: { $in: metodosId.map(id => new ObjectId(id)) } } }] : []
    const items = await agreggateCollectionsSD({
      nameCollection: 'metodosFacturacion',
      enviromentClienteId: clienteId,
      pipeline: [
        ...stageMatch,
        { $sort: { tipo: 1, fechaCreacion: 1 } },
        { $skip: ((pagina || 1) - 1) * (itemsPorPagina || 1000) },
        { $limit: itemsPorPagina || 1000 },
        {
          $lookup: {
            from: contadoresNameCol,
            localField: '_id',
            foreignField: 'metodoId',
            as: 'contadores'
          }
        },
      ]
    })
    return res.status(200).json({ items })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener los métodos de facturación' + e.message })
  }
}
export const setMetodosFacturacion = async (req, res) => {
  const {
    clienteId,
    _id,
    tipo,
    nombre,
    descripcion,
    serie,
    numeroControl,
  } = req.body
  try {
    if (!['maquina', 'serie'].includes(tipo)) throw new Error('EL tipo de facturación no es valido')
    if (tipo === 'maquina') {
      if (numeroControl.includes(' ')) throw new Error('EL Número Control es invalido, contiene espacios')
      const existeMaquina = await getItemSD({
        nameCollection: 'metodosFacturacion',
        enviromentClienteId: clienteId,
        filters: { numeroControl: { $regex: numeroControl, $options: 'xi' }, _id: { $ne: _id } }
      })
      if (existeMaquina) throw new Error(`EL Número Control ya existe en la maquina: ${existeMaquina.nombre}`)
    }
    if (tipo === 'serie') {
      const text = serie.replaceAll(' ', '\\s+')
      const existeSerie = await getItemSD({
        nameCollection: 'metodosFacturacion',
        enviromentClienteId: clienteId,
        filters: { serie: { $regex: text, $options: 'xi' }, _id: { $ne: new ObjectId(_id) } }
      })
      if (existeSerie) throw new Error(`La serie ya existe en la serie: ${existeSerie.nombre}`)
    }
    if (_id) {
      await updateItemSD({
        nameCollection: 'metodosFacturacion',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            nombre,
            descripcion,
            // no se editan
            // tipo,
            // serie: tipo === 'serie' ? serie : null,
            // numeroControl: tipo === 'maquina' ? numeroControl : null,
          }
        }
      })
    } else {
      await createItemSD({
        nameCollection: 'metodosFacturacion',
        enviromentClienteId: clienteId,
        item: {
          tipo,
          nombre,
          descripcion,
          serie: tipo === 'serie' ? serie : null,
          numeroControl: tipo === 'maquina' ? numeroControl : null,
          fechaCreacion: momentDate().toDate()
        }
      })
    }
    return res.status(200).json({ status: 'Método de facturación guardado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el método de facturación: ' + e.message })
  }
}
export const deleteMetodoFacturacion = async (req, res) => {
  const { clienteId, metodoId } = req.body
  try {
    await deleteItemSD({ nameCollection: 'metodosFacturacion', enviromentClienteId: clienteId, filters: { _id: new ObjectId(metodoId) } })
    return res.status(200).json({ status: 'Metodo eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar el método de facturación' + e.message })
  }
}

export const changeContador = async (req, res) => {
  const { clienteId, metodoId, value, type } = req.body
  try {
    await upsertItemSD({
      nameCollection: 'contadores',
      enviromentClienteId: clienteId,
      filters: { tipo: `venta-${type}`, metodoId: new ObjectId(metodoId) },
      update: { $set: { contador: Number(value) } }
    })
    return res.status(200).json({ status: 'Contador actualizado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de actualizar el contador' + e.message })
  }
}
