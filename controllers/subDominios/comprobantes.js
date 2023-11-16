import moment from 'moment'
import { agreggateCollectionsSD, createItemSD, deleteItemSD, getItemSD, updateItemSD } from '../../utils/dataBaseConfing.js'
import { ObjectId } from 'mongodb'
import { agregateDetalleComprobante } from '../../utils/agregateComprobantes.js'
import { deleteImg, uploadImg } from '../../utils/cloudImage.js'

export const getListComprobantes = async (req, res) => {
  const { clienteId, periodoId, nombre } = req.body
  if (!(periodoId || clienteId)) return res.status(400).json({ error: 'Datos incompletos' })
  let filterNombre = {}
  if (nombre) {
    filterNombre = { nombre: { $regex: `/^${nombre}/`, $options: 'i' } }
  }
  try {
    const comprobantes = await agreggateCollectionsSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: { periodoId: new ObjectId(periodoId), ...filterNombre }
        }
      ]
    })
    return res.status(200).json({ comprobantes })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la lista de comprobantes' + e.message })
  }
}

export const createComprobante = async (req, res) => {
  const { nombre, periodoId, clienteId } = req.body
  if (!(nombre || !periodoId || clienteId)) return res.status(400).json({ error: 'Datos incompletos' })
  try {
    const newComprobante = await createItemSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      item: { nombre, periodoId: new ObjectId(periodoId), isBloqueado: false, fechaCreacion: moment().toDate() }
    })
    const comprobante = await getItemSD({ nameCollection: 'comprobantes', enviromentClienteId: clienteId, filters: { _id: newComprobante.insertedId } })
    return res.status(200).json({ status: 'Comprobante guardado exitosamente', comprobante })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el comprobante' + e.message })
  }
}
export const updateComprobante = async (req, res) => {
  const { nombre, periodoId, clienteId, _id, isBloqueado } = req.body
  if (!(nombre || !periodoId || clienteId)) return res.status(400).json({ error: 'Datos incompletos' })
  try {
    const comprobante = await updateItemSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: { nombre, periodoId: new ObjectId(periodoId), isBloqueado }
    })
    return res.status(200).json({ status: 'Comprobante guardado exitosamente', comprobante })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el comprobante' + e.message })
  }
}

