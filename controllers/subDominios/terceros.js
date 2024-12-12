import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, deleteItemSD, getCollectionSD, upsertItemSD, updateManyItemSD, formatCollectionName, getItemSD, deleteManyItemsSD } from '../../utils/dataBaseConfing.js'
import { subDominioName } from '../../constants.js'

export const getTerceros = async (req, res) => {
  const { clienteId, cuentaId } = req.body
  try {
    const terceros = await agreggateCollectionsSD({
      nameCollection: 'terceros',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { cuentaId: new ObjectId(cuentaId) } }
      ]
    })
    return res.status(200).json({ terceros })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar los terceros' + e.message })
  }
}
export const theRealGetTerceros = async (req, res) => {
  const { clienteId } = req.body
  try {
    const planCuentasCol = formatCollectionName({
      enviromentClienteId: clienteId,
      enviromentEmpresa: subDominioName,
      nameCollection: 'planCuenta'
    })
    const terceros = await agreggateCollectionsSD({
      nameCollection: 'terceros',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $lookup: {
            from: planCuentasCol,
            localField: 'cuentaId',
            foreignField: '_id',
            pipeline: [
              {
                $project: {
                  _id: 1,
                  codigo: '$codigo',
                  descripcion: '$descripcion',
                }
              }
            ],
            as: 'cuenta'
          }
        },
        { $unwind: { path: '$cuenta', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$nombre',
            cuenta: {
              $push: { codigo: '$cuenta.codigo', descripcion: '$cuenta.descripcion' }
            },
            nombre: {
              $first: '$nombre'
            }
          }
        },
        { $sort: { _id: 1 } }
      ]
    })
    return res.status(200).json({ terceros })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar los terceros' + e.message })
  }
}
export const saveTerceros = async (req, res) => {
  const { nombre, clienteId, _id, cuentaId } = req.body
  const nombreUppercase = String(nombre).trim().toUpperCase()
  try {
    const tercero = await upsertItemSD({
      nameCollection: 'terceros',
      enviromentClienteId: clienteId,
      filters: _id ? { _id: new ObjectId(_id) } : { nombre: nombreUppercase },
      update: {
        $set: _id
          ? {
              nombre: nombreUppercase,
              cuentaId: new ObjectId(cuentaId)
            }
          : { cuentaId: new ObjectId(cuentaId) }
      }
    })
    if (_id) {
      console.log('Actualizando detalle de comprobante')
      const periodosActivos = (await getCollectionSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { activo: true } })).map(e => new ObjectId(e._id))
      await updateManyItemSD(
        {
          nameCollection: 'detallesComprobantes',
          enviromentClienteId: clienteId,
          filters: { terceroId: new ObjectId(_id), periodoId: { $in: periodosActivos } },
          update: {
            $set: {
              terceroNombre: nombreUppercase
            }
          }
        })
    }
    return res.status(200).json({ status: 'Tercero creado exitosamente', tercero })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar un tercero' + e.message })
  }
}
export const saveTercerosMany = async (req, res) => {
  const { clienteId, terceros } = req.body
  if (!Array.isArray(terceros)) return res.status(500).json({ error: 'Error de servidor al momento de guardar los terceros: Formato invalido' })
  try {
    const pipeline = terceros.map(({ nombre, cuentaId }) => {
      const nombreUppercase = String(nombre).trim().toUpperCase()
      return {
        updateOne: {
          filter: { nombre: nombreUppercase },
          update: {
            $set: {
              cuentaId: new ObjectId(cuentaId)
            }
          },
          upsert: true
        }
      }
    })
    await bulkWriteSD({ nameCollection: 'terceros', enviromentClienteId: clienteId, pipeline })
    return res.status(200).json({ status: 'Terceros creados exitosamente' })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar un tercero' + e.message })
  }
}
export const deleteTercero = async (req, res) => {
  const { clienteId, _id } = req.body
  try {
    await deleteItemSD({ nameCollection: 'terceros', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    const periodosActivos = (await getCollectionSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { activo: true } })).map(e => new ObjectId(e._id))
    console.log({ periodosActivos })
    await updateManyItemSD(
      {
        nameCollection: 'detallesComprobantes',
        enviromentClienteId: clienteId,
        filters: { terceroId: new ObjectId(_id), periodoId: { $in: periodosActivos } },
        update: {
          $set: {
            terceroNombre: null,
            terceroId: null
          }
        }
      })
    return res.status(200).json({ status: 'Tercero eliminado exitosamente' })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar un tercero' + e.message })
  }
}
export const mergeTerceros = async (req, res) => {
  const { clienteId, tercerosMerge, terceroPreserve } = req.body
  try {
    if (!tercerosMerge || !tercerosMerge[0]) throw new Error('Debe seleccionar al menos un tercero para combinar')
    const periodosActivos = (await getCollectionSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { activo: true } })).map(e => new ObjectId(e._id))
    for (const nombre of tercerosMerge) {
      const terceros = await getCollectionSD({
        nameCollection: 'terceros',
        enviromentClienteId: clienteId,
        filters: { nombre }
      })
      // buscar las cuentas de los terceros
      const cuentasId = [...new Set(terceros.map(e => e.cuentaId))]
      const cuentasTerceros = await getCollectionSD({
        nameCollection: 'planCuenta',
        enviromentClienteId: clienteId,
        filters: { _id: { $in: cuentasId } }
      })
      // se iteran las cuentas terceros para chekear que no existe algun tercero con
      // nombre igual al tercero preserve
      for (const cuenta of cuentasTerceros) {
        const existeTerceroPreserve = await upsertItemSD({
          nameCollection: 'terceros',
          enviromentClienteId: clienteId,
          filters: { nombre: terceroPreserve, cuentaId: cuenta._id },
          update: {
            $set: {
              nombre: terceroPreserve,
            }
          }
        })
        if (existeTerceroPreserve) {
          await updateManyItemSD({
            nameCollection: 'detallesComprobantes',
            enviromentClienteId: clienteId,
            filters: {
              periodoId: { $in: periodosActivos },
              terceroNombre: { $in: tercerosMerge },
              cuentaId: cuenta._id
            },
            update: {
              $set: {
                terceroId: existeTerceroPreserve._id,
                terceroNombre: existeTerceroPreserve.terceroNombre,
              }
            }
          })
        }
      }
    }
    await deleteManyItemsSD({
      nameCollection: 'terceros',
      enviromentClienteId: clienteId,
      filters: {
        nombre: { $in: tercerosMerge },
      }
    })
    /* const tercero = await getItemSD({
      nameCollection: 'terceros',
      enviromentClienteId: clienteId,
      filters: { nombre: terceroPreserve }
    })
    if (!tercero) throw new Error('El tercero para preservar ya no existe')
    const cuentaTercero = await getItemSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      filters: { _id: tercero.cuentaId }
    })
    if (!cuentaTercero) throw new Error('El tercero para preservar no tiene una cuenta asignada')
    await updateManyItemSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      filters: {
        periodoId: { $in: periodosActivos },
        terceroId: { $in: tercerosMerge.map(e => new ObjectId(e)) },
      },
      update: {
        $set: {
          cuentaId: cuentaTercero._id,
          cuentaCodigo: cuentaTercero.codigo,
          cuentaNombre: cuentaTercero.descripcion,
          terceroId: tercero._id,
          terceroNombre: tercero.terceroNombre,
        }
      }
    })
    await deleteManyItemsSD({
      nameCollection: 'terceros',
      enviromentClienteId: clienteId,
      filters: {
        _id: { $in: tercerosMerge.map(e => new ObjectId(e)) },
      }
    })
    console.log(tercero) */
    return res.status(200).json({ status: 'Terceros combinados satisfactoriamente' })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar los terceros' + e.message })
  }
}
