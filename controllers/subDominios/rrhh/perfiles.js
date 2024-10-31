import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, deleteItemSD, formatCollectionName, getCollectionSD, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { deleteImg, uploadImg } from '../../../utils/cloudImage.js'
import { subDominioName } from '../../../constants.js'

export const getPerfiles = async (req, res) => {
  const { clienteId, withEmpleados, countEmpleados } = req.body
  try {
    const lookupEmpleados = []
    if (withEmpleados) {
      const empleadosCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'empleados' })
      lookupEmpleados.push({
        $lookup: {
          from: empleadosCol,
          localField: '_id',
          foreignField: 'perfiles',
          as: 'empleados'
        }
      })
    }
    if (countEmpleados) {
      const empleadosCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'empleados' })
      lookupEmpleados.push(
        {
          $lookup: {
            from: empleadosCol,
            localField: '_id',
            foreignField: 'perfiles',
            pipeline: [
              { $count: 'total' }
            ],
            as: 'empleados'
          }
        },
        { $unwind: { path: '$empleados', preserveNullAndEmptyArrays: true } },
      )
    }
    const perfiles = await agreggateCollectionsSD({
      nameCollection: 'perfiles',
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
    return res.status(200).json({ perfiles })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener la lista de perfiles: ' + e.message })
  }
}
export const upsertPerfiles = async (req, res) => {
  const {
    clienteId, perfil: {
      _id,
      nombre,
      tipo,
      monto,
      aplicaDeducciones,
      deducciones,
      isVacaciones,
      isPSociales,
      isLiquidacion,
      isHExtras,
      isHNocturas,
      isNomina
    },
    uid: creadoPor
  } = req.body
  try {
    if (!nombre) throw new Error('Debe ingresar el nombre del perfil')
    const objPerfil = {
      nombre,
      tipo,
      monto: Number(monto) ? Number(monto) : 0,
      aplicaDeducciones: !!aplicaDeducciones,
      deducciones: deducciones.map(e => {
        return {
          nombre: (typeof e.nombre === 'string' && e.nombre) || 'Sin nombre',
          porcentaje: Number(e.porcentaje) ? Number(e.porcentaje) : 0,
          monto: Number(e.monto) ? Number(e.monto) : 0,
        }
      }),
      isVacaciones: !!isVacaciones,
      isPSociales: !!isPSociales,
      isHExtras: !!isHExtras,
      isHNocturas: !!isHNocturas,
      isNomina: !!isNomina,
      isLiquidacion: !!isLiquidacion,
    }
    const existePerfil = await getItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'perfiles',
      filters: { nombre: objPerfil.nombre },
    })
    if (existePerfil?._id && _id && String(existePerfil._id) !== _id) throw new Error('El nombre del perfil ya existe')
    if (!_id && existePerfil?._id) throw new Error('El nombre del perfil ya existe')
    if (_id) {
      await updateItemSD({
        enviromentClienteId: clienteId,
        nameCollection: 'perfiles',
        filters: { _id: new ObjectId(_id) },
        update: {
          $set: { ...objPerfil, actualizadoPor: new ObjectId(creadoPor) }
        }
      })
    } else {
      await upsertItemSD({
        enviromentClienteId: clienteId,
        nameCollection: 'perfiles',
        filters: { nombre: objPerfil.nombre },
        update: [
          {
            $set: {
              ...objPerfil,
              creadoPor: { $ifNull: ['$creadoPor', new ObjectId(creadoPor)] },
              fechaCreacion: { $ifNull: ['$fechaCreacion', momentDate().toDate()] }
            }
          }
        ]
      })
    }
    return res.status(200).json({ status: 'Perfil creado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el perfil: ' + e.message })
  }
}