export const getDetallesComprobantes = async (req, res) => {
  const { clienteId, comprobanteId, itemsPorPagina, pagina } = req.body
  if (!(comprobanteId || clienteId)) return res.status(400).json({ error: 'Datos incompletos' })
  try {
    const { detallesComprobantes, cantidad, totalDebe, totalHaber } = await agregateDetalleComprobante({ clienteId, comprobanteId, itemsPorPagina, pagina })
    console.log({ detallesComprobantes, cantidad, totalDebe, totalHaber })
    return res.status(200).json({ detallesComprobantes, cantidad, totalDebe, totalHaber })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar detalles del comprobante' + e.message })
  }
}
export const saveDetalleComprobante = async (req, res) => {
  const {
    clienteId,
    comprobanteId,
    periodoId,
    cuentaId,
    cuentaCodigo,
    cuentaNombre,
    descripcion,
    fecha,
    debe,
    haber,
    cCosto,
    terceroId,
    pagina,
    itemsPorPagina
  } = req.body
  // console.log({ body: req.body, file: req.files })
  // console.log({ fecha: moment(fecha, 'YYYY/MM/DD').isValid() })
  if (!clienteId) return res.status(400).json({ error: 'Debe seleccionar un cliente' })
  if (!comprobanteId) return res.status(400).json({ error: 'Debe seleccionar un comprobante' })
  if (!moment(fecha, 'YYYY/MM/DD').isValid()) return res.status(400).json({ error: 'Debe seleccionar una fecha valida' })
  try {
    const datosDetalle = {
      cuentaId: new ObjectId(cuentaId),
      cuentaCodigo,
      cuentaNombre,
      comprobanteId: new ObjectId(comprobanteId),
      periodoId: new ObjectId(periodoId),
      descripcion,
      fecha: moment(fecha, 'YYYY/MM/DD').toDate(),
      debe: debe ? parseFloat(debe) : 0,
      haber: haber ? parseFloat(haber) : 0,
      cCosto,
      terceroId: terceroId ? new ObjectId(terceroId) : '',
      fechaCreacion: moment().toDate(),
      documento: {
        docReferencia: req.body.docReferencia,
        docFecha: req.body.docFecha ? moment(req.body.docFecha, 'YYYY/MM/DD').toDate() : null,
        docTipo: req.body.docTipo,
        docObservacion: req.body.docObservacion
      }
    }
    if (req.files) {
      const documento = req.files.documentoFile
      const extension = documento.mimetype.split('/')[1]
      const namePath = `${documento.name}`
      const resDoc = await uploadImg(documento.data, namePath)
      datosDetalle.documento.documento =
        {
          path: resDoc.filePath,
          name: resDoc.name,
          url: resDoc.url,
          type: extension,
          fileId: resDoc.fileId
        }
    }
    await createItemSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      item: datosDetalle
    })
    const { detallesComprobantes, cantidad, totalDebe, totalHaber } = await agregateDetalleComprobante({ clienteId, comprobanteId, itemsPorPagina, pagina })
    return res.status(200).json({ status: 'detalle de comprobante  guardado exitosamente', detallesComprobantes, cantidad, totalDebe, totalHaber })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el detalle del comprobante' + e.message })
  }
}
export const updateDetalleComprobante = async (req, res) => {
  const {
    clienteId,
    comprobanteId,
    periodoId,
    _id,
    cuentaId,
    cuentaCodigo,
    cuentaNombre,
    descripcion,
    fecha,
    debe,
    haber,
    cCosto,
    terceroId,
    pagina,
    itemsPorPagina
  } = req.body
  if (!clienteId) return res.status(400).json({ error: 'Debe seleccionar un cliente' })
  if (!comprobanteId) return res.status(400).json({ error: 'Debe seleccionar un comprobante' })
  if (!moment(fecha, 'YYYY/MM/DD').isValid()) return res.status(400).json({ error: 'Debe seleccionar una fecha valida' })
  try {
    const datosDetalle = {
      cuentaId: new ObjectId(cuentaId),
      cuentaCodigo,
      cuentaNombre,
      comprobanteId: new ObjectId(comprobanteId),
      periodoId: new ObjectId(periodoId),
      descripcion,
      fecha: moment(fecha, 'YYYY/MM/DD').toDate(),
      debe: debe ? parseFloat(debe) : 0,
      haber: haber ? parseFloat(haber) : 0,
      cCosto,
      terceroId: terceroId ? new ObjectId(terceroId) : '',
      documento: {
        docReferencia: req.body.docReferencia,
        docFecha: req.body.docFecha ? moment(req.body.docFecha, 'YYYY/MM/DD').toDate() : null,
        docTipo: req.body.docTipo,
        docObservacion: req.body.docObservacion
      }
    }
    if (req.files) {
      const documento = req.files.documentoFile
      const extension = documento.mimetype.split('/')[1]
      const namePath = `${documento.name}`
      const resDoc = await uploadImg(documento.data, namePath)
      datosDetalle.documento.documento =
        {
          path: resDoc.filePath,
          name: resDoc.name,
          url: resDoc.url,
          type: extension,
          fileId: resDoc.fileId
        }
    }
    await updateItemSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: { $set: datosDetalle }
    })
    const { detallesComprobantes, cantidad, totalDebe, totalHaber } = await agregateDetalleComprobante({ clienteId, comprobanteId, itemsPorPagina, pagina })
    return res.status(200).json({ status: 'detalle de comprobante  actualizado exitosamente', detallesComprobantes, cantidad, totalDebe, totalHaber })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el detalle del comprobante' + e.message })
  }
}
export const deleteDetalleComprobante = async (req, res) => {
  const { clienteId, comprobanteId, pagina, itemsPorPagina, detalle } = req.body
  console.log({ deleteBody: req.body })
  if (!clienteId) return res.status(400).json({ error: 'Debe seleccionar un cliente' })
  console.log(detalle)
  try {
    await deleteImg(detalle?.documento?.documento?.fileId)
    await deleteItemSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(detalle._id) }
    })
    const { detallesComprobantes, cantidad, totalDebe, totalHaber } = await agregateDetalleComprobante({ clienteId, comprobanteId, itemsPorPagina, pagina })
    return res.status(200).json({ status: 'detalle de comprobante eliminado exitosamente', detallesComprobantes, cantidad, totalDebe, totalHaber })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar el detalle del comprobante' + e.message })
  }
}
