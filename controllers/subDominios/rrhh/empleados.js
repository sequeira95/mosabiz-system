import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, deleteItemSD, formatCollectionName, getCollectionSD, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { deleteImg, uploadImg } from '../../../utils/cloudImage.js'
import { subDominioName } from '../../../constants.js'

export const getEmpleados = async (req, res) => {
  const { clienteId, filters } = req.body
  const query = {}
  try {
    if (filters.nombre) {
      const text = filters.nombre.replaceAll(' ', '\\s+')
      query.nombre = { $regex: `/${text}/`, $options: 'xi' }
    }
    if (filters.codigo) {
      const text = filters.codigo.replaceAll(' ', '\\s+')
      query.codigo = { $regex: `/${text}/`, $options: 'xi' }
    }
    if (filters.cargo) {
      const text = filters.cargo.replaceAll(' ', '\\s+')
      query.cargo = { $regex: `/${text}/`, $options: 'xi' }
    }
    if (filters.fechaContrato) {
      query.fechaContrato = { $gte: momentDate(undefined, filters.fechaContrato).toDate() }
    }
    if (filters.activo) {
      query.activo = filters.activo
    }

    const empleados = await agreggateCollectionsSD({
      nameCollection: 'empleados',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: query }
      ]
    })
    return res.status(200).json({ empleados })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener la lista de empleados: ' + e.message })
  }
}
export const upsertEmpleados = async (req, res) => {
  const {
    clienteId, empleado: {
      _id,
      codigo,
      nombre,
      email,
      telefono,
      fechaNacimiento,
      foto,
      pais,
      ciudad,
      direccion,
      tipo,
      tiempoContrato,
      cargo,
      perfiles,
      observacion,
      activo
    },
    uid: creadoPor
  } = req.body
  try {
    if (!codigo) throw new Error('Debe ingresar el codigo del empleado')
    const objEmpleado = {
      codigo,
      nombre,
      email,
      telefono,
      fechaNacimiento: momentDate(undefined, fechaNacimiento).toDate(),
      foto,
      pais,
      ciudad,
      direccion,
      tipo,
      tiempoContrato,
      cargo,
      perfiles,
      observacion,
      activo
    }
    const existeEmpleado = await getItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'empleados',
      filters: { codigo: objEmpleado.codigo, activo: true },
    })
    if (existeEmpleado?._id && _id && existeEmpleado._id !== _id) throw new Error(`El codigo del empleado ya existe y pertenece a ${existeEmpleado.nombre || 'Sin nombre'}`)
    if (_id) {
      await updateItemSD({
        enviromentClienteId: clienteId,
        nameCollection: 'empleados',
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: { ...objEmpleado, actualizadoPor: new ObjectId(creadoPor) }
        }
      })
    } else {
      await createItemSD({
        enviromentClienteId: clienteId,
        nameCollection: 'empleados',
        item: { ...objEmpleado, creadoPor: new ObjectId(creadoPor) }
      })
    }
    return res.status(200).json({ status: 'Empleado creado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el empleado: ' + e.message })
  }
}
export const saveEmpleados = async (req, res) => {
  const { clienteId, empleados, uid: creadoPor } = req.body
  let index = 1
  try {
    if (!empleados[0]) return res.status(400).json({ error: 'Hubo un error al momento de procesar la lista de empleados' })

    for (const empleado of empleados) {
      index++
      if (!empleado.codigo) throw new Error(`La linea ${index} no tiene codigo`)
      const objEmpleado = {
        // codigo: empleado.codigo,
        nombre: empleado.nombre,
        email: empleado.email,
        telefono: empleado.telefono,
        fechaNacimiento: fechaNacimiento.fechaNacimiento ? momentDate(undefined, empleado.fechaNacimiento).toDate(): undefined,
        foto: empleado.foto,
        pais: empleado.pais,
        ciudad: empleado.ciudad,
        direccion: empleado.direccion,
        tipo: empleado.tipo,
        tiempoContrato: empleado.tiempoContrato,
        cargo: empleado.cargo,
        perfiles: empleado.perfiles,
        observacion: empleado.observacion,
        activo: empleado.activo,
        actualizadoPor: creadoPor
      }
      await upsertItemSD({
        enviromentClienteId: clienteId,
        nameCollection: 'empleados',
        filters: { codigo: empleado.codigo },
        update: {
          $set: {
            ...objEmpleado,
            creadoPor: { $ifNull: ['$creadoPor', creadoPor] }
          }
        }
      })
    }
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: `Error de servidor al momento de guardar los empleados, ultima linea: ${index}, error: ${e.message} ` })
  }
}
export const deleteEmpleado = async (req, res) => {
  const {
    clienteId, empleadoId
  } = req.body
  try {
    if (!empleadoId) throw new Error('Debe seleccionar un empleado')
    await updateItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'empleados',
      filters: { _id: new ObjectId(empleadoId) },
      update: {
        $set: { activo: false }
      }
    })
    return res.status(200).json({ status: 'Empleado eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar el empleado: ' + e.message })
  }
}
