import { ObjectId } from 'mongodb'
import { getItem, getItemSD } from './dataBaseConfing.js'

export async function hasContabilidad ({ clienteId }) {
  const cliente = await getItemSD({ nameCollection: 'clientes', filters: { _id: new ObjectId(clienteId) } })
  const modulo = await getItem({ nameCollection: 'modulos', filters: { nombre: 'Contabilidad' } })
  const moduloContabilidad = cliente.modulos.find(e => e.moduloId === modulo._id.toJSON())
  if (moduloContabilidad) return true
  return false
}
export async function validAjustesContablesForAjusteProducto ({ clienteId, tipo, productoId, almacen }) {
  console.log({ clienteId, tipo, productoId, almacen })
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
