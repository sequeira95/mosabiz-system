import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, createItemSD, deleteItemSD, formatCollectionName, getItemSD, updateItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment'
import { uploadImg } from '../../utils/cloudImage.js'
import { keyActivosFijos, subDominioName } from '../../constants.js'

export const getActivosFijos = async (req, res) => {
  const { clienteId } = req.body
  try {
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const zonasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonas' })
    const activos = await agreggateCollectionsSD({
      nameCollection: 'activosFijos',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $lookup: {
            from: categoriasCollection,
            localField: 'categoria',
            foreignField: '_id',
            as: 'detalleCategoria'
          }
        },
        { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: zonasCollection,
            localField: 'zona',
            foreignField: '_id',
            as: 'detalleZona'
          }
        },
        { $unwind: { path: '$detalleZona', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$tipo',
            tangibles: {
              $push: {
                $cond: {
                  if: { $eq: ['$tipo', 'Tangibles'] },
                  then: {
                    _id: '$_id',
                    codigo: '$codigo',
                    nombre: '$nombre',
                    descripcion: '$descripcion',
                    tipo: '$tipo',
                    unidad: '$unidad',
                    cantidad: '$cantidad',
                    zonaId: '$zona',
                    zona: '$detalleZona.nombre',
                    categoriaId: '$categoria',
                    categoria: '$detalleCategoria.nombre',
                    fechaAdquisicion: '$fechaAdquisicion',
                    vidaUtil: '$vidaUtil',
                    montoAdquision: '$montoAdquision',
                    observacion: '$observacion',
                    documentosAdjuntos: '$documentosAdjuntos'
                  },
                  else: null
                }
              }
            },
            intangibles: {
              $push: {
                $cond: {
                  if: { $eq: ['$tipo', 'Intangibles'] },
                  then: {
                    _id: '$_id',
                    codigo: '$codigo',
                    nombre: '$nombre',
                    descripcion: '$descripcion',
                    tipo: '$tipo',
                    unidad: '$unidad',
                    cantidad: '$cantidad',
                    categoriaId: '$categoria',
                    categoria: '$detalleCategoria.nombre',
                    fechaAdquisicion: '$fechaAdquisicion',
                    vidaUtil: '$vidaUtil',
                    montoAdquision: '$montoAdquision',
                    observacion: '$observacion',
                    documentosAdjuntos: '$documentosAdjuntos'
                  },
                  else: null
                }
              }
            }
          }
        },
        {
          $project: {
            _id: 0,
            tangibles: 1,
            intangibles: 1
          }
        }
      ]
    })
    return res.status(200).json({ activos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtner datos de los activo fijos' + e.message })
  }
}
export const createActivoFijo = async (req, res) => {
  const { codigo, nombre, descripcion, tipo, unidad, cantidad, categoria, zona, fechaAdquisicion, vidaUtil, montoAdquision, observacion, clienteId } = req.body
  const { documentos } = req.files
  try {
    const documentosAdjuntos = []
    if (documentos) {
      for (const documento of documentos) {
        const extension = documento.mimetype.split('/')[1]
        const namePath = `${documento.name}`
        const resDoc = await uploadImg(documento.data, namePath)
        documentosAdjuntos.push(
          {
            path: resDoc.filePath,
            name: resDoc.name,
            url: resDoc.url,
            type: extension,
            fileId: resDoc.fileId
          })
      }
    }
    // const ajuste = (await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })).dateFormat
    const newActivo = await createItemSD({
      nameCollection: 'activosFijos',
      enviromentClienteId: clienteId,
      item: {
        codigo,
        nombre,
        descripcion,
        tipo,
        unidad,
        cantidad: Number(cantidad),
        categoria: new ObjectId(categoria),
        zona: new ObjectId(zona),
        fechaAdquisicion: moment(fechaAdquisicion).toDate(),
        vidaUtil: Number(vidaUtil),
        montoAdquision: Number(montoAdquision),
        observacion,
        documentosAdjuntos
      }
    })
    await createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        tipo: 'Activo fijo',
        fecha: moment().toDate(),
        descripcion: `Creo el activo: ${codigo} - ${nombre}`,
        creadoPor: new ObjectId(req.uid)
      }
    })
    const activo = await getItemSD({ nameCollection: 'activosFijos', enviromentClienteId: clienteId, filters: { _id: newActivo.insertedId } })
    return res.status(200).json({ status: 'Activo guardado exitosamente', activo })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el activo' + e.message })
  }
}
export const editActivoFijo = async (req, res) => {
  const { _id, codigo, nombre, descripcion, tipo, unidad, cantidad, categoria, zona, fechaAdquisicion, vidaUtil, clienteId } = req.body
  try {
    console.log({ zona })
    // const ajuste = (await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })).dateFormat
    const activoPreUpdate = await getItemSD({ nameCollection: 'activosFijos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    const activo = await updateItemSD({
      nameCollection: 'activosFijos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          codigo,
          nombre,
          descripcion,
          tipo,
          unidad,
          cantidad: Number(cantidad),
          categoria: new ObjectId(categoria),
          zona: new ObjectId(zona),
          fechaAdquisicion: moment(fechaAdquisicion).toDate(),
          vidaUtil: Number(vidaUtil)
        }
      }
    })
    const descripcionUpdate = []
    for (const [key, value] of Object.entries(activo)) {
      const originalValue = activoPreUpdate[key]
      if (originalValue !== value) {
        console.log({ tipo: 'if', originalValue, value })
        if (key === 'zona') {
          const equalsId = ObjectId.equals(originalValue, value)
          if (equalsId) continue
          descripcionUpdate.push({ campo: keyActivosFijos[key], antes: originalValue, despues: value })
        }
        if (key === 'categoria') {
          const equalsId = ObjectId.equals(originalValue, value)
          if (equalsId) continue
          descripcionUpdate.push({ campo: keyActivosFijos[key], antes: originalValue, despues: value })
          continue
        }
        if (key === '_id') continue
        if (key === 'documentosAdjuntos') continue
        if (key === 'fechaAdquisicion') {
          const fecha1 = moment(originalValue).format('DD/MM/YYYY')
          const fecha2 = moment(value).format('DD/MM/YYYY')
          if (fecha1 === fecha2) continue
          descripcionUpdate.push({ campo: keyActivosFijos[key], antes: moment(originalValue).toDate(), despues: moment(value).toDate() })
          continue
        }
        descripcionUpdate.push({ campo: keyActivosFijos[key], antes: originalValue, despues: value })
      }
    }
    console.log(descripcionUpdate)
    await createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        tipo: 'Activo fijo',
        fecha: moment().toDate(),
        descripcion: descripcionUpdate,
        creadoPor: new ObjectId(req.uid)
      }
    })
    return res.status(200).json({ status: 'Activo guardado exitosamente', activo })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el activo' + e.message })
  }
}
export const deleteActivoFijo = async (req, res) => {
  const { clienteId, _id } = req.body
  try {
    await deleteItemSD({ nameCollection: 'activosFijos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    return res.status(200).json({ status: 'Activo eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar el activo' + e.message })
  }
}
