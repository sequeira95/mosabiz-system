import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, deleteItemSD, formatCollectionName, getCollectionSD, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { deleteImg, uploadImg } from '../../../utils/cloudImage.js'
import { subDominioName } from '../../../constants.js'

export const getEmpleadosByPerfiles = async (req, res) => {
  const { clienteId, perfiles, excluirPerfiles, empleados, excluirEmpleados } = req.body
  try {
    const query = {
      $or: [
        {
          $and: [
            // and de perfiles, excluirPerfiles, excluirEmpleados
          ]
        },
      ]
    }
    if (excluirPerfiles[0]) {
      query.$or[0].$and.push({
        perfiles: { $not: { $elemMatch: { $in: excluirPerfiles.map(e => new ObjectId(e)) } } }
      })
      // query.perfiles = { $not: { $elemMatch: { $in: excluirPerfiles.map(e => new ObjectId(e)) } } }
    }
    if (perfiles[0]) {
      query.$or[0].$and.push(...perfiles.map(e => {
        return {
          perfiles: { $elemMatch: { $eq: new ObjectId(e) } }
        }
      }))
    }
    if (excluirEmpleados[0]) {
      query.$or[0].$and.push({
        _id: { $nin: excluirEmpleados.map(e => new ObjectId(e)) }
      })
    }
    if (empleados[0]) {
      query.$or.push({
        _id: { $in: empleados.map(e => new ObjectId(e)) }
      })
    }
    if (!query.$or[0].$and[0]) {
      query.$or.splice(0, 1)
    }

    const [empleadosCount] = await agreggateCollectionsSD({
      nameCollection: 'empleados',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: query
        },
        { $count: 'total' }
      ]
    })
    return res.status(200).json({ empleados: empleadosCount })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener la lista de empleados: ' + e.message })
  }
}

export const getNominas = async (req, res) => {
  const { clienteId } = req.body
  try {
    const nominas = await agreggateCollectionsSD({
      nameCollection: 'nominas',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $addFields: {
            montoBase: {
              $cond: {
                if: { $eq: ['$tipo', 'Bono'] },
                then: 0,
                else: '$monto'
              }
            },
            montoBono: {
              $cond: {
                if: { $eq: ['$tipo', 'Bono'] },
                then: '$monto',
                else: 0
              }
            },
            montoDeducciones: {
              $reduce: {
                input: {
                  $map: {
                    input: '$deducciones',
                    as: 'deduccion',
                    in: {
                      $cond: {
                        if: { $gt: ['$$deduccion.monto', 0] },
                        then: '$$deduccion.monto',
                        else: {
                          $multiply: [
                            { $divide: ['$$deduccion.porcentaje', 100] },
                            '$monto'
                          ]
                        }
                      }
                    }
                  }
                },
                initialValue: 0,
                in: { $add: ['$$value', '$$this'] }
              }
            },
          }
        },
        ...lookupEmpleados
      ]
    })
    return res.status(200).json({ nominas })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener la lista de perfiles: ' + e.message })
  }
}

export const upsertNomina = async (req, res) => {
  const {
    clienteId, nomina: {
      _id,
      nombre,
      perfiles,
      excluirPerfiles,
      excluirEmpleados
    },
    uid: creadoPor
  } = req.body
  try {
    if (!nombre) throw new Error('Debe ingresar el nombre de la nomina')
    if (_id) {
      updateItemSD({
        nameCollection: 'nominas',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: {
            nombre,
            perfiles: perfiles.map(e => new ObjectId(e)) || [],
            excluirPerfiles: excluirPerfiles.map(e => new ObjectId(e)) || [],
            excluirEmpleados: excluirEmpleados.map(e => new ObjectId(e)) || [],
            actualizadoPor: new ObjectId(creadoPor)
          }
        }
      })
    } else {
      await createItemSD({
        nameCollection: 'nominas',
        enviromentClienteId: clienteId,
        item: {
          nombre,
          perfiles: perfiles.map(e => new ObjectId(e)) || [],
          excluirPerfiles: excluirPerfiles.map(e => new ObjectId(e)) || [],
          excluirEmpleados: excluirEmpleados.map(e => new ObjectId(e)) || [],
          creadoPor: new ObjectId(creadoPor),
          fechaCreacion: momentDate().toDate()
        }
      })
    }
    return res.status(200).json({ status: 'Configuración de nomina creado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar la nomina: ' + e.message })
  }
}
