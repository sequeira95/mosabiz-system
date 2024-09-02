import { ObjectId } from 'mongodb'
import { getItem, getItemSD } from './dataBaseConfing.js'

export async function hasInventario ({ clienteId }) {
  const cliente = await getItemSD({ nameCollection: 'clientes', filters: { _id: new ObjectId(clienteId) } })
  const modulo = await getItem({ nameCollection: 'modulos', filters: { nombre: 'Inventarios' } })
  const moduloInventario = cliente.modulos.find(e => e.moduloId === modulo._id.toJSON())
  if (moduloInventario) return true
  return false
}
export async function hasTributos ({ clienteId }) {
  const cliente = await getItemSD({ nameCollection: 'clientes', filters: { _id: new ObjectId(clienteId) } })
  const modulo = await getItem({ nameCollection: 'modulos', filters: { nombre: 'Tributos' } })
  const moduloTributo = cliente.modulos.find(e => e.moduloId === modulo._id.toJSON())
  if (moduloTributo) return true
  return false
}
