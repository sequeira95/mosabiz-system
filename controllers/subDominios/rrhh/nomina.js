import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, deleteItemSD, formatCollectionName, getCollectionSD, getItemSD, updateItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import { deleteImg, uploadImg } from '../../../utils/cloudImage.js'
import { subDominioName } from '../../../constants.js'

export const getEmpleadosByPerfiles = async (req, res) => {
  const { clienteId, perfiles, excluirPerfiles, empleados, excluirEmpleados } = req.body
  try {
    const query = {
      activo: true,
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
    if (!query.$or[0]) {
      return res.status(200).json({ empleados: { total: 0 } })
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

export const getEmpleadostoCalculos = async (req, res) => {
  const { clienteId, perfiles, excluirPerfiles, empleados, excluirEmpleados, filters, itemsPorPagina, pagina } = req.body
  const queryEmpelados = { activo: true }
  try {
    if (filters.nombre) {
      const text = filters.nombre.replaceAll(' ', '\\s+')
      queryEmpelados.nombre = { $regex: `/${text}/`, $options: 'xi' }
    }
    if (filters.codigo) {
      const text = filters.codigo.replaceAll(' ', '\\s+')
      queryEmpelados.codigo = { $regex: `/${text}/`, $options: 'xi' }
    }
    if (filters.cargo) {
      const text = filters.cargo.replaceAll(' ', '\\s+')
      queryEmpelados.cargo = { $regex: `/${text}/`, $options: 'xi' }
    }
    if (filters.fechaContrato) {
      queryEmpelados.fechaContrato = { $gte: momentDate(undefined, filters.fechaContrato).toDate() }
    }
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
    if (!query.$or[0]) {
      delete query.$or
    }

    const empleadosList = await agreggateCollectionsSD({
      nameCollection: 'empleados',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: query
        },
        { $skip: ((pagina || 1) - 1) * (itemsPorPagina || 10) },
        { $limit: itemsPorPagina || 10 },
      ]
    })
    return res.status(200).json({ empleados: empleadosList })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener la lista de empleados: ' + e.message })
  }
}

export const getEmpleadosBySelected = async (req, res) => {
  const { clienteId, empleadosId } = req.body
  try {
    if (!empleadosId[0]) return res.status(200).json({ empleados: [] })
    const empleadosSelected = await agreggateCollectionsSD({
      nameCollection: 'empleados',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { _id: { $in: empleadosId.map(e => new ObjectId(e)) } } }
      ]
    })
    return res.status(200).json({ empleados: empleadosSelected })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtener la lista de empleados: ' + e.message })
  }
}

