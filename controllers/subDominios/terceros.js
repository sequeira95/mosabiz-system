import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, deleteItemSD, getCollectionSD, upsertItemSD, updateManyItemSD, formatCollectionName, deleteManyItemsSD, getItemSD, createManyItemsSD } from '../../utils/dataBaseConfing.js'
import { subDominioName } from '../../constants.js'

export const getTerceros = async (req, res) => {
  const { clienteId, cuentasId, combinarTerceros } = req.body
  try {
    // console.log(req.body)
    const matchConfig = {}
    /* if (cuentaId) {
      matchConfig.cuentaId = new ObjectId(cuentaId)
    } */
    const groupCombinar = []
    if (combinarTerceros || (cuentasId && cuentasId[0])) {
      if (cuentasId && cuentasId[0]) {
        matchConfig.cuentaId = { $in: cuentasId.map((e) => new ObjectId(e._id)) }
      }
      groupCombinar.push({
        $group: {
          _id: '$nombre',
          cuentas: {
            $push: { codigo: '$cuenta.codigo', descripcion: '$cuenta.descripcion', _id: '$cuenta._id' }
          },
          ids: {
            $push: '$_id'
          },
          nombre: {
            $first: '$nombre'
          }
        }
      })
    }
    const planCuentasCol = formatCollectionName({ enviromentClienteId: clienteId, enviromentEmpresa: subDominioName, nameCollection: 'planCuenta' })
    const terceros = await agreggateCollectionsSD({
      nameCollection: 'terceros',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: matchConfig },
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
        ...groupCombinar
      ]
    })
    return res.status(200).json({ terceros })
  } catch (e) {
    console.log(e)
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
  const { nombre, clienteId, _id, cuentaId, cuentasId, multiCuentas } = req.body
  const nombreUppercase = String(nombre).trim().toUpperCase()
  try {
    if (multiCuentas && multiCuentas[0]) {
      const dataTerceros = (await getCollectionSD({
        nameCollection: 'terceros',
        enviromentClienteId: clienteId,
        filters: { nombre: _id }
      })).map(e => e._id)
      console.log(dataTerceros)
      await updateManyItemSD({
        nameCollection: 'terceros',
        enviromentClienteId: clienteId,
        filters: { _id: { $in: dataTerceros } },
        update: {
          $set: {
            nombre: nombreUppercase
          }
        }
      })
      console.log('Actualizando detalle de comprobante')
      const periodosActivos = (await getCollectionSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { activo: true } })).map(e => new ObjectId(e._id))
      await updateManyItemSD(
        {
          nameCollection: 'detallesComprobantes',
          enviromentClienteId: clienteId,
          filters: { terceroId: { $in: dataTerceros }, periodoId: { $in: periodosActivos } },
          update: {
            $set: {
              terceroNombre: nombreUppercase
            }
          }
        })
      return res.status(200).json({ status: 'Terceros guardados exitosamente' })
    }
    if (_id) {
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
      return res.status(200).json({ status: 'Tercero creado exitosamente', tercero })
    }
    if (cuentasId && cuentasId[0]) {
      const createItems = []
      for (const cuenta of cuentasId) {
        createItems.push({
          nombre: nombreUppercase,
          cuentaId: new ObjectId(cuenta._id)
        })
      }
      if (createItems[0]) {
        await createManyItemsSD({
          nameCollection: 'terceros',
          enviromentClienteId: clienteId,
          items: createItems
        })
        return res.status(200).json({ status: 'Tercero creado exitosamente' })
      }
    }
    const tercero = await upsertItemSD({
      nameCollection: 'terceros',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          nombre: nombreUppercase,
          cuentaId: new ObjectId(cuentaId)
        }
      }
    })
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
    const periodosActivos = (await getCollectionSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { activo: true } })).map(e => new ObjectId(e._id))
    const hasRegistrosContables = await getItemSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      filters: { terceroId: new ObjectId(_id), periodoId: { $in: periodosActivos } }
    })
    if (hasRegistrosContables) throw new Error('El tercero tiene registros contables asociados')
    await deleteItemSD({ nameCollection: 'terceros', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    console.log({ periodosActivos })
    /* await updateManyItemSD(
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
      }) */
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
export const cleanRegistros = async (req, res) => {
  const { clienteId, _id } = req.body
  try {
    const periodosActivos = (await getCollectionSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { activo: true } })).map(e => new ObjectId(e._id))
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
    return res.status(200).json({ status: 'El tercero ha sido limpiado de todos los registros contables' })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de limpiar los registros del tercero' + e.message })
  }
}
export const cleanMany = async (req, res) => {
  const { clienteId, terceros } = req.body
  try {
    console.log(terceros)
    const idsTerceros = []
    const periodosActivos = (await getCollectionSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { activo: true } })).map(e => new ObjectId(e._id))
    for (const tercero of terceros) {
      if (tercero?.cuentaId) {
        idsTerceros.push(tercero._id)
      }
      if (tercero?.cuentas && tercero?.cuentas[0]) {
        idsTerceros.push(...tercero.ids)
      }
    }
    console.log({ idsTerceros })
    await updateManyItemSD(
      {
        nameCollection: 'detallesComprobantes',
        enviromentClienteId: clienteId,
        filters: { terceroId: { $in: idsTerceros.map(e => new ObjectId(e)) }, periodoId: { $in: periodosActivos } },
        update: {
          $set: {
            terceroNombre: null,
            terceroId: null
          }
        }
      })
    return res.status(200).json({ status: 'los terceros han sido limpiado de todos los registros contables' })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de limpiar los registros del tercero' + e.message })
  }
}
export const deleteMany = async (req, res) => {
  const { clienteId, terceros } = req.body
  try {
    console.log(terceros)
    const idsTerceros = []
    const periodosActivos = (await getCollectionSD({ nameCollection: 'periodos', enviromentClienteId: clienteId, filters: { activo: true } })).map(e => new ObjectId(e._id))
    for (const tercero of terceros) {
      if (tercero?.cuentaId) {
        idsTerceros.push(tercero._id)
      }
      if (tercero?.cuentas && tercero?.cuentas[0]) {
        idsTerceros.push(...tercero.ids)
      }
    }
    console.log({ idsTerceros })
    const validarRegistros = await agreggateCollectionsSD({
      nameCollection: 'detallesComprobantes',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            terceroId: { $in: idsTerceros.map(e => new ObjectId(e)) },
            periodoId: { $in: periodosActivos }
          }
        },
        { $limit: 1 }
      ]
    })
    if (validarRegistros[0]) throw new Error('Existen terceros que tienen registros contables asociados')
    await deleteManyItemsSD({
      nameCollection: 'terceros',
      enviromentClienteId: clienteId,
      filters: {
        _id: { $in: idsTerceros.map(e => new ObjectId(e)) },
      }
    })
    await updateManyItemSD(
      {
        nameCollection: 'detallesComprobantes',
        enviromentClienteId: clienteId,
        filters: { terceroId: { $in: idsTerceros.map(e => new ObjectId(e)) }, periodoId: { $in: periodosActivos } },
        update: {
          $set: {
            terceroNombre: null,
            terceroId: null
          }
        }
      })
    return res.status(200).json({ status: 'los terceros han sido limpiado de todos los registros contables' })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de limpiar los registros del tercero' + e.message })
  }
}
