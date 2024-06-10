import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, createItemSD, createManyItemsSD, deleteItemSD, formatCollectionName, getCollectionSD, getItemSD, updateItemSD } from '../../utils/dataBaseConfing.js'
import moment from 'moment'
import { momentDate } from '../../utils/momentDate.js'
import { deleteImg, uploadImg } from '../../utils/cloudImage.js'
import { getOrCreateComprobante, createMovimientos } from '../../utils/contabilidad.js'
import { keyActivosFijos, subDominioName } from '../../constants.js'

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
    const data = await depreciacionPorMesYAcumulado(fechaHasta, clienteId, periodoId)
    return res.status(200).json({ data })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtner datos de los activo fijos' + e.message })
  }
}

export const saveCalculosDepreciacion = async (req, res) => {
  const { clienteId, periodoId, datosDepreciacion } = req.body
  try {
    const ajustesSistema = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })
    const datos = []
    for (const mes of datosDepreciacion) {
      const fechaBusqueda = momentDate(ajustesSistema.timeZone, mes.fecha).toDate()
      const dato = await depreciacionPorCategoriaSegunMes(fechaBusqueda, clienteId, periodoId)
      datos.push({ ...dato, fecha: fechaBusqueda })
    }
    for (const dato of datos) {
      const isMesActual = momentDate(ajustesSistema.timeZone, dato.fecha).format('YYYY-MM') === momentDate(ajustesSistema.timeZone).format('YYYY-MM')
      for (const result of dato.resultado) {
        const valorMovimiento = Math.abs(result.mesDepreciar - (result.movimientos?.totalAcum || 0))
        if (Number(valorMovimiento.toFixed(2)) === 0) continue

        const movimiento = {
          descripcion: `Cálculo de depreciación ${result.categoria}`,
          comprobanteId: dato.comprobanteId,
          periodoId: dato.periodoId,
          fecha: (isMesActual
            ? moment().toDate()
            : momentDate(ajustesSistema.timeZone, dato.fecha).endOf('month').toDateUTC()),
          fechaCreacion: moment().toDate(),
          docReferenciaAux: 'Depreciación',
          documento: {
            docReferencia: 'Depreciación'
          }
        }
        const cuentasIds = Object.values(result._id)
        const cuentas = await getCollectionSD({
          enviromentClienteId: clienteId,
          nameCollection: 'planCuenta',
          filters: { _id: { $in: cuentasIds } }
        })
        const cuentaAcumulado = cuentas.find(e => e._id.toString() === result._id.acumulado.toString())
        const cuentaGastos = cuentas.find(e => e._id.toString() === result._id.gastos.toString())
        if (!cuentaGastos) throw new Error(`La categoria ${result.categoria} no tiene una cuenta de gastos asignada`)
        if (!cuentaAcumulado) throw new Error(`La categoria ${result.categoria} no tiene una cuenta de acumulado asignada`)
        const MovimientoGastos = {
          ...movimiento,
          cuentaId: cuentaGastos._id,
          cuentaCodigo: cuentaGastos.codigo,
          cuentaNombre: cuentaGastos.descripcion,
          debe: 0,
          haber: 0
        }
        const MovimientoAcumulado = {
          ...movimiento,
          cuentaId: cuentaAcumulado._id,
          cuentaCodigo: cuentaAcumulado.codigo,
          cuentaNombre: cuentaAcumulado.descripcion,
          debe: 0,
          haber: 0
        }
        if (result.mesDepreciar < (result.movimientos?.totalAcum || 0)) {
          MovimientoGastos.debe = Number(valorMovimiento.toFixed(2))
          MovimientoAcumulado.haber = Number(valorMovimiento.toFixed(2))
        } else if (result.mesDepreciar > (result.movimientos?.totalAcum || 0)) {
          MovimientoGastos.haber = Number(valorMovimiento.toFixed(2))
          MovimientoAcumulado.debe = Number(valorMovimiento.toFixed(2))
        } else {
          continue
        }
        await createMovimientos({
          clienteId,
          movimientos: [MovimientoGastos, MovimientoAcumulado]
        })
      }
    }
    return res.status(200).json({ status: 'Movimientos de Amortización y depreciación han sido creados correctamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar los calculos de depreciación y amortización: ' + e.message })
  }
}