export const getNominaValues = async (req, res) => {
  const {
    clienteId,
    perfiles,
    excluirPerfiles,
    empleados,
    excluirEmpleados,
    horasPerfiles,
    horasEmpleados,
    periodo
  } = req.body
  const query = {
    activo: true,
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
  if (!query.$or[0]) {
    return res.status(500).json({ error: 'No existen empleados en esta nomina' })
  }
  const perfilesCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'perfiles' })
  const ajustesRRHH = await getItemSD({ enviromentClienteId: clienteId, nameCollection: 'ajustes', filters: { tipo: 'rrhh' } })
  const base = ajustesRRHH?.horasBase || 0
  const extras = ajustesRRHH?.horasExtras || 0
  const nocturnas = ajustesRRHH?.horasNocturnas || 0
  /*
  if (base !== 0 && !base) throw new Error('Se necesita el ajuste de la cantidad de horas laborales por dia')
  if (extras !== 0 && !extras) throw new Error('Se necesita el ajuste de la cantidad de horas laborales por dia')
  if (nocturnas !== 0 && !nocturnas) throw new Error('Se necesita el ajuste de la cantidad de horas laborales por dia')
  */
  const [items] = await agreggateCollectionsSD({
    nameCollection: 'empleados',
    enviromentClienteId: clienteId,
    pipeline: [
      {
        $match: query
      },
      {
        $lookup: {
          from: perfilesCol,
          localField: 'perfiles',
          foreignField: '_id',
          pipeline: [
            { $match: { isNomina: true } },
            {
              $addFields: {
                montoBase: {
                  $cond: {
                    if: { $ne: ['$tipo', 'Bono'] },
                    then: '$monto',
                    else: 0
                  }
                },
                montoBono: {
                  $cond: {
                    if: { $eq: ['$tipo', 'Bono'] },
                    then: '$monto',
                    else: 0
                  }
                },
                deduccionesBase: {
                  $cond: {
                    if: { $ne: ['$tipo', 'Bono'] },
                    then: {
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
                    else: 0
                  }
                },
                deduccionesBono: {
                  $cond: {
                    if: { $eq: ['$tipo', 'Bono'] },
                    then: {
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
                    else: 0
                  }
                },
              }
            },
            {
              $group: {
                _id: 0,
                montoBase: {
                  $sum: {
                    $subtract: ['$montoBase', '$deduccionesBase']
                  }
                },
                montoBono: {
                  $sum: {
                    $subtract: ['$montoBono', '$deduccionesBono']
                  }
                }
              }
            },
            {
              $project: {
                montoBase: {
                  $cond: {
                    if: { $eq: [periodo, 'Semanal'] },
                    then: {
                      $multiply: [7, { $divide: ['$montoBase', 30] } ]
                    },
                    else: {
                      $cond: {
                        if: { $eq: [periodo, 'Quincenal'] },
                        then: {
                          $divide: ['$montoBase', 2]
                        },
                        else: '$montoBase'
                      }
                    }
                  }
                },
                montoBono: {
                  $cond: {
                    if: { $eq: [periodo, 'Semanal'] },
                    then: {
                      $multiply: [7, { $divide: ['$montoBono', 30] } ]
                    },
                    else: {
                      $cond: {
                        if: { $eq: [periodo, 'Quincenal'] },
                        then: {
                          $divide: ['$montoBono', 2]
                        },
                        else: '$montoBono'
                      }
                    }
                  }
                }
              }
            }
          ],
          as: 'perfilesSalario'
        }
      },
      { $unwind: { path: '$perfilesSalario', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: 0,
          total: {
            $sum: 1
          },
          montoBase: {
            $sum: '$perfilesSalario.montoBase'
          },
          montoBono: {
            $sum: '$perfilesSalario.montoBono'
          }
        }
      }
    ]
  })
  return res.status(200).json({ values: items })
}

export const getNominas = async (req, res) => {
  const { clienteId, itemsPorPagina, pagina, nominaId } = req.body
  try {
    const ajustesRRHH = await getItemSD({ enviromentClienteId: clienteId, nameCollection: 'ajustes', filters: { tipo: 'rrhh' } })
    if (!ajustesRRHH?.horasBase) throw new Error('Se necesita el ajuste de la cantidad de horas laborales por dia')
    const perfilesCol = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'perfiles' })
    const stage = []
    if (nominaId) {
      stage.push({ $match: { _id: new ObjectId(nominaId) } })
    }
    const nominas = await agreggateCollectionsSD({
      nameCollection: 'nominas',
      enviromentClienteId: clienteId,
      pipeline: [
        ...stage,
        { $skip: ((pagina || 1) - 1) * (itemsPorPagina || 10) },
        { $limit: itemsPorPagina || 10 },
      ]
    })
    for (const nomina of nominas) {
      const query = {
        activo: true,
        $or: [
          {
            $and: [
              // and de perfiles, excluirPerfiles, excluirEmpleados
            ]
          },
        ]
      }
      if (nomina.excluirPerfiles[0]) {
        query.$or[0].$and.push({
          perfiles: { $not: { $elemMatch: { $in: nomina.excluirPerfiles.map(e => new ObjectId(e)) } } }
        })
        // query.perfiles = { $not: { $elemMatch: { $in: excluirPerfiles.map(e => new ObjectId(e)) } } }
      }
      if (nomina.perfiles[0]) {
        query.$or[0].$and.push(...nomina.perfiles.map(e => {
          return {
            perfiles: { $elemMatch: { $eq: new ObjectId(e) } }
          }
        }))
      }
      if (nomina.excluirEmpleados[0]) {
        query.$or[0].$and.push({
          _id: { $nin: nomina.excluirEmpleados.map(e => new ObjectId(e)) }
        })
      }
      if (nomina.empleados[0]) {
        query.$or.push({
          _id: { $in: nomina.empleados.map(e => new ObjectId(e)) }
        })
      }
      if (!query.$or[0].$and[0]) {
        query.$or.splice(0, 1)
      }
      const [empleados] = await agreggateCollectionsSD({
        nameCollection: 'empleados',
        enviromentClienteId: clienteId,
        pipeline: [
          {
            $match: query
          },
          {
            $lookup: {
              from: perfilesCol,
              localField: 'perfiles',
              foreignField: '_id',
              pipeline: [
                { $match: { isNomina: true } },
                {
                  $addFields: {
                    montoBase: {
                      $cond: {
                        if: { $ne: ['$tipo', 'Bono'] },
                        then: '$monto',
                        else: 0
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
                {
                  $group: {
                    _id: 0,
                    salario: {
                      $sum: {
                        $subtract: [{ $add: ['$montoBase', '$montoBono'] }, '$montoDeducciones']
                      }
                    }
                  }
                }
              ],
              as: 'perfilesSalario'
            }
          },
          { $unwind: { path: '$perfilesSalario', preserveNullAndEmptyArrays: true } },
          {
            $group: {
              _id: 0,
              total: {
                $sum: 1
              },
              monto: {
                $sum: '$perfilesSalario.salario'
              }
            }
          }
        ]
      })
      nomina.monto = empleados.monto
      nomina.empleadosCount = empleados.total
    }
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
      periodo,
      observacion,
      perfiles,
      empleados,
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
            periodo,
            observacion,
            perfiles: perfiles.map(e => new ObjectId(e)) || [],
            empleados: empleados.map(e => new ObjectId(e)) || [],
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
          periodo,
          observacion,
          perfiles: perfiles.map(e => new ObjectId(e)) || [],
          empleados: empleados.map(e => new ObjectId(e)) || [],
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

export const deleteNomina = async (req, res) => {
  const {
    clienteId, nominaId
  } = req.body
  try {
    if (!nominaId) throw new Error('Debe seleccionar una nomina')
    await deleteItemSD({
      enviromentClienteId: clienteId,
      nameCollection: 'nominas',
      filters: { _id: new ObjectId(nominaId) },
    })
    return res.status(200).json({ status: 'Nomina eliminada exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar la nomina: ' + e.message })
  }
}
