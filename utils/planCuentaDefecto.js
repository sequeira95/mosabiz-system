import moment from 'moment'
import { createManyItemsSD } from './dataBaseConfing.js'
const planCuentaDefecto = [
  {
    codigo: '1',
    descripcion: 'ACTIVO',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2',
    descripcion: 'PASIVO',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3',
    descripcion: 'PATRIMONIO',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4',
    descripcion: 'INGRESOS',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5',
    descripcion: 'COSTOS OPERACIONALES',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6',
    descripcion: 'EGRESOS',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7',
    descripcion: 'OTROS INGRESOS Y EGRESOS',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '8',
    descripcion: 'IMPUESTOS Y OTROS',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '9',
    descripcion: 'PREGUNTAR',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  }
]

export async function createPlanCuenta ({ clienteId }) {
  await createManyItemsSD({
    nameCollection: 'planCuenta',
    enviromentClienteId: clienteId,
    items: planCuentaDefecto
  })
}
