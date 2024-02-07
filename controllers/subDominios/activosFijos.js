import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, createItemSD, createManyItemsSD, deleteItemSD, formatCollectionName, getCollectionSD, getItemSD, updateItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment'
import { deleteImg, uploadImg } from '../../utils/cloudImage.js'
import { ObjectNumbersMonths, keyActivosFijos, subDominioName } from '../../constants.js'

export const getActivosFijos = async (req, res) => {
  const { clienteId } = req.body
  try {
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const zonasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonas' })
    const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
    const comprobantesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'comprobantes' })
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
          $lookup: {
            from: planCuentaCollection,
            localField: 'cuentaPago',
            foreignField: '_id',
            as: 'detalleCuentaPago'
          }
        },
        { $unwind: { path: '$detalleCuentaPago', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: comprobantesCollection,
            localField: 'comprobanteRegistroActivo',
            foreignField: '_id',
            as: 'detalleComprobante'
          }
        },
        { $unwind: { path: '$detalleComprobante', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            codigo: '$codigo',
            nombre: '$nombre',
            descripcion: '$descripcion',
            categoriaId: '$categoria',
            categoria: '$detalleCategoria.nombre',
            zonaId: '$zona',
            zona: '$detalleZona.nombre',
            fechaAdquisicion: '$fechaAdquisicion',
            vidaUtil: '$detalleCategoria.vidaUtil',
            montoAdquision: '$montoAdquision',
            observacion: '$observacion',
            documentosAdjuntos: '$documentosAdjuntos',
            cuentaPago: '$detalleCuentaPago.codigo',
            referencia: '$referencia',
            dataCuentaPago: '$detalleCuentaPago',
            comprobante: { $concat: ['$detalleComprobante.mesPeriodo', '-', '$detalleComprobante.codigo'] },
            dataComprobante: '$detalleComprobante'
          }
        },
        { $sort: { tipo: -1 } }
      ]
    })
    return res.status(200).json({ activos })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtner datos de los activo fijos' + e.message })
  }
}
export const createActivoFijo = async (req, res) => {
  const {
    codigo,
    nombre,
    descripcion,
    tipo,
    unidad,
    cantidad,
    categoria,
    zona,
    fechaAdquisicion,
    // vidaUtil,
    montoAdquision,
    observacion,
    clienteId,
    cuentaPago,
    referencia,
    comprobanteRegistroActivo,
    periodoId,
    categoriaNombre,
    dataComprobante
  } = req.body
  console.log(req.body)
  const documentos = req.files?.documentos
  try {
    const documentosAdjuntos = []
    if (req.files && req.files.documentos) {
      if (documentos && documentos[0]) {
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
      if (documentos && documentos.nombre) {
        const extension = documentos.mimetype.split('/')[1]
        const namePath = `${documentos.name}`
        const resDoc = await uploadImg(documentos.data, namePath)
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
        // vidaUtil: Number(vidaUtil),
        montoAdquision: Number(montoAdquision),
        observacion,
        documentosAdjuntos,
        cuentaPago: new ObjectId(cuentaPago),
        referencia,
        comprobanteRegistroActivo: new ObjectId(comprobanteRegistroActivo)
      }
    })
    console.log('antes de crear')
    createDetalleComprobanteActivoFijo({
      categoria,
      categoriaNombre,
      zona,
      cuentaPago,
      comprobanteRegistroActivo,
      clienteId,
      periodoId,
      fechaAdquisicion,
      montoAdquision,
      referencia,
      documentosAdjuntos,
      dataComprobante
    })
    createItemSD({
      nameCollection: 'historial',
      enviromentClienteId: clienteId,
      item: {
        idProducto: newActivo.insertedId,
        categoria: 'creado',
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
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el activo ' + e.message })
  }
}
export const editActivoFijo = async (req, res) => {
  const {
    _id,
    codigo,
    nombre,
    descripcion,
    tipo,
    unidad,
    cantidad,
    categoria,
    zona,
    fechaAdquisicion,
    // vidaUtil,
    clienteId,
    cuentaPago,
    referencia,
    comprobanteRegistroActivo,
    periodoId,
    categoriaNombre,
    dataComprobante
  } = req.body
  try {
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
          // vidaUtil: Number(vidaUtil),
          cuentaPago: new ObjectId(cuentaPago),
          referencia,
          comprobanteRegistroActivo: new ObjectId(comprobanteRegistroActivo)
        }
      }
    })
    const descripcionUpdate = []
    if (activoPreUpdate.zona.toJSON() !== activo.zona.toJSON() || activoPreUpdate.categoria.toJSON() !== activo.categoria.toJSON()) {
      createDetalleComprobanteForEdit({
        categoria,
        categoriaNombre,
        zona,
        dataPreUpdate: activoPreUpdate,
        comprobanteRegistroActivo,
        clienteId,
        periodoId,
        fechaAdquisicion,
        montoAdquision: activo.montoAdquision,
        referencia,
        documentosAdjuntos: activo.documentosAdjuntos,
        dataComprobante
      })
    }
    for (const [key, value] of Object.entries(activo)) {
      const originalValue = activoPreUpdate[key]
      if (originalValue !== value) {
        if (key === 'comprobanteRegistroActivo' || key === 'zona' || key === 'categoria') {
          const equalsId = originalValue.toJSON() === value.toJSON()
          if (equalsId) continue
          console.log({ key, antes: originalValue, despues: value })
          descripcionUpdate.push({ campo: keyActivosFijos[key], antes: originalValue, despues: value })
          continue
        }
        /* if (key === 'zona') {
          const equalsId = originalValue.toJSON() === value.toJSON()
          console.log(key, equalsId)
          if (equalsId) continue
          descripcionUpdate.push({ campo: keyActivosFijos[key], antes: originalValue, despues: value })
          continue
        }
        if (key === 'categoria') {
          const equalsId = originalValue.toJSON() === value.toJSON()
          console.log(key, equalsId)
          if (equalsId) continue
          descripcionUpdate.push({ campo: keyActivosFijos[key], antes: originalValue, despues: value })
          continue
        } */
        if (key === '_id') continue
        if (key === 'cuentaPago') continue
        if (key === 'documentosAdjuntos') continue
        if (key === 'fechaAdquisicion') {
          const fecha1 = moment(originalValue).format('DD/MM/YYYY')
          const fecha2 = moment(value).format('DD/MM/YYYY')
          if (fecha1 === fecha2) continue
          descripcionUpdate.push({ campo: keyActivosFijos[key], antes: moment(originalValue).toDate(), despues: moment(value).toDate() })
          continue
        }
        console.log({ key, antes: originalValue, despues: value })
        descripcionUpdate.push({ campo: keyActivosFijos[key], antes: originalValue, despues: value })
      }
    }
    if (descripcionUpdate[0]) {
      await createItemSD({
        nameCollection: 'historial',
        enviromentClienteId: clienteId,
        item: {
          idProducto: activo._id,
          categoria: 'editado',
          tipo: 'Activo fijo',
          fecha: moment().toDate(),
          descripcion: descripcionUpdate,
          creadoPor: new ObjectId(req.uid)
        }
      })
    }
    return res.status(200).json({ status: 'Activo guardado exitosamente', activo })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el activo' + e.message })
  }
}
export const saveToArray = async (req, res) => {
  const { clienteId, activos } = req.body
  try {
    if (!activos[0]) return res.status(400).json({ error: 'Hubo un error al momento de procesar la lista de activos' })
    for (const activo of activos) {
      const verifyActivo = await getItemSD({
        nameCollection: 'activosFijos',
        enviromentClienteId: clienteId,
        filters: { nombre: activo.nombre, codigo: activo.codigo }
      })
      if (verifyActivo) {
        const updateActivo = await updateItemSD({
          nameCollection: 'activosFijos',
          enviromentClienteId: clienteId,
          filters: { nombre: { $regex: `/^${activo.nombre}/`, $options: 'i' }, codigo: { $regex: `/^${activo.codigo}/`, $options: 'i' } },
          update: {
            $set: {
              nombre: activo.nombre,
              descripcion: activo.descripcion,
              codigo: activo.codigo,
              categoria: new ObjectId(activo.categoria),
              zona: new ObjectId(activo.zona),
              fechaAdquisicion: moment(activo.fechaAdquisicion).toDate(),
              // vidaUtil: Number(activo.vidaUtil),
              montoAdquision: Number(activo.montoAdquision),
              observacion: activo.observacion
            }
          }
        })
        const descripcionUpdate = []
        for (const [key, value] of Object.entries(activo)) {
          const originalValue = verifyActivo[key]
          if (originalValue !== value) {
            if (key === 'comprobanteRegistroActivo' || key === 'zona' || key === 'categoria') {
              const equalsId = originalValue.toJSON() === value.toJSON()
              if (equalsId) continue
              descripcionUpdate.push({ campo: keyActivosFijos[key], antes: originalValue, despues: value })
              continue
            }
            /* if (key === 'zona') {
              const equalsId = originalValue.toJSON() === new ObjectId(value).toJSON()
              if (equalsId) continue
              descripcionUpdate.push({ campo: keyActivosFijos[key], antes: originalValue, despues: value })
              continue
            }
            if (key === 'categoria') {
              const equalsId = originalValue.toJSON() === new ObjectId(value).toJSON()
              if (equalsId) continue
              descripcionUpdate.push({ campo: keyActivosFijos[key], antes: originalValue, despues: value })
              continue
            } */
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
        if (descripcionUpdate[0]) {
          await createItemSD({
            nameCollection: 'historial',
            enviromentClienteId: clienteId,
            item: {
              idProducto: updateActivo._id,
              categoria: 'editado',
              tipo: 'Activo fijo',
              fecha: moment().toDate(),
              descripcion: descripcionUpdate,
              creadoPor: new ObjectId(req.uid)
            }
          })
        }
      } else {
        const newActivo = await createItemSD({
          nameCollection: 'activosFijos',
          enviromentClienteId: clienteId,
          item: {
            nombre: activo.nombre,
            descripcion: activo.descripcion,
            codigo: activo.codigo,
            tipo: activo.tipo,
            unidad: activo.unidad,
            cantidad: Number(activo.cantidad),
            categoria: new ObjectId(activo.categoria),
            zona: new ObjectId(activo.zona),
            fechaAdquisicion: moment(activo.fechaAdquisicion).toDate(),
            vidaUtil: Number(activo.vidaUtil),
            montoAdquision: Number(activo.montoAdquision),
            observacion: activo.observacion
          }
        })
        await createItemSD({
          nameCollection: 'historial',
          enviromentClienteId: clienteId,
          item: {
            idProducto: newActivo.insertedId,
            categoria: 'creado',
            tipo: 'Activo fijo',
            fecha: moment().toDate(),
            descripcion: `Creo el activo: ${activo.codigo} - ${activo.nombre}`,
            creadoPor: new ObjectId(req.uid)
          }
        })
      }
    }
    return res.status(200).json({ status: 'Activos guardados exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar los activos' + e.message })
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
const createDetalleComprobanteActivoFijo = async ({
  categoria,
  categoriaNombre,
  zona,
  cuentaPago,
  comprobanteRegistroActivo,
  clienteId,
  periodoId,
  fechaAdquisicion,
  montoAdquision,
  referencia,
  documentosAdjuntos,
  dataComprobante
}) => {
  try {
    console.log('empezamos a crear')
    const categoriaZona = await getItemSD({
      nameCollection: 'categoriaPorZona',
      enviromentClienteId: clienteId,
      filters: { categoriaId: new ObjectId(categoria), zonaId: new ObjectId(zona) }
    })
    const cuentaCategoriaZona = await getItemSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      filters: { _id: categoriaZona.cuentaId }
    })
    const cuentaPagoActivo = await getItemSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(cuentaPago) }
    })
    const fechaComprobante = moment(`${dataComprobante}/01`, 'YYYY/MM/DD').toDate()
    const datosRepetidos = {
      comprobanteId: new ObjectId(comprobanteRegistroActivo),
      periodoId: new ObjectId(periodoId),
      descripcion: `Adquisición ${categoriaNombre}`,
      fecha: fechaComprobante,
      fechaCreacion: moment().toDate(),
      docReferenciaAux: referencia,
      documento: {
        docReferencia: referencia,
        docFecha: moment(fechaAdquisicion).toDate(),
        docTipo: 'Transacción',
        documento: documentosAdjuntos
      }
    }
    const lineaPagoComprobante = {
      cuentaId: cuentaPagoActivo._id,
      cuentaCodigo: cuentaPagoActivo.codigo,
      cuentaNombre: cuentaPagoActivo.descripcion,
      debe: 0,
      haber: Number(montoAdquision),
      ...datosRepetidos
    }
    console.log({ lineaPagoComprobante })
    const lineaCuentaActivo = {
      cuentaId: cuentaCategoriaZona._id,
      cuentaCodigo: cuentaCategoriaZona.codigo,
      cuentaNombre: cuentaCategoriaZona.descripcion,
      debe: Number(montoAdquision),
      haber: 0,
      ...datosRepetidos
    }
    const datosComprobantes = [lineaCuentaActivo, lineaPagoComprobante]
    createManyItemsSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, items: datosComprobantes })
  } catch (e) {
    return e.message
  }
}
const createDetalleComprobanteForEdit = async ({
  categoria,
  categoriaNombre,
  zona,
  dataPreUpdate,
  comprobanteRegistroActivo,
  clienteId,
  periodoId,
  fechaAdquisicion,
  montoAdquision,
  referencia,
  documentosAdjuntos,
  dataComprobante
}) => {
  try {
    const categoriaZona = await getItemSD({
      nameCollection: 'categoriaPorZona',
      enviromentClienteId: clienteId,
      filters: { categoriaId: new ObjectId(categoria), zonaId: new ObjectId(zona) }
    })
    const cuentaCategoriaZona = await getItemSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      filters: { _id: categoriaZona.cuentaId }
    })
    const categoriaZonaPreUpdate = await getItemSD({
      nameCollection: 'categoriaPorZona',
      enviromentClienteId: clienteId,
      filters: { categoriaId: new ObjectId(dataPreUpdate.categoria), zonaId: new ObjectId(dataPreUpdate.zona) }
    })
    const cuentaCategoriaZonaPreUpdate = await getItemSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      filters: { _id: categoriaZonaPreUpdate.cuentaId }
    })
    const fechaComprobante = moment(`${dataComprobante}/01`, 'YYYY/MM/DD').toDate()
    const datosRepetidos = {
      comprobanteId: new ObjectId(comprobanteRegistroActivo),
      periodoId: new ObjectId(periodoId),
      descripcion: `Adquisición ${categoriaNombre}`,
      fecha: fechaComprobante,
      fechaCreacion: moment().toDate(),
      docReferenciaAux: referencia,
      documento: {
        docReferencia: referencia,
        docFecha: moment(fechaAdquisicion).toDate(),
        docTipo: 'Transacción',
        documento: documentosAdjuntos
      }
    }
    const lineaPreUpdateComprobante = {
      cuentaId: cuentaCategoriaZonaPreUpdate._id,
      cuentaCodigo: cuentaCategoriaZonaPreUpdate.codigo,
      cuentaNombre: cuentaCategoriaZonaPreUpdate.descripcion,
      debe: 0,
      haber: Number(montoAdquision),
      ...datosRepetidos
    }
    const lineaCuentaActivo = {
      cuentaId: cuentaCategoriaZona._id,
      cuentaCodigo: cuentaCategoriaZona.codigo,
      cuentaNombre: cuentaCategoriaZona.descripcion,
      debe: Number(montoAdquision),
      haber: 0,
      ...datosRepetidos
    }
    const datosComprobantes = [lineaCuentaActivo, lineaPreUpdateComprobante]
    createManyItemsSD({ nameCollection: 'detallesComprobantes', enviromentClienteId: clienteId, items: datosComprobantes })
  } catch (e) {
    return e.message
  }
}
export const deleteImgActivo = async (req, res) => {
  const { clienteId, activoId, imgId } = req.body
  console.log(req.body)
  try {
    await updateItemSD({
      nameCollection: 'activosFijos',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(activoId) },
      update: { $pull: { documentosAdjuntos: { fileId: imgId } } }
    })
    try {
      await deleteImg(imgId)
    } catch (e) {
      console.log(e)
    }
    return res.status(200).json({ status: 'Imagen eliminada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar la imagen del almacen ' + e.message })
  }
}
export const addImagenToActivo = async (req, res) => {
  const { clienteId, activoId } = req.body
  try {
    const documentos = req.files?.documentos
    const documentosAdjuntos = []
    if (req.files && req.files.documentos) {
      if (documentos && documentos[0]) {
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
      if (documentos && documentos.name) {
        const extension = documentos.mimetype.split('/')[1]
        const namePath = `${documentos.name}`
        const resDoc = await uploadImg(documentos.data, namePath)
        documentosAdjuntos.push(
          {
            path: resDoc.filePath,
            name: resDoc.name,
            url: resDoc.url,
            type: extension,
            fileId: resDoc.fileId
          }
        )
      }
    }
    if (documentosAdjuntos[0]) {
      console.log(documentosAdjuntos)
      const itemsAnterior = (await getItemSD({ nameCollection: 'activosFijos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(activoId) } })).documentosAdjuntos
      if (itemsAnterior) {
        documentosAdjuntos.push(...itemsAnterior)
      }
      const activoUpdate = await updateItemSD({
        nameCollection: 'activosFijos',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(activoId) },
        update: { $set: { documentosAdjuntos } }
      })
      return res.status(200).json({ status: 'Imagenes guardada exitosamente', activoUpdate })
    }
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar las imagenes del almacen ' + e.message })
  }
}

export const datosInicualesDepreciacion = async (req, res) => {
  const { clienteId, periodoId, fechaHasta } = req.body
  try {
    const fecha = moment(fechaHasta, 'YYYY/MM').endOf('month').toDate()
    const ajustesContabilidad = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'contable' } })
    const comprobantesAmortizacion = await getCollectionSD({ nameCollection: 'comprobantes', enviromentClienteId: clienteId, filters: { codigo: ajustesContabilidad.codigoComprobanteActivoAmortizado } })
    const categoriasZonaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorZona' })
    const comprobantesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const datosDepereciacion = await agreggateCollectionsSD({
      nameCollection: 'activosFijos',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $group: {
            _id: {
              categoria: '$categoria',
              zona: '$zona'
            }
          }
        },
        {
          $lookup: {
            from: categoriasZonaCollection,
            let: { categoriaId: '$_id.categoria', zonaId: '$_id.zona' },
            pipeline: [
              {
                $match:
                  {
                    $expr:
                    {
                      $and:
                        [
                          { $eq: ['$categoriaId', '$$categoriaId'] },
                          { $eq: ['$zonaId', '$$zonaId'] }
                        ]
                    }
                  }
              }
            ],
            as: 'detalleCategoriaZona'
          }
        },
        { $unwind: { path: '$detalleCategoriaZona', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            categoriaId: '$_id.categoria',
            zonaId: '$_id.zona',
            cuentaDepreciacionAcumulada: '$detalleCategoriaZona.cuentaDepreciacionAcumulada'
          }
        },
        { $match: { cuentaDepreciacionAcumulada: { $exists: true } } },
        { $group: { _id: '$cuentaDepreciacionAcumulada' } },
        {
          $lookup: {
            from: comprobantesCollection,
            localField: '_id',
            foreignField: 'cuentaId',
            pipeline: [
              { $match: { periodoId: new ObjectId(periodoId), isPrecierre: true } },
              {
                $group: {
                  _id: '$cuentaId',
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              },
              {
                $project: {
                  acumulado: { $subtract: ['$debe', '$haber'] }
                }
              }
            ],
            as: 'detalleComprobantesIniciales'
          }
        },
        { $unwind: { path: '$detalleComprobantesIniciales', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: comprobantesCollection,
            localField: '_id',
            foreignField: 'cuentaId',
            pipeline: [
              {
                $match: {
                  periodoId: new ObjectId(periodoId),
                  isPrecierre: { $ne: true },
                  isCierre: { $ne: true },
                  fecha: { $lte: fecha },
                  comprobanteId: { $in: comprobantesAmortizacion.map(comprobante => comprobante._id) }
                }
              },
              {
                $group: {
                  _id: {
                    cuentaId: '$cuentaId',
                    mes: { $month: '$fecha' }
                  },
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              },
              {
                $project: {
                  mes: '$_id.mes',
                  ENERO: { $cond: { if: { $eq: ['$_id.mes', 1] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  FEBRERO: { $cond: { if: { $eq: ['$_id.mes', 2] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  MARZO: { $cond: { if: { $eq: ['$_id.mes', 3] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  ABRIL: { $cond: { if: { $eq: ['$_id.mes', 4] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  MAYO: { $cond: { if: { $eq: ['$_id.mes', 5] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  JUNIO: { $cond: { if: { $eq: ['$_id.mes', 6] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  JULIO: { $cond: { if: { $eq: ['$_id.mes', 7] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  AGOSTO: { $cond: { if: { $eq: ['$_id.mes', 8] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  SEPTIEMBRE: { $cond: { if: { $eq: ['$_id.mes', 9] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  OCTUBRE: { $cond: { if: { $eq: ['$_id.mes', 10] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  NOVIEMBRE: { $cond: { if: { $eq: ['$_id.mes', 11] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  DICIEMBRE: { $cond: { if: { $eq: ['$_id.mes', 12] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } }
                }
              }
            ],
            as: 'detalleComprobantes'
          }
        },
        { $unwind: { path: '$detalleComprobantes', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            // categoriaId: '$categoriaId',
            // zonaId: '$zonaId',
            cuentaDepreciacionAcumulada: '$_id',
            acumulado: '$detalleComprobantesIniciales.acumulado',
            ENERO: '$detalleComprobantes.ENERO',
            FEBRERO: '$detalleComprobantes.FEBRERO',
            MARZO: '$detalleComprobantes.MARZO',
            ABRIL: '$detalleComprobantes.ABRIL',
            MAYO: '$detalleComprobantes.MAYO',
            JUNIO: '$detalleComprobantes.JUNIO',
            JULIO: '$detalleComprobantes.JULIO',
            AGOSTO: '$detalleComprobantes.AGOSTO',
            SEPTIEMBRE: '$detalleComprobantes.SEPTIEMBRE',
            OCTUBRE: '$detalleComprobantes.OCTUBRE',
            NOVIEMBRE: '$detalleComprobantes.NOVIEMBRE',
            DICIEMBRE: '$detalleComprobantes.DICIEMBRE'
          }
        },
        {
          $group: {
            _id: 0,
            acumulado: { $sum: '$acumulado' },
            ENERO: { $sum: '$ENERO' },
            FEBRERO: { $sum: '$FEBRERO' },
            MARZO: { $sum: '$MARZO' },
            ABRIL: { $sum: '$ABRIL' },
            MAYO: { $sum: '$MAYO' },
            JUNIO: { $sum: '$JUNIO' },
            JULIO: { $sum: '$JULIO' },
            AGOSTO: { $sum: '$AGOSTO' },
            SEPTIEMBRE: { $sum: '$SEPTIEMBRE' },
            OCTUBRE: { $sum: '$OCTUBRE' },
            NOVIEMBRE: { $sum: '$NOVIEMBRE' },
            DICIEMBRE: { $sum: '$DICIEMBRE' }
          }
        }
      ]
    })
    const newArray = []
    let totalAcumulado = 0
    const datosCalculosActivos = await agreggateCollectionsSD({
      nameCollection: 'activosFijos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { fechaAdquisicion: { $lte: fecha } } },
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
          $project: {
            vidaUtil: '$detalleCategoria.vidaUtil',
            fechaAdquisicion: '$fechaAdquisicion',
            montoAdquision: '$montoAdquision'
          }
        }
      ]
    })
    let totalAcumuladoCalculo = 0
    let totalCalculosMensuales = 0
    const periodoActual = (await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(periodoId) } })).fechaInicio
    const mesAnteriorPeriodo = moment(periodoActual).subtract(25, 'days').startOf('month')
    console.log({ mesAnteriorPeriodo })
    for (const calculo of datosCalculosActivos) {
      // const fechaAddVidaUtil = moment(calculo?.fechaAdquisicion).add(calculo?.vidaUtil, 'years')
      // if (fechaAddVidaUtil.startOf('month') < moment().subtract(1, 'month').startOf('month')) continue
      // console.log({ fecha1: calculo?.fechaAdquisicion, vida: calculo.vidaUtil, fecha2: fechaAddVidaUtil, actual: moment().subtract(1, 'month').startOf('month') })
      const fechaAdquisicionMasMes = moment(calculo?.fechaAdquisicion).endOf('month').add(1, 'month')
      let mesesTranscurrido = moment(mesAnteriorPeriodo).diff(fechaAdquisicionMasMes, 'months')
      console.log({ fecha: calculo?.fechaAdquisicion, fechaAdquisicionMasMes, diff: moment(mesAnteriorPeriodo).diff(calculo?.fechaAdquisicion, 'months') })
      const mesesVidaUtil = calculo?.vidaUtil * 12
      console.log({ mesesVidaUtil })
      if (mesesVidaUtil <= mesesTranscurrido) mesesTranscurrido = mesesVidaUtil
      const calculoMensual = mesesVidaUtil <= mesesTranscurrido ? 0 : calculo?.montoAdquision / mesesVidaUtil
      console.log({ calculoMensual, mesesTranscurrido, monto: calculo?.montoAdquision })
      if (mesesTranscurrido <= 0) continue
      totalAcumuladoCalculo += calculoMensual * mesesTranscurrido
      totalCalculosMensuales += calculoMensual
    }
    const numberMonth = fecha.getMonth() + 1
    let totalDiferencia = 0
    for (const key in datosDepereciacion[0]) {
      if (key === '_id') continue
      totalAcumulado += datosDepereciacion[0][key]
      let calculosDepreciacion = 0
      let calculoDiferencia = 0
      if (key === 'acumulado') {
        calculosDepreciacion = totalAcumuladoCalculo
        calculoDiferencia = datosDepereciacion[0][key] - totalAcumuladoCalculo
        totalDiferencia += calculoDiferencia
      }
      if (key !== 'acumulado' && ObjectNumbersMonths[key] <= numberMonth) {
        calculosDepreciacion = totalCalculosMensuales
        calculoDiferencia = datosDepereciacion[0][key] - totalCalculosMensuales
        totalDiferencia += calculoDiferencia
      }
      newArray.push({
        nombre: key === 'acumulado' ? 'Acumulado' : key,
        depreciacionContabilidad: datosDepereciacion[0][key],
        depreciacionCalculos: calculosDepreciacion,
        diferencia: calculoDiferencia,
        sendContabilidad: false
      })
    }
    newArray.push({
      nombre: 'Total acumulado',
      depreciacionContabilidad: totalAcumulado,
      depreciacionCalculos: totalAcumuladoCalculo + (totalCalculosMensuales * numberMonth),
      diferencia: totalDiferencia// totalAcumulado - (totalAcumuladoCalculo + (totalCalculosMensuales * numberMonth))
    })
    return res.status(200).json({ datosDepereciacion: newArray })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtner datos de los activo fijos' + e.message })
  }
}
export const saveCalculosDepreciacion = async (req, res) => {
  const { clienteId, periodoId, datosDepreciacion, fechaHasta } = req.body
  console.log(datosDepreciacion)
  try {
    const fecha = moment(fechaHasta, 'YYYY/MM').endOf('month').toDate()
    const ajustesContabilidad = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'contable' } })
    const comprobantesAmortizacion = await getCollectionSD({ nameCollection: 'comprobantes', enviromentClienteId: clienteId, filters: { codigo: ajustesContabilidad.codigoComprobanteActivoAmortizado } })
    const comprobantesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
    const categoriasZonaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorZona' })
    const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
    const resultados = []
    for (const mes of datosDepreciacion) {
      const fechaBusqueda = moment(mes.fecha).subtract(1, 'month').endOf('month').toDate()
      const resultado = await depreciacionPorCategoriaSegunMes(fechaBusqueda, clienteId)
      resultados.push(resultado)
    }
    return res.status(200).json({ resultados })

    const datosActivos = await agreggateCollectionsSD({
      nameCollection: 'activosFijos',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $group: {
            _id: {
              categoria: '$categoria',
              zona: '$zona'
            }
          }
        },
        {
          $lookup: {
            from: categoriasZonaCollection,
            let: { categoriaId: '$_id.categoria', zonaId: '$_id.zona' },
            pipeline: [
              {
                $match:
                  {
                    $expr:
                    {
                      $and:
                        [
                          { $eq: ['$categoriaId', '$$categoriaId'] },
                          { $eq: ['$zonaId', '$$zonaId'] }
                        ]
                    }
                  }
              }
            ],
            as: 'detalleCategoriaZona'
          }
        },
        { $unwind: { path: '$detalleCategoriaZona', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: categoriasCollection,
            localField: '_id.categoria',
            foreignField: '_id',
            as: 'detalleCategoria'
          }
        },
        { $unwind: { path: '$detalleCategoria', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: {
              cuentaDepreciacionAcumulada: '$detalleCategoriaZona.cuentaDepreciacionAcumulada'
            },
            listNombresCategorias: {
              $push: {
                nombreCategoria: '$detalleCategoria.nombre',
                categoriaId: '$detalleCategoria._id'
              }
            }
          }
        },
        {
          $project: {
            cuentaDepreciacionAcumulada: '$_id.cuentaDepreciacionAcumulada',
            listNombresCategorias: '$listNombresCategorias'
          }
        },
        { $match: { cuentaDepreciacionAcumulada: { $exists: true } } },
        {
          $lookup: {
            from: comprobantesCollection,
            localField: '_id',
            foreignField: 'cuentaId',
            pipeline: [
              {
                $match: {
                  periodoId: new ObjectId(periodoId),
                  isPrecierre: { $ne: true },
                  isCierre: { $ne: true },
                  fecha: { $lte: fecha },
                  comprobanteId: { $in: comprobantesAmortizacion.map(comprobante => comprobante._id) }
                }
              },
              {
                $group: {
                  _id: {
                    cuentaId: '$cuentaId',
                    mes: { $month: '$fecha' }
                  },
                  debe: { $sum: '$debe' },
                  haber: { $sum: '$haber' }
                }
              },
              {
                $project: {
                  mes: '$_id.mes',
                  ENERO: { $cond: { if: { $eq: ['$_id.mes', 1] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  FEBRERO: { $cond: { if: { $eq: ['$_id.mes', 2] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  MARZO: { $cond: { if: { $eq: ['$_id.mes', 3] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  ABRIL: { $cond: { if: { $eq: ['$_id.mes', 4] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  MAYO: { $cond: { if: { $eq: ['$_id.mes', 5] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  JUNIO: { $cond: { if: { $eq: ['$_id.mes', 6] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  JULIO: { $cond: { if: { $eq: ['$_id.mes', 7] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  AGOSTO: { $cond: { if: { $eq: ['$_id.mes', 8] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  SEPTIEMBRE: { $cond: { if: { $eq: ['$_id.mes', 9] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  OCTUBRE: { $cond: { if: { $eq: ['$_id.mes', 10] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  NOVIEMBRE: { $cond: { if: { $eq: ['$_id.mes', 11] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } },
                  DICIEMBRE: { $cond: { if: { $eq: ['$_id.mes', 12] }, then: { $subtract: ['$debe', '$haber'] }, else: 0 } }
                }
              }
            ],
            as: 'detalleComprobantes'
          }
        },
        { $unwind: { path: '$detalleComprobantes', preserveNullAndEmptyArrays: true } }
      ]
    })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar los calculos de depreciación y amortización ' + e.message })
  }
}

const depreciacionPorCategoriaSegunMes = async (fecha, clienteId, periodoId) => {
  const categoriaPorZonaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorZona' })
  const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
  const detalleComprobantesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
  const ajustesContabilidad = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'contable' } })
  if (!ajustesContabilidad?.codigoComprobanteActivoAmortizado) {
    throw new Error('No existe el coidigo de comprobante de amortizaciones en los ajustes')
  }
  const comprobantesAmortizacion = await getItemSD({ nameCollection: 'comprobantes', enviromentClienteId: clienteId, filters: { codigo: ajustesContabilidad.codigoComprobanteActivoAmortizado } })
  const fechaInicio = moment(fecha).startOf('month').toDate()
  const fechaFin = moment(fecha).endOf('month').toDate()
  const activosSegunCalculos = await agreggateCollectionsSD({
    nameCollection: 'activosFijos',
    enviromentClienteId: clienteId,
    pipeline: [
      {
        $match: {
          fechaAdquisicion: { $lte: fechaFin }
        }
      },
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
        $project: {
          categoria: '$categoria',
          categoriaNombre: '$detalleCategoria.nombre',
          zona: '$zona',
          vidaUtilMeses: { $multiply: ['$detalleCategoria.vidaUtil', 12] },
          fechaAdquisicion: '$fechaAdquisicion',
          montoAdquision: '$montoAdquision',
          mesesDiff: {
            $dateDiff: {
              startDate: '$fechaAdquisicion',
              endDate: fecha,
              unit: 'month'
            }
          }
        }
      },
      { $match: { $expr: { $gte: ['$vidaUtilMeses', '$mesesDiff'] } } },
      { $addFields: { depreciacionMes: { $divide: ['$montoAdquision', '$vidaUtilMeses'] } } },
      {
        $group: {
          _id: {
            categoria: '$categoria',
            zona: '$zona'
          },
          categoriaNombre: {
            $first: '$categoriaNombre'
          },
          total: {
            $sum: '$depreciacionMes'
          }
        }
      },
      {
        $lookup: {
          from: categoriaPorZonaCollection,
          localField: '_id.categoria',
          foreignField: 'categoriaId',
          let: { zonaId: '$_id.zona' },
          pipeline: [
            { $match: { tipo: 'activoFijo', $expr: { $eq: ['$zonaId', '$$zonaId'] } } }
          ],
          as: 'zonacategoria'
        }
      },
      { $unwind: { path: '$zonacategoria' } },
      {
        $group: {
          _id: '$zonacategoria.cuentaDepreciacionAcumulada',
          categoriaNombre: {
            $first: '$categoriaNombre'
          },
          total: {
            $sum: '$total'
          }
        }
      },
      {
        $lookup: {
          from: detalleComprobantesCollection,
          localField: '_id.cuentaDepreciacionAcumulada',
          foreignField: 'cuentaId',
          pipeline: [
            {
              $match: {
                isPrecierre: { $ne: true },
                isCierre: { $ne: true },
                fecha: { $lte: fechaFin, $gte: fechaInicio },
                comprobanteId: { $eq: comprobantesAmortizacion?._id && new ObjectId(comprobantesAmortizacion._id) }
              }
            },
            {
              $group: {
                _id: '$cuentaId',
                debe: { $sum: '$debe' },
                haber: { $sum: '$haber' }
              }
            },
            {
              $project: {
                totalContabilidad: { $subtract: ['$debe', '$haber'] }
              }
            }
          ],
          as: 'detalleComprobantes'
        }
      },
      { $unwind: { path: '$detalleComprobantes', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 1,
          cuentaDepreciacionAcumulada: '$_id',
          categoriaNombre: '$categoriaNombre',
          total: '$total',
          totalContabilidad: '$detalleComprobantes.totalContabilidad',
          totalDiferencia: { $subtract: ['$total', { $ifNull: ['$detalleComprobantes.totalContabilidad', 0] }] }
        }
      }
    ]
  })
  return activosSegunCalculos
}
