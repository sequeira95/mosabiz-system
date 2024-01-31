import { ObjectId } from 'mongodb'
import { getItem, getItemSD } from './dataBaseConfing.js'

export async function hasContabilidad ({ clienteId }) {
  const cliente = await getItemSD({ nameCollection: 'clientes', filters: { _id: new ObjectId(clienteId) } })
  const modulo = await getItem({ nameCollection: 'modulos', filters: { nombre: 'Contabilidad' } })
  const moduloContabilidad = cliente.modulos.find(e => e.moduloId === modulo._id.toJSON())
  if (moduloContabilidad) return true
  return false
}
