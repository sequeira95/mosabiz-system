import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, formatCollectionName, getItem, getItemSD } from './dataBaseConfing.js'
import { subDominioName } from '../constants.js'

export async function hasContabilidad ({ clienteId }) {
  const cliente = await getItemSD({ nameCollection: 'clientes', filters: { _id: new ObjectId(clienteId) } })
  const modulo = await getItem({ nameCollection: 'modulos', filters: { nombre: 'Contabilidad' } })
  const moduloContabilidad = cliente.modulos.find(e => e.moduloId === modulo._id.toJSON())
  if (moduloContabilidad) return true
  return false
}
export async function validAjustesContablesForAjusteProducto ({ clienteId, tipo, productoId, almacen }) {
  try {
    const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
    if (ajusteInventario && !ajusteInventario.codigoComprobanteAjuste) throw new Error('No existe en ajustes el codigo del comprobante para realizar ajuste')
    if (tipo === 'Ingreso' && ajusteInventario && !ajusteInventario.cuentaUtilidadAjusteInventario) throw new Error('No existe en ajustes una cuenta seleccionada para poder realizar el ajuste')
    if (tipo === 'Salida' && ajusteInventario && !ajusteInventario.cuentaPerdidasAjusteInventario) throw new Error('No existe en ajustes una cuenta seleccionada para poder realizar el ajuste')
    const producto = await getItemSD({ nameCollection: 'productos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(productoId) } })
    const categoriaPorAlmacen = await getItemSD({
      nameCollection: 'categoriaPorAlmacen',
      enviromentClienteId: clienteId,
      filters: { categoriaId: producto.producto, almacenId: new ObjectId(almacen._id) }
    })
    if (categoriaPorAlmacen && !categoriaPorAlmacen.cuentaId) throw new Error('No existe una cuenta seleccionada para la categoría del producto en el almacen')
    console.log({ producto })
  } catch (e) {
    return e
  }
}
export async function validMovimientoPenditeEnvio ({ clienteId, detalleMovimientos, almacenOrigen }) {
  try {
    // console.log('paso 1')
    const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
    // console.log({ ajusteInventario })
    if (ajusteInventario && !ajusteInventario.codigoComprobanteMovimientos) throw new Error('No existe en ajustes el codigo del comprobante para actualizar el movimiento')
    const categoriaPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorAlmacen' })
    const productsId = detalleMovimientos.map(e => new ObjectId(e.productoId))
    // console.log({ productsId })
    const almacenTransito = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Transito' } })
    if (!almacenTransito) throw new Error('No existe almacen en transito')
    // console.log({ almacenTransito })
    const listaProductos = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { _id: { $in: productsId } } },
        {
          $lookup: {
            from: categoriaPorAlmacenCollection,
            let: { categoriaId: '$categoria' },
            pipeline: [
              {
                $match:
                  {
                    $expr:
                    {
                      $and:
                        [
                          { $eq: ['$categoriaId', '$$categoriaId'] },
                          { $eq: ['$almacenId', new ObjectId(almacenOrigen._id)] }
                        ]
                    }
                  }
              },
              {
                $project: {
                  cuentaId: '$cuentaId'
                }
              }
            ],
            as: 'detalleCategoriaPorAlmacen'
          }
        },
        { $unwind: { path: '$detalleCategoriaPorAlmacen', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: categoriaPorAlmacenCollection,
            let: { categoriaId: '$categoria' },
            pipeline: [
              {
                $match:
                  {
                    $expr:
                    {
                      $and:
                        [
                          { $eq: ['$categoriaId', '$$categoriaId'] },
                          { $eq: ['$almacenId', almacenTransito._id] }
                        ]
                    }
                  }
              },
              {
                $project: {
                  cuentaId: '$cuentaId'
                }
              }
            ],
            as: 'detalleCategoriaPorAlmacenTransito'
          }
        },
        { $unwind: { path: '$detalleCategoriaPorAlmacenTransito', preserveNullAndEmptyArrays: true } }
      ]
    })
    if (listaProductos && !listaProductos[0]) {
      throw new Error('No se encontraron productos para validar la contabilidad')
    }
    if (listaProductos && listaProductos[0] && !listaProductos.every(e => e.detalleCategoriaPorAlmacen.cuentaId && e.detalleCategoriaPorAlmacenTransito.cuentaId)) {
      throw new Error('Existen productos que no tienen una cuenta contable asignada en su categoria')
    }
    return false
  } catch (e) {
    return e
  }
}
export async function validMovimientoPenditeRecepcion ({ clienteId, detalleMovimientos, _id, almacenDestino }) {
  try {
    const almacenAuditoria = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Auditoria' } })
    const movimiento = await getItemSD({ nameCollection: 'movimientos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
    console.log('paso 1')
    console.log({ clienteId, detalleMovimientos, _id, almacenDestino })
    const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
    console.log({ ajusteInventario })
    if (ajusteInventario && !ajusteInventario.codigoComprobanteMovimientos) throw new Error('No existe en ajustes el codigo del comprobante para actualizar el movimiento')
    const categoriaPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorAlmacen' })
    const productsId = detalleMovimientos.map(e => new ObjectId(e.productoId))
    console.log({ productsId })
    const almacenTransito = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Transito' } })
    if (!almacenTransito) throw new Error('No existe almacen en transito')
    console.log({ almacenTransito })
    if (movimiento.zona) {
      const zona = await getItemSD({ nameCollection: 'zonas', enviromentClienteId: clienteId, filters: { _id: movimiento.zona } })
      if (zona && !zona.cuentaId) throw new Error('La zona que tiene asignada el movimiento no posee una cuenta contable registrada')
    }
    const listaProductos = await agreggateCollectionsSD({
      nameCollection: 'productos',
      enviromentClienteId: clienteId,
      pipeline: [
        { $match: { _id: { $in: productsId } } },
        {
          $lookup: {
            from: categoriaPorAlmacenCollection,
            let: { categoriaId: '$categoria' },
            pipeline: [
              {
                $match:
                  {
                    $expr:
                    {
                      $and:
                        [
                          { $eq: ['$categoriaId', '$$categoriaId'] },
                          { $eq: ['$almacenId', new ObjectId(almacenDestino?._id)] }
                        ]
                    }
                  }
              },
              {
                $project: {
                  cuentaId: '$cuentaId'
                }
              }
            ],
            as: 'detalleCategoriaPorAlmacen'
          }
        },
        { $unwind: { path: '$detalleCategoriaPorAlmacen', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: categoriaPorAlmacenCollection,
            let: { categoriaId: '$categoria' },
            pipeline: [
              {
                $match:
                  {
                    $expr:
                    {
                      $and:
                        [
                          { $eq: ['$categoriaId', '$$categoriaId'] },
                          { $eq: ['$almacenId', almacenTransito._id] }
                        ]
                    }
                  }
              },
              {
                $project: {
                  cuentaId: '$cuentaId'
                }
              }
            ],
            as: 'detalleCategoriaPorAlmacenTransito'
          }
        },
        { $unwind: { path: '$detalleCategoriaPorAlmacenTransito', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: categoriaPorAlmacenCollection,
            let: { categoriaId: '$categoria' },
            pipeline: [
              {
                $match:
                  {
                    $expr:
                    {
                      $and:
                        [
                          { $eq: ['$categoriaId', '$$categoriaId'] },
                          { $eq: ['$almacenId', almacenAuditoria._id] }
                        ]
                    }
                  }
              },
              {
                $project: {
                  cuentaId: '$cuentaId'
                }
              }
            ],
            as: 'detalleCategoriaPorAlmacenAuditoria'
          }
        },
        { $unwind: { path: '$detalleCategoriaPorAlmacenAuditoria', preserveNullAndEmptyArrays: true } }
      ]
    })
    console.log({ listaProductos })
    if (listaProductos && !listaProductos[0]) {
      throw new Error('No se encontraron productos para validar la contabilidad')
    }
    if (almacenDestino) {
      if (listaProductos && listaProductos[0] && !listaProductos.every(e => e.detalleCategoriaPorAlmacen.cuentaId && e.detalleCategoriaPorAlmacenTransito.cuentaId && e.detalleCategoriaPorAlmacenAuditoria)) {
        throw new Error('Existen productos que no tienen una cuenta contable asignada en su categoria')
      }
    }
    if (listaProductos && listaProductos[0] && !listaProductos.every(e => e.detalleCategoriaPorAlmacenTransito.cuentaId && e.detalleCategoriaPorAlmacenAuditoria)) {
      throw new Error('Existen productos que no tienen una cuenta contable asignada en su categoria')
    }
    return false
  } catch (e) {
    return e
  }
}
export async function validMovimientoAuditoria ({ clienteId, tipoAjuste, almacen, productoId }) {
  const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
  if (ajusteInventario && !ajusteInventario.codigoComprobanteAjuste) throw new Error('No existe en ajustes el codigo del comprobante para realizar ajuste')
  const almacenAuditoria = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Auditoria' } })
  const producto = await getItemSD({ nameCollection: 'productos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(productoId) } })
  const categoriaALmacen = await getItemSD({
    nameCollection: 'categoriaPorAlmacen',
    enviromentClienteId: clienteId,
    filters: { categoriaId: producto.categoria, almacenId: almacenAuditoria._id }
  })
  const cuentaCategoria = await getItemSD({
    nameCollection: 'planCuenta',
    enviromentClienteId: clienteId,
    filters: { _id: categoriaALmacen.cuentaId }
  })
  if (!cuentaCategoria) throw new Error('No existe una cuenta asignada para la categoria en el almacen de auditoria')
  if (tipoAjuste === 'Ganancia') {
    if (ajusteInventario && !ajusteInventario.cuentaUtilidadAjusteInventario) throw new Error('No existe en ajustes una cuenta seleccionada para poder realizar el ajuste')
    const cuentaAjuste = await getItemSD({
      nameCollection: 'planCuenta',
      enviromentClienteId: clienteId,
      filters: { _id: new ObjectId(ajusteInventario.cuentaUtilidadAjusteInventario) }
    })
    if (!cuentaAjuste) throw new Error('No existe una cuenta asignada para el ajuste seleccionado de cuenta de utilidad de ajuste de inventario')
  }
  if (tipoAjuste === 'Perdida') {
    if (ajusteInventario && !ajusteInventario.cuentaPerdidasAjusteInventario) throw new Error('No existe en ajustes una cuenta seleccionada para poder realizar el ajuste')
    const cuentaAjuste = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: new ObjectId(ajusteInventario.cuentaPerdidasAjusteInventario) } })
    if (!cuentaAjuste) throw new Error('No existe una cuenta asignada para el ajuste seleccionado de cuenta de perdida de ajuste de inventario')
  }
  if (tipoAjuste === 'almacen') {
    const categoriaALmacenDestino = await getItemSD({
      nameCollection: 'categoriaPorAlmacen',
      enviromentClienteId: clienteId,
      filters: { categoriaId: producto.categoria, almacenId: new ObjectId(almacen._id) }
    })
    const cuentaAlmacenDestino = await getItemSD({ nameCollection: 'planCuenta', enviromentClienteId: clienteId, filters: { _id: categoriaALmacenDestino._id } })
    if (!cuentaAlmacenDestino) throw new Error('No existe una cuenta asignada para la categoria en el almacen ' + almacen.nombre)
  }
}
export async function validUpdateCostoPorLoteProducto ({ clienteId, productoId, lote }) {
  const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
  if (!ajusteInventario) throw new Error('No existe en ajustes de inventario')
  if (ajusteInventario && !ajusteInventario.codigoComprobanteAjuste) throw new Error('No existe en ajustes el codigo del comprobante para realizar ajuste')
  if (ajusteInventario && !ajusteInventario.cuentaUtilidadAjusteInventario) throw new Error('No existe en ajustes una cuenta de utilidad seleccionada para poder realizar el ajuste')
  if (ajusteInventario && !ajusteInventario.cuentaPerdidasAjusteInventario) throw new Error('No existe en ajustes una cuenta de perdida seleccionada para poder realizar el ajuste')
  const productosCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'productos' })
  const almacenesCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'almacenes' })
  const categoriaPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorAlmacen' })
  const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
  const datosMovivientoPorProducto = await agreggateCollectionsSD({
    nameCollection: 'productosPorAlmacen',
    enviromentClienteId: clienteId,
    pipeline: [
      { $match: { productoId: new ObjectId(productoId), lote } },
      {
        $group: {
          _id: {
            costoUnitario: '$costoUnitario',
            productoId: '$productoId',
            almacenId: '$almacenId'
          },
          lote: { $first: '$lote' },
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
        $lookup: {
          from: productosCollection,
          localField: '_id.productoId',
          foreignField: '_id',
          as: 'detalleProducto'
        }
      },
      { $unwind: { path: '$detalleProducto', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: almacenesCollection,
          localField: '_id.almacenId',
          foreignField: '_id',
          as: 'detalleAlmacen'
        }
      },
      { $unwind: { path: '$detalleAlmacen', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: categoriaPorAlmacenCollection,
          let: { categoriaId: '$detalleProducto.categoria', almacenId: '$_id.almacenId' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$categoriaId', '$$categoriaId'] }, { $eq: ['$almacenId', '$$almacenId'] }] } } },
            { $project: { cuentaId: 1 } }
          ],
          as: 'detalleCategoriaPorAlmacen'
        }
      },
      { $unwind: { path: '$detalleCategoriaPorAlmacen', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: planCuentaCollection,
          localField: 'detalleCategoriaPorAlmacen.cuentaId',
          foreignField: '_id',
          pipeline: [
            {
              $project: {
                descripcion: 1,
                codigo: 1
              }
            }
          ],
          as: 'detalleCuenta'
        }
      },
      { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          lote: '$lote',
          costoUnitario: '$_id.costoUnitario',
          productoId: '$_id.productoId',
          almacenId: '$_id.almacenId',
          cantidad: { $subtract: ['$entrada', '$salida'] }, // cantidad de producto en el almacen de origen
          productoCategoria: '$detalleProducto.categoria',
          productoNombre: '$detalleProducto.nombre',
          cuentaId: '$detalleCuenta._id',
          cuentaNombre: '$detalleCuenta.descripcion',
          cuentaCodigo: '$detalleCuenta.codigo',
          almacenNombre: '$detalleAlmacen.nombre'
        }
      },
      { $match: { cantidad: { $gt: 0 } } }
    ]
  })
  for (const item of datosMovivientoPorProducto) {
    if (!item.cuentaId) throw new Error('No existe una cuenta asignada para la categoria en el almacen ' + item.almacenNombre)
  }
}
export async function validComprobantesDescuadre ({ clienteId, periodoId }) {
  try {
    const verifyComprobantes = await getItemSD({
      nameCollection: 'comprobantes',
      enviromentClienteId: clienteId,
      filters: { periodoId: new ObjectId(periodoId), descuadre: { $nin: [null, undefined, 0, ''] } }
    })
    if (verifyComprobantes) throw new Error('Existen comprobantes con saldos descuadros.')
  } catch (e) {
    return e
  }
}
export async function validProductosRecepcionCompras ({ clienteId, movimientoId, detalleMovimientos, almacenDestino, tipo }) {
  const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
  // console.log({ ajusteInventario })
  if (ajusteInventario && !ajusteInventario.codigoComprobanteMovimientos) throw new Error('No existe en ajustes el codigo del comprobante para actualizar el movimiento')
  const categoriaPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorAlmacen' })
  const planCuentaCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'planCuenta' })
  const almacenDevoluciones = await getItemSD({
    nameCollection: 'almacenes',
    enviromentClienteId: clienteId,
    filters: { nombre: 'Devoluciones' }
  })
  let existDiferencia = false
  const validdiferencia = detalleMovimientos.some(e => Number(e.recibido) < e.cantidad)
  if (validdiferencia) existDiferencia = true
  const IdProductos = detalleMovimientos.filter(e => e.recibe > 0).map(e => new ObjectId(e.productoId))
  const dataMovimiento = await agreggateCollectionsSD({
    nameCollection: 'productos',
    enviromentClienteId: clienteId,
    pipeline: [
      { $match: { _id: { $in: IdProductos } } },
      {
        $lookup: {
          from: categoriaPorAlmacenCollection,
          let: { categoriaId: '$categoria' },
          pipeline: [
            {
              $match:
                {
                  $expr:
                  {
                    $and:
                      [
                        { $eq: ['$categoriaId', '$$categoriaId'] },
                        { $eq: ['$almacenId', new ObjectId(almacenDestino?._id)] }
                      ]
                  }
                }
            },
            {
              $project: {
                cuentaId: '$cuentaId'
              }
            }
          ],
          as: 'detalleCategoriaDestino'
        }
      },
      { $unwind: { path: '$detalleCategoriaDestino', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: categoriaPorAlmacenCollection,
          let: { categoriaId: '$categoria' },
          pipeline: [
            {
              $match:
                {
                  $expr:
                  {
                    $and:
                      [
                        { $eq: ['$categoriaId', '$$categoriaId'] },
                        { $eq: ['$almacenId', new ObjectId(almacenDevoluciones?._id)] }
                      ]
                  }
                }
            },
            {
              $project: {
                cuentaId: '$cuentaId'
              }
            }
          ],
          as: 'detalleCategoriaDevoluciones'
        }
      },
      { $unwind: { path: '$detalleCategoriaDevoluciones', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productoId: '$_id',
          producto: '$nombre',
          categoria: '$categoria',
          cuentaDestino: '$detalleCategoriaDestino.cuentaId',
          cuentaDevolucion: '$detalleCategoriaDevoluciones.cuentaId'
        }
      },
      {
        $lookup: {
          from: planCuentaCollection,
          localField: 'cuentaDestino',
          foreignField: '_id',
          as: 'cuentaDestino'
        }
      },
      { $unwind: { path: '$cuentaDestino', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: planCuentaCollection,
          localField: 'cuentaDevolucion',
          foreignField: '_id',
          as: 'cuentaDevolucion'
        }
      },
      { $unwind: { path: '$cuentaDevolucion', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productoId: 1,
          producto: 1,
          categoria: 1,
          cuentaDestinoId: '$cuentaDestino._id',
          cuentaDestinoCodigo: '$cuentaDestino.codigo',
          cuentaDestinoNombre: '$cuentaDestino.descripcion',
          cuentaDevolucionId: '$cuentaDevolucion._id',
          cuentaDevolucionCodigo: '$cuentaDevolucion.codigo',
          cuentaDevolucionNombre: '$cuentaDevolucion.descripcion'
        }
      }
    ]
  })
  if (tipo === 'cerrar' && existDiferencia) {
    const isValidCuentas = dataMovimiento.every(item => item.cuentaDevolucionId)
    if (!isValidCuentas) throw new Error('Existen productos que no tienen cuenta asignada para el almacen de devoluciones.')
  } else {
    const isValidCuentas = dataMovimiento.every(item => item.cuentaDestinoId && item.cuentaDevolucionId)
    if (!isValidCuentas) throw new Error('Existen productos que no tienen cuenta asignada para el almacen de destino o el almacen de devoluciones.')
  }
  const proveedoresCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'proveedores' })
  const categoriasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categorias' })
  const comprasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'compras' })
  const detalleCompra = await agreggateCollectionsSD({
    nameCollection: 'movimientos',
    enviromentClienteId: clienteId,
    pipeline: [
      { $match: { _id: new ObjectId(movimientoId) } },
      {
        $lookup: {
          from: comprasCollection,
          localField: 'compraId',
          foreignField: '_id',
          pipeline: [
            {
              $lookup: {
                from: proveedoresCollection,
                localField: 'proveedorId',
                foreignField: '_id',
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
                      from: planCuentaCollection,
                      localField: 'detalleCategoria.cuentaId',
                      foreignField: '_id',
                      as: 'detalleCuenta'
                    }
                  },
                  { $unwind: { path: '$detalleCuenta', preserveNullAndEmptyArrays: true } },
                  {
                    $project: {
                      proveedor: '$razonSocial',
                      categoria: '$detalleCategoria.nombre',
                      cuentaId: '$detalleCuenta._id',
                      cuentaNombre: '$detalleCuenta.descripcion',
                      cuentaCodigo: '$detalleCuenta.codigo'
                    }
                  }
                ],
                as: 'detalleProveedor'
              }
            },
            { $unwind: { path: '$detalleProveedor', preserveNullAndEmptyArrays: true } }],
          as: 'detalleCompra'
        }
      },
      { $unwind: { path: '$detalleCompra', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          movimientoId: '$_id',
          numeroMovimiento: '$numeroMovimiento',
          tipoMovimiento: '$tipo',
          compraId: '$detalleCompra._id',
          proveedor: '$detalleCompra.detalleProveedor.proveedor',
          categoria: '$detalleCompra.detalleProveedor.categoria',
          cuentaId: '$detalleCompra.detalleProveedor.cuentaId',
          cuentaNombre: '$detalleCompra.detalleProveedor.cuentaNombre',
          cuentaCodigo: '$detalleCompra.detalleProveedor.cuentaCodigo'
        }
      }
    ]
  })
  const isValidCuentasProveedor = detalleCompra.every(item => item.cuentaId)
  if (!isValidCuentasProveedor) throw new Error('El proveedor no posee asignada una cuenta contable en su categoria .')
}
