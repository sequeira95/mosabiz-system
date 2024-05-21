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
    console.log('paso 1')
    const ajusteInventario = await getItemSD({ nameCollection: 'ajustes', enviromentClienteId: clienteId, filters: { tipo: 'inventario' } })
    // console.log({ ajusteInventario })
    if (ajusteInventario && !ajusteInventario.codigoComprobanteMovimientos) throw new Error('No existe en ajustes el codigo del comprobante para actualizar el movimiento')
    const categoriaPorAlmacenCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId: clienteId, nameCollection: 'categoriaPorAlmacen' })
    const productsId = detalleMovimientos.map(e => new ObjectId(e.productoId))
    // console.log({ productsId })
    const almacenTransito = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Transito' } })
    const almacenAuditoria = await getItemSD({ nameCollection: 'almacenes', enviromentClienteId: clienteId, filters: { nombre: 'Auditoria' } })
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
    if (listaProductos && listaProductos[0] && !listaProductos.every(e => e.detalleCategoriaPorAlmacen.cuentaId && e.detalleCategoriaPorAlmacenTransito.cuentaId && e.detalleCategoriaPorAlmacenAuditoria)) {
      throw new Error('Existen productos que no tienen una cuenta contable asignada en su categoria')
    }
    return false
  } catch (e) {
    return e
  }
}
export async function validMovimientoPenditeRecepcion ({ clienteId, detalleMovimientos, _id, almacenDestino }) {
  try {
    const movimiento = await getItemSD({ nameCollection: 'movimientos', enviromentClienteId: clienteId, filters: { _id: new ObjectId(_id) } })
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
    if (movimiento.zona) {
      const zona = await getItemSD({ nameCollection: 'zonas', enviromentClienteId: clienteId, filters: { _id: movimiento.zona } })
      if (zona && !zona.cuentaId) throw new Error('La zona que tiene asignada el movimiento no posee una cuenta contable registrada')
    }
    if (almacenDestino) {
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
                            { $eq: ['$almacenId', new ObjectId(almacenDestino._id)] }
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