const depreciacionPorCategoriaSegunMes = async (fecha, clienteId, periodoId) => {
  const ajustesContabilidad = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'contable' } })
  if (!ajustesContabilidad?.codigoComprobanteActivoAmortizado) {
    throw new Error('No existe el coidigo de comprobante de amortizaciones en los ajustes')
  }
  const ajustesSistema = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })
  const periodoActual = (await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(periodoId) } }))
  const categoriaPorZonaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorZona' })
  const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
  const detalleComprobantesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })

  let comprobantesAmortizacion
  const mesPeriodo = momentDate(ajustesSistema.timeZone, fecha).format('YYYY/MM')
  try {
    comprobantesAmortizacion = await getOrCreateComprobante(clienteId,
      {
        mesPeriodo,
        codigo: ajustesContabilidad.codigoComprobanteActivoAmortizado
      }, {
        nombre: 'Activos amortizados'
      },
      true
    )
  } catch (e) {
    console.log(e)
  }
  if (!comprobantesAmortizacion) throw new Error('No existe y no se ha podido crear el comprobante de activos amortizados')

  const fechaInicio = momentDate(ajustesSistema.timeZone, periodoActual.fechaInicio).startOf('month').toDate()
  const fechaFin = momentDate(ajustesSistema.timeZone, fecha).endOf('month').toDate()
  const fechaInicioMes = momentDate(ajustesSistema.timeZone, fecha).startOf('month').toDate()
  const fechaInicioActivoDepreciable = momentDate(ajustesSistema.timeZone, fecha).subtract(1, 'month').endOf('month').toDate()

  const mesDepreciar = {
    $sum: { $cond: {
      if: { $lte: ['$fechaAdquisicion', fechaInicioActivoDepreciable] },
      then: '$depreciacionMes',
      else: 0
    } }
  }
  const groupCategorias = {
    $sum: '$mesDepreciar'
  }
  const datosActivos = await agreggateCollectionsSD({
    nameCollection: 'activosFijos',
    enviromentClienteId: clienteId,
    pipeline: [
      {
        $match: {
          fechaAdquisicion: { $lte: fechaInicioActivoDepreciable }
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
              endDate: fechaInicio,
              unit: 'month'
            }
          }
        }
      },
      // { $match: { $expr: { $gte: ['$vidaUtilMeses', '$mesesDiff'] } } },
      { $addFields: {
        depreciacionMes: { $divide: ['$montoAdquision', '$vidaUtilMeses'] },
        cantidadMesesDepreciar: { $cond: {
          if: { $gt: ['$mesesDiff', '$vidaUtilMeses'] },
          then: '$vidaUtilMeses',
          else: { $cond: [{ $gte: ['$mesesDiff', 0] }, '$mesesDiff', 0] }
        } }
      } },
      { $addFields: {
        totalAccum: { $multiply: ['$cantidadMesesDepreciar', '$depreciacionMes'] }
      } },
      {
        $group: {
          _id: {
            categoria: '$categoria',
            zona: '$zona'
          },
          categoria: {
            $first: '$categoriaNombre'
          },
          mesDepreciar
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
          _id: {
            acumulado: '$zonacategoria.cuentaDepreciacionAcumulada',
            gastos: '$zonacategoria.cuentaGastosDepreciacion'
          },
          categoria: {
            $first: '$categoria'
          },
          mesDepreciar: groupCategorias
        }
      },
      {
        $lookup: {
          from: detalleComprobantesCollection,
          let: { acumulado: '$_id.acumulado', gastos: '$_id.gastos' },
          pipeline: [
            {
              $match: {
                fecha: { $lte: fechaFin, $gte: fechaInicioMes },
                comprobanteId: { $eq: new ObjectId(comprobantesAmortizacion._id) },
                $expr: {
                  $or: [
                    { $eq: ['$cuentaId', '$$acumulado'] },
                    { $eq: ['$cuentaId', '$$gastos'] }
                  ]
                }
              }
            },
            {
              $group: {
                _id: 0,
                debeAcum: {
                  $sum: {
                    $cond: {
                      if: { $eq: ['$cuentaId', '$$acumulado'] },
                      then: '$debe',
                      else: 0
                    }
                  }
                },
                haberAcum: {
                  $sum: {
                    $cond: {
                      if: { $eq: ['$cuentaId', '$$acumulado'] },
                      then: '$haber',
                      else: 0
                    }
                  }
                },
                debeGasto: {
                  $sum: {
                    $cond: {
                      if: { $eq: ['$cuentaId', '$$gastos'] },
                      then: '$debe',
                      else: 0
                    }
                  }
                },
                haberGasto: {
                  $sum: {
                    $cond: {
                      if: { $eq: ['$cuentaId', '$$gastos'] },
                      then: '$haber',
                      else: 0
                    }
                  }
                }
              }
            },
            {
              $project: {
                _id: 1,
                totalAcum: { $subtract: ['$debeAcum', '$haberAcum'] },
                totalGasto: { $subtract: ['$debeGasto', '$haberGasto'] }
              }
            }
          ],
          as: 'movimientos'
        }
      },
      { $unwind: { path: '$movimientos', preserveNullAndEmptyArrays: true } },
    ]
  })
  return {
    resultado: datosActivos,
    periodoId: periodoActual._id,
    comprobanteId: comprobantesAmortizacion._id
  }
}

