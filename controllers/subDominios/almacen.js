import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, bulkWriteSD, createItemSD, deleteItemSD, deleteManyItemsSD, formatCollectionName, getItemSD, updateItemSD } from '../../utils/dataBaseConfing.js'
import { deleteImg, uploadImg } from '../../utils/cloudImage.js'
import { subDominioName } from '../../constants.js'
export const getAlmacenes = async (req, res) => {
  const { clienteId, tipo } = req.body
  try {
    const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
    const matchTipo = !tipo ? { nombre: { $nin: ['Transito', 'Auditoria'] } } : {}
    const almacenes = await agreggateCollectionsSD({
      nameCollection: 'almacenes',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { ...matchTipo } },
        {
          $lookup: {
            from: productorPorAlamcenCollection,
            localField: '_id',
            foreignField: 'almacenId',
            pipeline: [
              {
                $group: {
                  _id: '$almacenId',
                  entrada: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoMovimiento', 'entrada'] }, then: '$cantidad', else: 0
                      }
                    }
                  },
                  salida: {
                    $sum: {
                      $cond: {
                        if: { $eq: ['$tipoMovimiento', 'salida'] }, then: '$cantidad', else: 0
                      }
                    }
                  }
                }
              },
              {
                $project: {
                  cantidad: { $subtract: ['$entrada', '$salida'] },
                  entrada: '$entrada',
                  salida: '$salida'
                }
              }
            ],
            as: 'productoPorAlmacen'
          }
        },
        { $unwind: { path: '$productoPorAlmacen', preserveNullAndEmptyArrays: true } }
      ]
    })
    return res.status(200).json({ almacenes })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtner datos de los alamcenes ' + e.message })
  }
}
export const getDataAlmacenAuditoria = async (req, res) => {
  const { clienteId } = req.body
  try {
    const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
    const productoCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productos' })
    const almacen = await agreggateCollectionsSD({
      nameCollection: 'almacenes',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { nombre: 'Auditoria' } },
        {
          $lookup: {
            from: productorPorAlamcenCollection,
            localField: '_id',
            foreignField: 'almacenId',
            pipeline: [
              {
                $group: {
                  _id: '$productoId',
                  sobrante: {
                    $sum: {
                      $cond: {
                        if: {
                          $and:
                          [
                            { $eq: ['$tipoAuditoria', 'sobrante'] },
                            { $ne: ['$afecta', 'Perdida'] },
                            { $ne: ['$afecta', 'Ganancia'] },
                            { $ne: ['$afecta', 'Almacen'] }
                          ]
                        },
                        then: '$cantidad',
                        else: 0
                      }
                    }
                  },
                  faltante: {
                    $sum: {
                      $cond: {
                        if: {
                          $and:
                          [
                            { $eq: ['$tipoAuditoria', 'faltante'] },
                            { $ne: ['$afecta', 'Perdida'] },
                            { $ne: ['$afecta', 'Ganancia'] },
                            { $ne: ['$afecta', 'Almacen'] }
                          ]
                        },
                        then: '$cantidad',
                        else: 0
                      }
                    }
                  },
                  ajusteSobrante: {
                    $sum: {
                      $cond: {
                        if: {
                          $and:
                          [
                            { $eq: ['$tipoAuditoria', 'sobrante'] },
                            {
                              $or:
                            [
                              { $eq: ['$afecta', 'Perdida'] },
                              { $eq: ['$afecta', 'Ganancia'] },
                              { $eq: ['$afecta', 'Almacen'] }
                            ]
                            }
                          ]
                        },
                        then: '$cantidad',
                        else: 0
                      }
                    }
                  },
                  ajusteFaltante: {
                    $sum: {
                      $cond: {
                        if: {
                          $and:
                          [
                            { $eq: ['$tipoAuditoria', 'faltante'] },
                            {
                              $or:
                            [
                              { $eq: ['$afecta', 'Perdida'] },
                              { $eq: ['$afecta', 'Ganancia'] },
                              { $eq: ['$afecta', 'Almacen'] }
                            ]
                            }
                          ]
                        },
                        then: '$cantidad',
                        else: 0
                      }
                    }

                  },
                  costoUnitario: {
                    $addToSet: {
                      $cond: {
                        if: { $eq: ['$tipo', 'movimiento'] }, then: '$costoUnitario', else: 0
                      }
                    }
                  }
                }
              },
              {
                $lookup: {
                  from: productoCollection,
                  localField: '_id',
                  foreignField: '_id',
                  as: 'detalleProducto'
                }
              },
              { $unwind: { path: '$detalleProducto', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  productoId: '$detalleProducto._id',
                  nombre: '$detalleProducto.nombre',
                  unidad: '$detalleProducto.unidad',
                  codigo: '$detalleProducto.codigo',
                  sobrante: '$sobrante',
                  faltante: '$faltante',
                  ajusteFaltante: '$ajusteFaltante',
                  ajusteSobrante: '$ajusteSobrante',
                  costoUnitario: { $sum: '$costoUnitario' }
                }
              }
            ],
            as: 'productoPorAlmacen'
          }
        },
        { $unwind: { path: '$productoPorAlmacen', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            productoId: '$productoPorAlmacen.productoId',
            nombre: '$productoPorAlmacen.nombre',
            unidad: '$productoPorAlmacen.unidad',
            codigo: '$productoPorAlmacen.codigo',
            // sobrante: '$productoPorAlmacen.sobrante',
            // faltante: '$productoPorAlmacen.faltante',
            costoUnitario: '$productoPorAlmacen.costoUnitario',
            // ajusteFaltante: '$productoPorAlmacen.ajusteFaltante',
            // ajusteSobrante: '$productoPorAlmacen.ajusteSobrante',
            sobrante: { $subtract: ['$productoPorAlmacen.sobrante', '$productoPorAlmacen.ajusteSobrante'] },
            faltante: { $subtract: ['$productoPorAlmacen.faltante', '$productoPorAlmacen.ajusteFaltante'] }
          }
        },
        {
          $match:
          {
            $or: [
              { sobrante: { $gt: 0 } },
              { faltante: { $gt: 0 } }
            ]
          }
        },
        { $sort: { codigo: 1 } }
      ]
    })
    return res.status(200).json({ almacen })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de obtner datos del almacen de auditoria ' + e.message })
  }
}
export const detalleAlmacenAuditoria = async (req, res) => {
  const { clienteId, productoId, almacenId } = req.body
  const productoCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productos' })
  const movimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'movimientos' })
  const productorPorAlamcenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productosPorAlmacen' })
  const movimientosPoductosPorAlmacen = await agreggateCollectionsSD({
    nameCollection: 'productosPorAlmacen',
    enviromentClienteId: clienteId,
    pipeline: [
      { $match: { productoId: new ObjectId(productoId), almacenId: new ObjectId(almacenId), movimientoAfectado: { $exists: false }/* , tipoMovimiento: 'entrada' */ } },
      {
        $group: {
          _id: '$movimientoId',
          productoId: {
            $first: '$productoId'
          },
          sobrante: {
            $sum: {
              $cond: {
                if: { $eq: ['$tipoAuditoria', 'sobrante'] }, then: '$cantidad', else: 0
              }
            }
          },
          faltante: {
            $sum: {
              $cond: {
                if: { $eq: ['$tipoAuditoria', 'faltante'] }, then: '$cantidad', else: 0
              }
            }
          },
          costoUnitario: {
            $sum: {
              $cond: {
                if: { $eq: ['$tipoMovimiento', 'entrada'] }, then: '$costoUnitario', else: 0
              }
            }
          },
          tipoAuditoria: {
            $first: '$tipoAuditoria'
          }
        }
      },
      {
        $lookup: {
          from: productorPorAlamcenCollection,
          let: { movimientoId: '$_id' },
          pipeline: [
            {
              $match:
                {
                  $expr:
                  {
                    $and:
                      [
                        { $eq: ['$movimientoAfectado', '$$movimientoId'] }
                      ]
                  }
                }
            },
            {
              $group: {
                _id: '$movimientoAfectado',
                ajustes: {
                  $sum: '$cantidad'
                }
              }
            }
          ],
          as: 'detalleAjusteAuditoria'
        }
      },
      { $unwind: { path: '$detalleAjusteAuditoria', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: productoCollection,
          localField: 'productoId',
          foreignField: '_id',
          as: 'detalleProducto'
        }
      },
      { $unwind: { path: '$detalleProducto', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: movimientosCollection,
          localField: '_id',
          foreignField: '_id',
          as: 'detalleMovimiento'
        }
      },
      { $unwind: { path: '$detalleMovimiento', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productoId: '$detalleProducto._id',
          nombre: '$detalleProducto.nombre',
          unidad: '$detalleProducto.unidad',
          codigo: '$detalleProducto.codigo',
          movimientoId: '$_id',
          sobrante: '$sobrante',
          faltante: '$faltante',
          // tipoAuditoria: '$tipoAuditoria',
          costoUnitario: '$costoUnitario',
          numeroMovimiento: '$detalleMovimiento.numeroMovimiento',
          tipoMovimiento: '$detalleMovimiento.tipo',
          ajustes: '$detalleAjusteAuditoria.ajustes',
          totalSobrante: { $subtract: ['$sobrante', '$detalleAjusteAuditoria.ajustes'] },
          totalFaltante: { $subtract: ['$faltante', '$detalleAjusteAuditoria.ajustes'] },
          tipoAuditoria: '$tipoAuditoria'
        }
      },
      {
        $match:
        {
          $or: [
            { totalSobrante: { $gt: 0 } },
            { totalFaltante: { $gt: 0 } },
            { totalSobrante: { $in: [null, undefined] } },
            { totalFaltante: { $in: [null, undefined] } }

          ]
        }
      }
    ]
  })
  // const movimientosValidos = movimientosPoductosPorAlmacen.filter(item => (item.totalSobrante > 0 || item.totalSobrante === null) || (item.totalFaltante > 0 || item.totalFaltante))
  return res.status(200).json({ movimientosPoductosPorAlmacen })
}
export const detalleMovimientoAuditado = async (req, res) => {
  const { clienteId, productoId, movimientoId } = req.body
  const almacenAuditoria = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Auditoria' } })
  const movimientosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'movimientos' })
  const zonasZollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'zonas' })
  const almacenColection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
  const detalleMovimientosColection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'detalleMovimientos' })
  const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
  const detalleMovimientoAuditado = await agreggateCollectionsSD({
    nameCollection: 'productosPorAlmacen',
    enviromentClienteId: clienteId,
    pipeline: [
      {
        $match:
        {
          productoId: new ObjectId(productoId),
          almacenId: almacenAuditoria._id,
          $or:
          [
            { movimientoId: new ObjectId(movimientoId) },
            { movimientoAfectado: new ObjectId(movimientoId) }
          ]
        }
      },
      {
        $lookup: {
          from: movimientosCollection,
          localField: 'movimientoId',
          foreignField: '_id',
          pipeline:
          [
            {
              $lookup:
                {
                  from: zonasZollection,
                  localField: 'zona',
                  foreignField: '_id',
                  as: 'zona'
                }
            },
            { $unwind: { path: '$zona', preserveNullAndEmptyArrays: true } },
            {
              $lookup:
                {
                  from: almacenColection,
                  localField: 'almacenOrigen',
                  foreignField: '_id',
                  as: 'almacenOrigen'
                }
            },
            { $unwind: { path: '$almacenOrigen', preserveNullAndEmptyArrays: true } },
            {
              $lookup:
                {
                  from: almacenColection,
                  localField: 'almacenDestino',
                  foreignField: '_id',
                  as: 'almacenDestino'
                }
            },
            { $unwind: { path: '$almacenDestino', preserveNullAndEmptyArrays: true } },
            {
              $lookup:
                {
                  from: detalleMovimientosColection,
                  localField: '_id',
                  foreignField: 'movimientoId',
                  as: 'detalleMovimientos'
                }
            }
          ],
          as: 'detalleMovimiento'
        }
      },
      { $unwind: { path: '$detalleMovimiento', preserveNullAndEmptyArrays: true } },
      {
        $lookup:
          {
            from: `${subDominioPersonasCollectionsName}`,
            localField: 'creadoPor',
            foreignField: 'usuarioId',
            as: 'personas'
          }
      },
      { $unwind: { path: '$personas', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          movimientoId: '$movimientoId',
          cantidad: '$cantidad',
          almacenDestinoNombre: '$almacenDestinoNombre',
          tipo: '$tipo',
          costoUnitario: '$costoUnitario',
          numeroMovimiento: '$detalleMovimiento.numeroMovimiento',
          creadoPor: '$personas.nombre',
          fechaMovimiento: '$fechaMovimiento',
          afecta: '$afecta',
          tipoAuditoria: '$tipoAuditoria',
          movimiento: '$detalleMovimiento'
        }
      }
    ]
  })
  return res.status(200).json({ detalleMovimientoAuditado })
}
export const createAlmacen = async (req, res) => {
  const { codigo, nombre, size, direccion, observacion, clienteId } = req.body
  console.log(req.body)
  console.log(req.files)
  const documentos = req.files?.documentos
  try {
    const documentosAdjuntos = []
    console.log({ documentos })
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
        console.log('entro', { documentos })
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
    console.log(documentosAdjuntos)
    // const ajuste = (await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'sistema' } })).dateFormat
    const newAlmacen = await createItemSD({
      nameCollection: 'almacenes',
      enviromentClienteId: clienteId,
      item: {
        codigo,
        nombre,
        size,
        direccion,
        observacion,
        documentosAdjuntos
      }
    })
    const almacen = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { _id: newAlmacen.insertedId } })
    return res.status(200).json({ status: 'Almacen guardado exitosamente', almacen })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el almacen ' + e.message })
  }
}
export const listCategoriaPorAlmacen = async (req, res) => {
  const { clienteId, almacenId, tipo } = req.body
  try {
    const categoriaAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorAlmacen' })
    const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
    const listCategorias = await agreggateCollectionsSD({
      nameCollection: 'categorias',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { tipo } },
        {
          $lookup: {
            from: categoriaAlmacenCollection,
            localField: '_id',
            foreignField: 'categoriaId',
            pipeline: [
              {
                $match: {
                  almacenId: new ObjectId(almacenId)
                }
              },
              {
                $lookup: {
                  from: planCuentaCollection,
                  localField: 'cuentaId',
                  foreignField: '_id',
                  pipeline: [
                    {
                      $project: {
                        cuentaId: '$_id',
                        codigo: '$codigo',
                        descripcion: '$descripcion'
                      }
                    }
                  ],
                  as: 'detalleCuenta'
                }
              },
              { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: true } },
              {
                $project: {
                  cuentaId: '$detalleCuenta.cuentaId',
                  cuenta: '$detalleCuenta.codigo',
                  descripcion: '$detalleCuenta.descripcion'
                }
              }
            ],
            as: 'detalleAlmacen'
          }
        },
        { $unwind: { path: '$detalleAlmacen', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            categoriaId: '$_id',
            categoria: '$nombre',
            cuentaCodigo: '$detalleAlmacen.cuenta',
            cuentaId: '$detalleAlmacen.cuentaId'
          }
        }
      ]
    })
    return res.status(200).json({ listCategorias })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de buscar la lista de categorías por almacen ' + e.message })
  }
}
export const saveCategoriaPorAlmacen = async (req, res) => {
  const { clienteId, tipo, categoriasPorAlmacen, almacenId } = req.body
  console.log(req.body)
  try {
    const bulkWrite = categoriasPorAlmacen.map(e => {
      return {
        updateOne: {
          filter: { categoriaId: new ObjectId(e.categoriaId), almacenId: new ObjectId(almacenId) },
          update: {
            $set: {
              cuentaId: new ObjectId(e.cuentaId),
              tipo
            }
          },
          upsert: true
        }
      }
    })
    await bulkWriteSD({ nameCollection: 'categoriaPorAlmacen', enviromentClienteId: clienteId, pipeline: bulkWrite })
    return res.status(200).json({ status: 'Categorias guardadas exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar las categoria por zona ' + e.message })
  }
}
export const editAlmacen = async (req, res) => {
  const { _id, codigo, nombre, size, direccion, observacion, clienteId } = req.body
  try {
    const almacen = await updateItemSD({
      nameCollection: 'almacenes',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(_id) },
      update: {
        $set: {
          codigo,
          nombre,
          size,
          direccion,
          observacion
        }
      }
    })
    return res.status(200).json({ status: 'Almacen guardado exitosamente', almacen })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar el almacen ' + e.message })
  }
}
export const deleteImgAlmacen = async (req, res) => {
  const { clienteId, almacenId, imgId } = req.body
  console.log(req.body)
  try {
    // const almacen = await getItemSD({ nameCollection: almacenCollection, enviromentClienteId: clienteId, filters: { _id: new ObjectId(almacenId) } })
    await updateItemSD({
      nameCollection: 'almacenes',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(almacenId) },
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
export const addImagenToAlmacen = async (req, res) => {
  const { clienteId, almacenId } = req.body
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
      const itemsAnterior = (await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { _id: new ObjectId(almacenId) } })).documentosAdjuntos
      if (itemsAnterior) {
        documentosAdjuntos.push(...itemsAnterior)
      }
      const almacenUpdate = await updateItemSD({
        nameCollection: 'almacenes',
        enviromentClienteId: clienteId,
        filters: { _id: new ObjectId(almacenId) },
        update: { $set: { documentosAdjuntos } }
      })
      return res.status(200).json({ status: 'Imagenes guardada exitosamente', almacenUpdate })
    }
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar las imagenes del almacen ' + e.message })
  }
}
export const deleteAlmacen = async (req, res) => {
  const { clienteId, _id } = req.body
  try {
    await deleteItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    deleteManyItemsSD({ nameCollection: 'categoriaPorAlmacen', enviromentClienteId: clienteId, filters: { almacenId: new ObjectId(_id) } })
    return res.status(200).json({ status: 'almacen eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar el activo' + e.message })
  }
}
export const saveToArray = async (req, res) => {
  const { clienteId, almacenes } = req.body
  try {
    if (!almacenes[0]) return res.status(400).json({ error: 'Hubo un error al momento de procesar la lista de almacenes' })
    const bulkWrite = []
    for (const almacen of almacenes) {
      const verifyActivo = await getItemSD({
        nameCollection: 'almacenes',
        enviromentClienteId: clienteId,
        filters: { nombre: almacen.nombre, codigo: almacen.codigo }
      })
      if (verifyActivo) {
        console.log('entramos a update')
        bulkWrite.push({
          updateOne: {
            filter: { _id: verifyActivo._id },
            update: {
              $set: {
                codigo: almacen.codigo,
                nombre: almacen.nombre,
                size: almacen.size,
                direccion: almacen.direccion,
                observacion: almacen.observacion
              }
            }
          }
        })
      } else {
        console.log('entramos a create')
        bulkWrite.push({
          insertOne: {
            document: {
              codigo: almacen.codigo,
              nombre: almacen.nombre,
              size: almacen.size,
              direccion: almacen.direccion,
              observacion: almacen.observacion
            }
          }
        })
      }
    }
    if (bulkWrite[0]) await bulkWriteSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, pipeline: bulkWrite })
    return res.status(200).json({ status: 'Almacenes guardados exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar los Almacenes' + e.message })
  }
}