const depreciacionPorMesYAcumulado = async (fecha, clienteId, periodoId) => {
  const ajustesContabilidad = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'contable' } })
  if (!ajustesContabilidad?.codigoComprobanteActivoAmortizado) {
    throw new Error('No existe el coidigo de comprobante de amortizaciones en los ajustes')
  }

  const periodoActual = (await getItemSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(periodoId) } })).fechaInicio
  const categoriaPorZonaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorZona' })
  const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
  const detalleComprobantesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detallesComprobantes' })
  const ajustesSistema = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })

  const yearStartComprobantes = momentDate(ajustesSistema.timeZone, periodoActual).startOf('month').year()
  const yearEndComprobantes = momentDate(ajustesSistema.timeZone, fecha).endOf('month').year()
  const regexYears = new RegExp(`(${yearStartComprobantes}|${yearEndComprobantes})`, 'i')
  const comprobanteCierre = await getItemSD({ nameCollection: 'comprobantes', enviromentClienteId: clienteId, filters: { mesPeriodo: new RegExp(`${yearStartComprobantes}`, 'i'), isPreCierre: true } })
  const comprobantesAmortizacion = await getCollectionSD({ nameCollection: 'comprobantes', enviromentClienteId: clienteId, filters: { mesPeriodo: regexYears, codigo: ajustesContabilidad.codigoComprobanteActivoAmortizado } })
  const fechaInicio = momentDate(ajustesSistema.timeZone, periodoActual).startOf('month').toDate()
  const fechaFin = momentDate(ajustesSistema.timeZone, fecha).endOf('month').toDate()
  const fechaInicioActivoDepreciable = momentDate(ajustesSistema.timeZone, fecha).subtract(1, 'month').endOf('month').toDate()

  const groupActivos = {}
  const groupCategorias = {}
  const groupContabilidad = {}
  const groupMeses = {}
  const projectCategorias = {}
  const sumDiff = fechaFin.getMonth() === fechaInicio.getMonth() ? 0 : 1
  const diffMonths = momentDate(ajustesSistema.timeZone, fechaFin).diff(momentDate(ajustesSistema.timeZone, fechaInicio), 'months') + sumDiff
  for (let i = fechaInicio.getMonth() + 1; i <= (diffMonths + fechaInicio.getMonth() + 1); i++) {
    const mes = moment().set({ month: i - 1 })
    const nombre = mes.locale('es').format('MMMM')
    groupActivos[nombre] = {
      $sum: { $cond: {
        if: { $lt: ['$fechaAdquisicion', mes.startOf('month').toDate()] },
        then: '$depreciacionMes',
        else: 0
      } }
    }
    groupCategorias[nombre] = {
      $sum: '$' + nombre
    }
    groupMeses[nombre] = {
      $first: '$' + nombre
    }
    projectCategorias[nombre] = '$' + nombre
    groupContabilidad[nombre + 'ContabilidadAcumulado'] = {
      $sum: { $cond: {
        if: { $and: [
          { $eq: ['$movimientos._id', i] },
          { $isNumber: '$movimientos.totalAcum' }
        ]} ,
        then: '$movimientos.totalAcum',
        else: 0
      } }
    }

    groupContabilidad[nombre + 'ContabilidaGastos'] = {
      $sum: { $cond: {
        if: { $and: [
          { $eq: ['$movimientos._id', i] },
          { $isNumber: '$movimientos.totalGasto' }
        ] },
        then: '$movimientos.totalGasto',
        else: 0
      } }
    }
  }
  const [datosActivos] = await agreggateCollectionsSD({
    nameCollection: 'activosFijos',
    enviromentClienteId: clienteId,
    pipeline: [
      {
        $match: {
          fechaAdquisicion: { $lte: fechaInicioActivoDepreciable }
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
              endDate: fechaInicio,
              unit: 'month'
            }
          }
        }
      },
      // { $match: { $expr: { $gte: ['$vidaUtilMeses', '$mesesDiff'] } } },
      { $addFields: { 
        depreciacionMes: { $divide: ['$montoAdquision', '$vidaUtilMeses'] },
        cantidadMesesDepreciar: { $cond: {
          if: { $gt: ['$mesesDiff', '$vidaUtilMeses'] },
          then: '$vidaUtilMeses',
          else: { $cond: [{ $gte: ['$mesesDiff', 0] }, '$mesesDiff', 0] }
        } }
      } },
      { $addFields: {
        totalAccum: { $multiply: ['$cantidadMesesDepreciar', '$depreciacionMes'] }
      } },
      { $facet: {
        meses: [
          {
            $lookup: {
              from: categoriaPorZonaCollection,
              localField: 'categoria',
              foreignField: 'categoriaId',
              let: { zonaId: '$zona' },
              pipeline: [
                { $match: { tipo: 'activoFijo', $expr: { $eq: ['$zonaId', '$$zonaId'] } } }
              ],
              as: 'zonacategoria'
            }
          },
          { $unwind: { path: '$zonacategoria' } },
          {
            $lookup: {
              from: detalleComprobantesCollection,
              let: { fechaAdquisicion: '$fechaAdquisicion', acumulado: '$zonacategoria.cuentaDepreciacionAcumulada', gastos: '$zonacategoria.cuentaGastosDepreciacion' },
              pipeline: [
                {
                  $match: {
                    comprobanteId: { $in: comprobantesAmortizacion.map(c => new ObjectId(c._id)) },
                    $expr: {
                      $and: [
                        { $or: [
                          { $eq: ['$cuentaId', '$$acumulado'] },
                          { $eq: ['$cuentaId', '$$gastos'] }
                        ] },
                        { $lte: ['$fecha', fechaFin] },
                        { $gte: ['$fecha', fechaInicio] },
                        { $or: [
                          { $and: [
                            { $gt: ['$fecha', '$fechaAdquisicion'] },
                            { $or: [
                              { $and: [
                                { $gt: [{ $month: { date: '$fecha', timezone: ajustesSistema.timeZone } }, { $month: { date: '$$fechaAdquisicion', timezone: ajustesSistema.timeZone } }] },
                                { $eq: [{ $year: { date: '$fecha', timezone: ajustesSistema.timeZone } }, { $year: { date: '$$fechaAdquisicion', timezone: ajustesSistema.timeZone } }] },
                              ] },
                              { $gt: [{ $year: { date: '$fecha', timezone: ajustesSistema.timeZone } }, { $year: { date: '$$fechaAdquisicion', timezone: ajustesSistema.timeZone } }] },
                            ] }
                          ] },
                        ] }
                      ]
                    }
                  }
                },
                {
                  $group: {
                    _id: { $month: { date: '$fecha', timezone: ajustesSistema.timeZone } },
                    debeAcum: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$cuentaId', '$$acumulado'] },
                          then: '$debe',
                          else: 0
                        }
                      }
                    },
                    haberAcum: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$cuentaId', '$$acumulado'] },
                          then: '$haber',
                          else: 0
                        }
                      }
                    },
                    debeGasto: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$cuentaId', '$$gastos'] },
                          then: '$debe',
                          else: 0
                        }
                      }
                    },
                    haberGasto: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$cuentaId', '$$gastos'] },
                          then: '$haber',
                          else: 0
                        }
                      }
                    }
                  }
                },
                {
                  $project: {
                    _id: 1,
                    totalAcum: { $subtract: ['$debeAcum', '$haberAcum'] },
                    totalGasto: { $subtract: ['$debeGasto', '$haberGasto'] }
                  }
                }
              ],
              as: 'movimientos'
            }
          },
          {
            $group: {
              _id: 0,
              movimientos: {
                $push: '$movimientos'
              },
              ...groupActivos
            }
          },
          {
            $project: {
              _id: 0,
              movimientos: {
                $reduce: {
                  input: "$movimientos",
                  initialValue: [],
                  in: {
                    $concatArrays: [
                      "$$value",
                      "$$this"
                    ]
                  }
                }
              },
              ...projectCategorias
            }
          },
          { $unwind: { path: '$movimientos', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: 0,
              ...groupMeses,
              ...groupContabilidad,
            }
          }
        ],
        // verifica en comprobantes de saldos inciales que coinciden con las fechas
        // para determinar el valor acumulado del inicio
        acumulado: [
          {
            $group: {
              _id: {
                categoria: '$categoria',
                zona: '$zona'
              },
              totalMes: {
                $sum: '$depreciacionMes'
              },
              totalAccum: {
                $sum: '$totalAccum'
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
              _id: {
                acumulado: '$zonacategoria.cuentaDepreciacionAcumulada',
                gastos: '$zonacategoria.cuentaGastosDepreciacion'
              },
              totalMes: {
                $sum: '$totalMes'
              },
              totalAccum: {
                $sum: '$totalAccum'
              }
            }
          },
          {
            $lookup: {
              from: detalleComprobantesCollection,
              let: { acumulado: '$_id.acumulado', gastos: '$_id.gastos' },
              pipeline: [
                {
                  $match: {
                    fecha: { $lte: fechaFin, $gte: fechaInicio },
                    comprobanteId: (comprobanteCierre && new ObjectId(comprobanteCierre._id)) || 'none',
                    $expr: {
                      $or: [
                        { $eq: ['$cuentaId', '$$acumulado'] },
                        { $eq: ['$cuentaId', '$$gastos'] }
                      ]
                    }
                  }
                },
                {
                  $group: {
                    _id: 0,
                    debeAcum: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$cuentaId', '$$acumulado'] },
                          then: '$debe',
                          else: 0
                        }
                      }
                    },
                    haberAcum: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$cuentaId', '$$acumulado'] },
                          then: '$haber',
                          else: 0
                        }
                      }
                    },
                    debeGasto: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$cuentaId', '$$gastos'] },
                          then: '$debe',
                          else: 0
                        }
                      }
                    },
                    haberGasto: {
                      $sum: {
                        $cond: {
                          if: { $eq: ['$cuentaId', '$$gastos'] },
                          then: '$haber',
                          else: 0
                        }
                      }
                    }
                  }
                },
                {
                  $project: {
                    _id: 1,
                    totalAcum: { $subtract: ['$debeAcum', '$haberAcum'] },
                    totalGasto: { $subtract: ['$debeGasto', '$haberGasto'] }
                  }
                }
              ],
              as: 'detalleComprobantes'
            }
          },
          { $unwind: { path: '$detalleComprobantes', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              _id: 0,
              totalCalculoAcum: '$totalAccum',
              totalContabilidadAcum: '$detalleComprobantes.totalAcum',
              totalContabilidadGasto: '$detalleComprobantes.totalGasto'
            }
          },
          {
            $group: {
              _id: 0,
              totalCalculoAcum: {
                $sum: '$totalCalculoAcum'
              },
              totalContabilidadAcum: {
                $sum: '$totalContabilidadAcum'
              },
              totalContabilidadGasto: {
                $sum: '$totalContabilidadGasto'
              }
            }
          }
        ]
      } }
    ]
  })
  const datos = Array(12).fill({
    nombre: 0,
    acumuladaCalculo: 0,
    gastosCalculo: 0,
    acumuladaContabilidad: 0,
    gastosContabilidad: 0,
    acumuladaDiferencia: 0,
    gastosDiferencia: 0,
    send: false
  }).map((e, i) => ({ ...e, nombre: momentDate(ajustesSistema.timeZone).locale('es').set({ month: i + (fechaInicio.getMonth()) }).format('MMMM') }))
  if (!datosActivos) return []
  const meses = datosActivos.meses[0] || {}
  const acumulado = datosActivos.acumulado[0] || {}

  datos.unshift({
    nombre: 'Acumulado',
    acumuladaCalculo: acumulado.totalCalculoAcum || 0,
    gastosCalculo: 0,
    acumuladaContabilidad: acumulado.totalContabilidadAcum || 0,
    gastosContabilidad: acumulado.totalContabilidadGasto || 0,
    acumuladaDiferencia: (acumulado.totalCalculoAcum || 0) - (acumulado.totalContabilidadAcum || 0),
    gastosDiferencia: 0 - (acumulado.totalContabilidadGasto || 0)
  })
  const totals = {
    ...datos[0],
    nombre: 'Total acumulado'
  }
  for (let i = fechaInicio.getMonth() + 1; i <= diffMonths + fechaInicio.getMonth() + 1; i++) {
    const index = i - fechaInicio.getMonth()
    const mes = momentDate(ajustesSistema.timeZone).set({ month: i - 1 })
    const nombre = mes.locale('es').format('MMMM')

    const acumuladaCalculo = meses[nombre] || 0 // (meses.totalCalculoAcum + ((meses[nombre] || 0) * index))
    const gastosCalculo = (meses[nombre] || 0)
    const acumuladaContabilidad = meses[nombre + 'ContabilidadAcumulado'] || 0 //(meses.contabilidad || []).find(e => e._id === i)?.totalAcum || 0
    const gastosContabilidad = meses[nombre + 'ContabilidaGastos'] || 0 // (meses.contabilidad || []).find(e => e._id === i)?.totalGasto || 0
    const acumuladaDiferencia = acumuladaCalculo - acumuladaContabilidad
    const gastosDiferencia = gastosCalculo - gastosContabilidad

    totals.acumuladaCalculo += acumuladaCalculo
    totals.gastosCalculo += gastosCalculo
    totals.acumuladaContabilidad += acumuladaContabilidad
    totals.gastosContabilidad += gastosContabilidad
    totals.acumuladaDiferencia += acumuladaDiferencia
    totals.gastosDiferencia += gastosDiferencia
    const data = {
      ...totals,
      fecha: mes.startOf('month').format('YYYY-MM-DD'),
      gastosCalculo,
      gastosContabilidad,
      gastosDiferencia,
      nombre,
      send: false
    }
    datos.splice(index, 1, data)
  }
  datos.push(totals)
  return datos
}
