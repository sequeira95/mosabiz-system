import moment from 'moment'
import { createManyItemsSD } from './dataBaseConfing.js'
const planCuentaLightDefecto = [
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
    descripcion: 'COSTOS',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6',
    descripcion: 'GASTOS',
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
    descripcion: 'Cuentas de orden (Deudor)',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '9',
    descripcion: 'Cuentas de orden (Acreedor)',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  }
]
const planCuentaDefecto = [
  {
    codigo: '1',
    descripcion: 'ACTIVOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1',
    descripcion: 'ACTIVO CIRCULANTE',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01',
    descripcion: 'EFECTIVO Y EQUIVALENTES DE EFECTIVO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.01',
    descripcion: 'EFECTIVO EN CAJAS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.01.001',
    descripcion: 'Caja principal - Bolívares',
    conciliacion: 'Caja',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.01.201',
    descripcion: 'Caja principal - Divisas',
    conciliacion: 'Caja',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.01.901',
    descripcion: 'Caja chica - Administración',
    conciliacion: 'Caja',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.01.902',
    descripcion: 'Caja chica - Operaciones',
    conciliacion: 'Caja',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.02',
    descripcion: 'CAJAS Y PUNTOS DE VENTAS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.02.001',
    descripcion: 'Caja punto de venta #1',
    conciliacion: 'Caja',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.02.002',
    descripcion: 'Caja punto de venta #2',
    conciliacion: 'Caja',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03',
    descripcion: 'BANCOS NACIONALES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.001',
    descripcion: 'Banco de Venezuela, S.A.',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.002',
    descripcion: 'Banco Venezolano de Crédito, S.A.',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.003',
    descripcion: 'Banco Mercantil C.A.',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.004',
    descripcion: 'Banco Provincial, S.A.',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.005',
    descripcion: 'Banco del Caribe C.A. Bancaribe',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.006',
    descripcion: 'Banco Exterior C.A.',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.007',
    descripcion: 'Banco Caroní C.A.',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.008',
    descripcion: 'Banesco , C.A.',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.009',
    descripcion: 'Banco Sofitasa , C.A.',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.010',
    descripcion: 'Banco Plaza',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.011',
    descripcion: 'Banco Fondo Común, C.A',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.012',
    descripcion: '100% Banco, Banco Comercial, C.A',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.013',
    descripcion: 'Banco del Tesoro C.A.',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.014',
    descripcion: 'Bancrecer S.A., Banco Microfinanciero',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.015',
    descripcion: 'Bancamiga , C.A.',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.016',
    descripcion: 'Banplus , C.A.',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.017',
    descripcion: 'Banco Bicentenario del Pueblo C.A.',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.03.018',
    descripcion: 'Banco Nacional de Crédito C.A.',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04',
    descripcion: 'BANCOS NACIONAL CUSTODIOS ME',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.001',
    descripcion: 'Banco de Venezuela, S.A. Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.002',
    descripcion: 'Banco Venezolano de Crédito, S.A. Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.003',
    descripcion: 'Banco Mercantil C.A. Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.004',
    descripcion: 'Banco Provincial, S.A. Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.005',
    descripcion: 'Banco del Caribe C.A. Bancaribe Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.006',
    descripcion: 'Banco Exterior C.A. Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.007',
    descripcion: 'Banco Caroní C.A. Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.008',
    descripcion: 'Banesco , C.A. Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.009',
    descripcion: 'Banco Sofitasa , C.A. Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.010',
    descripcion: 'Banco Plaza Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.011',
    descripcion: 'Banco Fondo Común, C.A Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.012',
    descripcion: '100% Banco, Banco Comercial, C.A Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.013',
    descripcion: 'Banco del Tesoro C.A. Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.014',
    descripcion: 'Bancrecer S.A., Banco Microfinanciero Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.015',
    descripcion: 'Bancamiga , C.A. Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.016',
    descripcion: 'Banplus , C.A. Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.017',
    descripcion: 'Banco Bicentenario del Pueblo C.A. Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.04.018',
    descripcion: 'Banco Nacional de Crédito C.A. Custodio',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.05',
    descripcion: 'BANCOS INTERNACIONALES ME',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.05.001',
    descripcion: 'JPMorgan Chase Bank',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.05.002',
    descripcion: 'Bank of America BOFA',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.05.003',
    descripcion: 'Wells Fargo Bank',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.05.004',
    descripcion: 'Amerant Bank',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.05.005',
    descripcion: 'Citibank',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.05.006',
    descripcion: 'U.S. Bancorp',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.05.007',
    descripcion: 'Capital One Bank',
    conciliacion: 'Banco',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.06',
    descripcion: 'DEPOSITOS EN PLAZOS FIJOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.06.001',
    descripcion: 'Deposito a plazo fijo - Banco #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.06.002',
    descripcion: 'Deposito a plazo fijo - Banco #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.07',
    descripcion: 'OTRAS COLOCACIONES EN VALORES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.07.001',
    descripcion: 'Bono #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.01.07.002',
    descripcion: 'Bono #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.02',
    descripcion: 'DOCUMENTOS Y CUENTAS POR COBRAR',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.02.01',
    descripcion: 'CUENTAS POR COBRAR CORRIENTES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.02.01.001',
    descripcion: 'Cuentas por cobrar comerciales',
    conciliacion: 'Cuentas por cobrar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.02.01.002',
    descripcion: 'Cuentas por cobrar empleados',
    conciliacion: 'Cuentas por cobrar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.02.01.003',
    descripcion: 'Cuentas por cobrar accionistas / socios',
    conciliacion: 'Cuentas por cobrar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.02.01.004',
    descripcion: 'Cuentas por cobrar empresas relacionadas',
    conciliacion: 'Cuentas por cobrar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.02.01.005',
    descripcion: 'Cuentas por cobrar varias',
    conciliacion: 'Cuentas por cobrar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03',
    descripcion: 'INVENTARIOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.01',
    descripcion: 'INVENTARIOS GENERALES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.01.001',
    descripcion: 'Inventarios de mercancía general',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.02',
    descripcion: 'INVENTARIOS DE MATERIA PRIMA',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.02.001',
    descripcion: 'Almacén principal',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.02.002',
    descripcion: 'Almacén #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.02.003',
    descripcion: 'Almacén #3',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.02.701',
    descripcion: 'Almacén en transito',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.02.801',
    descripcion: 'Almacén de devoluciones',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.02.901',
    descripcion: 'Almacén en auditoria',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.03',
    descripcion: 'INVENTARIOS DE PRODUCTOS EN PROCESO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.03.001',
    descripcion: 'Almacén principal',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.03.002',
    descripcion: 'Almacén #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.03.003',
    descripcion: 'Almacén #3',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.03.701',
    descripcion: 'Almacén en transito',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.03.801',
    descripcion: 'Almacén de devoluciones',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.03.901',
    descripcion: 'Almacén en auditoria',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.04',
    descripcion: 'INVENTARIOS DE PRODUCTOS TERMINADOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.04.001',
    descripcion: 'Almacén principal - Rubro / categoría #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.04.002',
    descripcion: 'Almacén principal - Rubro / categoría #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.04.003',
    descripcion: 'Almacén principal - Rubro / categoría #3',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.04.701',
    descripcion: 'Almacén en transito',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.04.802',
    descripcion: 'Almacén de devoluciones',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.03.04.901',
    descripcion: 'Almacén en auditoria',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04',
    descripcion: 'GASTOS PAGADOS POR ANTICIPADO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.01',
    descripcion: 'GASTOS ANTICIPADOS CORRIENTES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.01.001',
    descripcion: 'Anticipo a proveedores',
    conciliacion: 'Cuentas por cobrar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.01.002',
    descripcion: 'Seguros prepagados',
    conciliacion: 'Cuentas por cobrar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.01.003',
    descripcion: 'Mercancía en tránsito',
    conciliacion: 'Cuentas por cobrar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.01.004',
    descripcion: 'Otros gastos pagados por anticipado',
    conciliacion: 'Cuentas por cobrar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.02',
    descripcion: 'IMPUESTOS Y RETENCIONES NACIONALES ',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.02.001',
    descripcion: 'IVA crédito fiscal (compras)',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.02.002',
    descripcion: 'Retenciones IVA efectivas',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.02.003',
    descripcion: 'ISLR estimada',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.02.004',
    descripcion: 'Anticipo ISLR',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.02.005',
    descripcion: 'Retenciones ISLR efectivas',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.03',
    descripcion: 'IMPUESTOS Y RETENCIONES MUNICIPALES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.03.001',
    descripcion: 'Retenciones municipales - municipio #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.03.002',
    descripcion: 'Estimada impuestos municipales - municipio #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.03.003',
    descripcion: 'Retenciones municipales - municipio #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.1.04.03.004',
    descripcion: 'Estimada impuestos municipales - municipio #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2',
    descripcion: 'ACTIVO NO CORRIENTE',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.01',
    descripcion: 'INVERSIONES PERMANENTES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.01.01',
    descripcion: 'INVERSIONES EN ACCIONES ',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.01.01.001',
    descripcion: 'Compañías relacionadas',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.01.01.002',
    descripcion: 'Acciones en otras compañías no relacionadas',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02',
    descripcion: 'PROPIEDAD, PLANTA Y EQUIPO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.01',
    descripcion: 'COSTOS DE ACTIVOS FIJOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.01.001',
    descripcion: 'Terrenos',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.01.002',
    descripcion: 'Edificaciones e instalaciones',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.01.003',
    descripcion: 'Mobiliario y equipos de oficina',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.01.004',
    descripcion: 'Equipos de computación',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.01.005',
    descripcion: 'Vehículos',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.01.006',
    descripcion: 'Maquinaria y equipos pesados',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.02',
    descripcion: 'DEPRECIACION ACUMULADA',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.02.001',
    descripcion: 'Dep. acum. edificaciones e instalaciones',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.02.002',
    descripcion: 'Dep. acum. mobiliario y equipos de oficina',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.02.003',
    descripcion: 'Dep. acum. equipos de computación',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.02.004',
    descripcion: 'Dep. acum. vehículos',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.02.005',
    descripcion: 'Dep. acum. maquinaria y equipos pesados',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.03',
    descripcion: 'OBRAS EN PROCESO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.03.001',
    descripcion: 'Construcciones en proceso Zona #1 / Obra #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.02.03.002',
    descripcion: 'Construcciones en proceso Zona #2 / Obra #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.03',
    descripcion: 'ACTIVOS INTANGIBLES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.03.01',
    descripcion: 'COSTOS DE INTANGIBLES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.03.01.001',
    descripcion: 'Software / Licencias #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.03.01.002',
    descripcion: 'Software / Licencias #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.03.02',
    descripcion: 'AMORTIZACION DE INTANGIBLES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.03.02.001',
    descripcion: 'Amort. acum. software / licencias #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.03.02.002',
    descripcion: 'Amort. acum. software / licencias #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.04',
    descripcion: 'OTROS ACTIVOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.04.01',
    descripcion: 'CARGOS DIFERIDOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.04.01.001',
    descripcion: 'Cargos diferidos  ',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1.2.04.01.002',
    descripcion: 'Otros activos',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2',
    descripcion: 'PASIVO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1',
    descripcion: 'PASIVO CORRIENTE',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.01',
    descripcion: 'CUENTAS Y EFECTOS POR PAGAR',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.01.01',
    descripcion: 'PRESTAMOS BANCARIOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.01.01.001',
    descripcion: 'Préstamo bancario - Banco #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.01.01.002',
    descripcion: 'Préstamo bancario - Banco #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.01.02',
    descripcion: 'PRESTAMOS FINANCIEROS A CORTO PLAZO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.01.02.001',
    descripcion: 'Prestamos financieros a terceros',
    conciliacion: 'Cuentas por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.01.03',
    descripcion: 'EFECTOS POR PAGAR CORTO PLAZO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.01.03.001',
    descripcion: 'Efectos por pagar a terceros',
    conciliacion: 'Cuentas por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.01.04',
    descripcion: 'CUENTAS POR PAGAR CORRIENTES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.01.04.001',
    descripcion: 'Cuentas por pagar comerciales',
    conciliacion: 'Cuentas por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.01.04.002',
    descripcion: 'Cuentas por pagar empleados',
    conciliacion: 'Cuentas por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.01.04.003',
    descripcion: 'Cuentas por pagar accionistas / socios',
    conciliacion: 'Cuentas por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.01.04.004',
    descripcion: 'Cuentas por pagar empresas relacionadas',
    conciliacion: 'Cuentas por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.01.04.005',
    descripcion: 'Cuentas por pagar varias',
    conciliacion: 'Cuentas por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02',
    descripcion: 'RETENCIONES Y GASTOS ACUMULADOS POR PAGAR',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.01',
    descripcion: 'OBLIGACIONES LABORALES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.01.001',
    descripcion: 'Nomina por pagar',
    conciliacion: 'Cuentas por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.01.002',
    descripcion: 'Complemento beneficio por pagar',
    conciliacion: 'Cuentas por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.01.003',
    descripcion: 'Vacaciones por pagar',
    conciliacion: 'Cuentas por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.01.004',
    descripcion: 'Utilidades por pagar',
    conciliacion: 'Cuentas por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.01.005',
    descripcion: 'Bonificaciones a empleados y directores por pagar',
    conciliacion: 'Cuentas por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.02',
    descripcion: 'RETENCIONES Y APORTES DE EMPLEADOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.02.001',
    descripcion: 'SSO por pagar',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.02.002',
    descripcion: 'RPE por pagar',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.02.003',
    descripcion: 'LPH (Banavih) por pagar',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.02.004',
    descripcion: 'INCES',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.03',
    descripcion: 'IMPUESTOS POR PAGAR',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.03.001',
    descripcion: 'IVA débito fiscal (ventas)',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.03.002',
    descripcion: 'Retención IVA por pagar (compras)',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.03.003',
    descripcion: 'Retención ISLR por pagar (compras)',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.03.004',
    descripcion: 'ISLR definitivo por pagar',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.03.005',
    descripcion: 'Impuestos municipales por pagar',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.03.006',
    descripcion: 'Fonacit',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.03.007',
    descripcion: 'IGTF por pagar (ventas)',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.04',
    descripcion: 'CONTRIBUCIONES POR PAGAR',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.04.001',
    descripcion: 'SSO Patronal por pagar',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.04.002',
    descripcion: 'RPE Patronal por pagar',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.04.003',
    descripcion: 'LPH Patronal por pagar',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.04.004',
    descripcion: 'INCE Patronal por pagar',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.1.02.04.005',
    descripcion: 'Aporte Patronal de pensión',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2',
    descripcion: 'PASINO NO CORRIENTE',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.01',
    descripcion: 'CUENTAS Y EFECTOS POR PAGAR LARGO PLAZO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.01.01',
    descripcion: 'PRESTAMOS BANCARIOS A LARGO PLAZO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.01.01.001',
    descripcion: 'Préstamo bancario a largo plazo - Banco #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.01.01.002',
    descripcion: 'Préstamo bancario a largo plazo - Banco #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.01.02',
    descripcion: 'PRESTAMOS FINANCIEROS A LARGO PLAZO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.01.02.001',
    descripcion: 'Prestamos financieros a terceros a largo plazo',
    conciliacion: 'Cuentas por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.01.03',
    descripcion: 'EFECTOS POR PAGAR LARGO PLAZO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.01.03.001',
    descripcion: 'Efectos por pagar a terceros a largo plazo',
    conciliacion: 'Cuentas por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.01.04',
    descripcion: 'OBLIGACIONES LABORALES A LARGO PLAZO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.01.04.001',
    descripcion: 'Prestaciones sociales por pagar',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.01.04.002',
    descripcion: 'Intereses sobre prestaciones sociales',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.02',
    descripcion: 'OTROS PASIVOS NO CORRIENTES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.02.01',
    descripcion: 'ANTICIPOS RECIBIDOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.02.01.001',
    descripcion: 'Anticipos de obras Zona #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.02.01.002',
    descripcion: 'Anticipos de obras Zona #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.02.02',
    descripcion: 'OTROS DIFERIDOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2.2.02.02.001',
    descripcion: 'Otros créditos diferidos',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3',
    descripcion: 'PATRIMONIO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3.1',
    descripcion: 'PATRIMONIO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3.1.01',
    descripcion: 'CAPITAL',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3.1.01.01',
    descripcion: 'CAPITAL SOCIAL',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3.1.01.01.001',
    descripcion: 'Capital social suscrito',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3.1.01.01.002',
    descripcion: 'Capital social no pagado',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3.1.01.02',
    descripcion: 'RESULTADOS ACUMULADOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3.1.01.02.001',
    descripcion: 'Superávit / (déficit) acumulado',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3.1.01.02.002',
    descripcion: 'Resultados del ejercicio en curso',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3.1.01.03',
    descripcion: 'RESERVAS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3.1.01.03.001',
    descripcion: 'Reserva legal obligatoria',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3.1.01.04',
    descripcion: 'OTROS RESULTADOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3.1.01.04.001',
    descripcion: 'Superávit en acciones recibidas',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3.1.01.04.002',
    descripcion: 'Superávit por revalorización de activos',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4',
    descripcion: 'INGRESOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1',
    descripcion: 'INGRESOS ORDINARIOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.01',
    descripcion: 'INGRESOS POR VENTAS DE MERCANCIAS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.01.01',
    descripcion: 'VENTAS DE MERCANCIAS EN SUCURSAL / ZONA #1',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.01.01.001',
    descripcion: 'Mercancía / Categoría de producto #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.01.01.002',
    descripcion: 'Mercancía / Categoría de producto #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.01.02',
    descripcion: 'VENTAS DE MERCANCIAS EN SUCURSAL / ZONA #2',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.01.02.001',
    descripcion: 'Mercancía / Categoría de producto #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.01.02.002',
    descripcion: 'Mercancía / Categoría de producto #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.02',
    descripcion: 'INGRESOS POR VENTAS DE SERVICIOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.02.01',
    descripcion: 'SERVICIOS PRESTADOS EN ZONA #1',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.02.01.001',
    descripcion: 'Servicio #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.02.01.002',
    descripcion: 'Servicio #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.02.02',
    descripcion: 'SERVICIOS PRESTADOS EN ZONA #2',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.02.02.001',
    descripcion: 'Servicio #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.02.02.002',
    descripcion: 'Servicio #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.03',
    descripcion: 'DESCUENTOS Y DEVOLUCIONES EN VENTAS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.03.01',
    descripcion: 'DESCUENTOS Y DEVOLUCIONES EN VENTAS DE PRODUCTOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.03.01.001',
    descripcion: 'Descuento / Devolución en venta de mercancía / categoría #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.03.02',
    descripcion: 'DESCUENTOS Y DEVOLUCIONES EN VENTAS DE SERVICIOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.1.03.02.001',
    descripcion: 'Descuento / Devolución en venta de servicio #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.2',
    descripcion: 'INGRESOS EXTRA-ORDINARIOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.2.01',
    descripcion: 'INGRESOS FINANCIEROS Y OTROS INGRESOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.2.01.01',
    descripcion: 'INGRESOS FINANCIEROS  ',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.2.01.01.001',
    descripcion: 'Intereses ganados',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.2.01.01.002',
    descripcion: 'Dividendos recibidos',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.2.01.02',
    descripcion: 'OTROS INGRESOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.2.01.02.001',
    descripcion: 'Ingresos por alquiler',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.2.01.02.002',
    descripcion: 'Ingresos en venta de activos',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4.2.01.02.003',
    descripcion: 'Ingresos varios',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5',
    descripcion: 'COSTOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.1',
    descripcion: 'COSTOS GENERALES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.1.01',
    descripcion: 'COSTOS DE VENTA GENERALES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.1.01.01',
    descripcion: 'COSTOS DE VENTAS DE MERCANCIA GENERAL',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.1.01.01.001',
    descripcion: 'Inventario inicial de mercancías',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.1.01.01.002',
    descripcion: 'Compras nacionales de mercancías generales',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.1.01.01.003',
    descripcion: 'Compras importadas de mercancías generales',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.1.01.01.004',
    descripcion: 'Costos de nacionalización mercancías importadas',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.1.01.01.005',
    descripcion: 'Costos de fletes sobre compras',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.1.01.01.006',
    descripcion: 'Descuentos y devoluciones sobre compras',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.1.01.01.007',
    descripcion: 'Material de empaque',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.1.01.01.008',
    descripcion: 'Inventario final de mercancía generales',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2',
    descripcion: 'COSTOS DE PRODUCCION Y VENTAS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01',
    descripcion: 'COSTOS DE PRODUCCION Y VENTAS PRODUCTOS TERMINADOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.01',
    descripcion: 'PRODUCTOS TERMINADOS VENDIDOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.01.001',
    descripcion: 'Costos Inventarios - Rubro / categoría #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.01.002',
    descripcion: 'Costos Inventarios - Rubro / categoría #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.01.003',
    descripcion: 'Costos Inventarios - Rubro / categoría #3',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.02',
    descripcion: 'CONSUMO DE MATERIA PRIMA',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.02.001',
    descripcion: 'Materia prima / materiales #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.02.002',
    descripcion: 'Materia prima / materiales #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.02.801',
    descripcion: 'Pérdida por devolución en mercancías',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.02.999',
    descripcion: 'Distribución a inventarios productos terminados',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.03',
    descripcion: 'COSTOS DE FABRICACION',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.03.001',
    descripcion: 'Gasto depreciación instalaciones y edificaciones',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.03.002',
    descripcion: 'Gasto depreciación maquinarias y equipos de fabricación',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.03.003',
    descripcion: 'Gasto depreciación equipos computación de fabricación',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.03.004',
    descripcion: 'Gastos depreciación equipos de trasporte y carga',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.03.005',
    descripcion: 'Electricidad, agua y gas y otros servicios públicos',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.03.006',
    descripcion: 'Servicios adicionales al costo contratados',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.03.007',
    descripcion: 'Descuentos y devoluciones en costos de fabricación',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.03.008',
    descripcion: 'Fletes y transporte de mercancía',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.03.999',
    descripcion: 'Distribución a inventarios productos terminados',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04',
    descripcion: 'COSTOS DE MANO OBRA DIRECTA',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.001',
    descripcion: 'Sueldos y salarios operacionales',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.002',
    descripcion: 'Sueldos y salarios operacionales (horas extras)',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.003',
    descripcion: 'Complemento beneficio de alimentación',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.004',
    descripcion: 'Cesta ticket de alimentación',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.005',
    descripcion: 'Utilidades personal',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.006',
    descripcion: 'Vacaciones personal',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.007',
    descripcion: 'Bono vacacional',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.008',
    descripcion: 'Prima por antigüedad',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.009',
    descripcion: 'Aporte patronal SSO',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.010',
    descripcion: 'Aporte patronal RPE',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.011',
    descripcion: 'Aporte patronal LPH (Banavih)',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.012',
    descripcion: 'Aporte patronal INCE',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.013',
    descripcion: 'Prestaciones sociales',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.014',
    descripcion: 'Intereses sobre prestaciones sociales',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.015',
    descripcion: 'Uniforme del personal y artículos de seguridad',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.016',
    descripcion: 'Medicinas y gastos médicos',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.017',
    descripcion: 'Gastos transporte del personal',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5.2.01.04.999',
    descripcion: 'Distribución a inventarios productos terminados',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6',
    descripcion: 'GASTOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1',
    descripcion: 'GASTOS GENERALES Y DE ADMINISTRACION',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01',
    descripcion: 'GASTOS OPERACIONALES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01',
    descripcion: 'GASTOS DE PERSONAL ',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.001',
    descripcion: 'Sueldos directivos',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.002',
    descripcion: 'Bonificación directivos',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.003',
    descripcion: 'Sueldos administración',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.004',
    descripcion: 'Complemento beneficio de alimentación',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.005',
    descripcion: 'Cesta ticket de alimentación',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.006',
    descripcion: 'Utilidades personal',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.007',
    descripcion: 'Vacaciones personal',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.008',
    descripcion: 'Bono vacacional',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.009',
    descripcion: 'Prima por antigüedad',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.010',
    descripcion: 'Aporte patronal SSO',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.011',
    descripcion: 'Aporte patronal RPE',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.012',
    descripcion: 'Aporte patronal LPH (Banavih)',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.013',
    descripcion: 'Aporte patronal INCE',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.014',
    descripcion: 'Prestaciones sociales',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.015',
    descripcion: 'Intereses sobre prestaciones sociales',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.016',
    descripcion: 'Uniformes del personal',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.017',
    descripcion: 'Medicinas y gastos médicos',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.018',
    descripcion: 'Transporte del personal',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.019',
    descripcion: 'Agasajos y reconocimientos al personal',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.020',
    descripcion: 'Alimentos y bebidas',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.021',
    descripcion: 'Viáticos y hospedajes',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.01.022',
    descripcion: 'Adiestramiento del personal',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02',
    descripcion: 'GASTOS DE ADMINISTRACION',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.001',
    descripcion: 'Alquiler de local',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.002',
    descripcion: 'Condominio',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.003',
    descripcion: 'Gastos de supervisión',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.004',
    descripcion: 'Honorarios profesionales',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.005',
    descripcion: 'Honorarios contables',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.006',
    descripcion: 'Servicios básicos (internet, agua, electricidad, etc.)',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.007',
    descripcion: 'Papelería y artículos de oficina',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.008',
    descripcion: 'Limpieza y artículos de limpieza',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.009',
    descripcion: 'Impuestos municipal por inmueble urbano',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.010',
    descripcion: 'Impuestos municipales actividades económicas',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.011',
    descripcion: 'Impuesto municipal publicidad y propaganda',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.012',
    descripcion: 'Servicios municipales',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.013',
    descripcion: 'FONACIT',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.014',
    descripcion: 'Gastos legales y gastos de registros',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.015',
    descripcion: 'Vigilancia y suministros de seguridad',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.016',
    descripcion: 'Compra de equipos menores',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.017',
    descripcion: 'Mantenimientos y reparaciones',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.018',
    descripcion: 'Soporte técnico',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.019',
    descripcion: 'Manejo de redes sociales',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.020',
    descripcion: 'Gasto por cuentas incobrables',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.021',
    descripcion: 'Publicidad contratada y gastos de comunicación',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.022',
    descripcion: 'Gastos de representación',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.023',
    descripcion: 'Viáticos y hospedajes',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.024',
    descripcion: 'Donaciones',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.025',
    descripcion: 'Fumigación instalaciones',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.026',
    descripcion: 'Pólizas de seguros',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.02.027',
    descripcion: 'Gastos varios',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.03',
    descripcion: 'GASTOS NO DEDUCIBLES',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.03.001',
    descripcion: 'Impuesto IGTF (no deducible)',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.03.002',
    descripcion: 'Multas (no deducible)',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.01.03.003',
    descripcion: 'Otros gastos no deducibles',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.02',
    descripcion: 'GASTOS DE DEPRECIACION Y AMORTIZACION',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.02.01',
    descripcion: 'GASTOS DE DEPRECIACION',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.02.01.001',
    descripcion: 'Depreciación edificaciones e instalaciones',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.02.01.002',
    descripcion: 'Depreciación mobiliario y equipos de oficina',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.02.01.003',
    descripcion: 'Depreciación equipos de computación',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.02.01.004',
    descripcion: 'Depreciación vehículos',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.02.01.005',
    descripcion: 'Depreciación maquinaria y equipos pesados',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.02.02',
    descripcion: 'GASTOS DE AMORTIZACION',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.02.02.001',
    descripcion: 'Amortización software / licencias #1',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.02.02.002',
    descripcion: 'Amortización software / licencias #2',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.03',
    descripcion: 'OTROS GASTOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.03.01',
    descripcion: 'GASTOS FINANCIEROS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.03.01.001',
    descripcion: 'Comisiones bancarias',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.03.01.002',
    descripcion: 'Intereses bancarios',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6.1.03.01.003',
    descripcion: 'Intereses moratorios',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7',
    descripcion: 'OTROS INGRESOS O EGRESOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7.1',
    descripcion: 'OTROS INGRESOS O EGRESOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7.1.01',
    descripcion: 'OTROS INGRESOS O EGRESOS ORDINARIOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7.1.01.01',
    descripcion: 'DIFERENCIAS EN OPERACIONES DIARIAS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7.1.01.01.001',
    descripcion: 'Diferencias en pagos y cobros',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7.1.01.01.002',
    descripcion: 'Sobrante / Faltante en caja',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7.1.01.02',
    descripcion: 'DIFERENCIAL CAMBIARIO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7.1.01.02.001',
    descripcion: 'Ganancia por diferencias en cambio de divisas',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7.1.01.02.002',
    descripcion: 'Perdida por diferencias en cambio de divisas',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7.1.01.03',
    descripcion: 'AJUSTES DE INVENTARIOS',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7.1.01.03.001',
    descripcion: 'Ganancias en ajustes de inventario',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7.1.01.03.002',
    descripcion: 'Perdidas en ajustes de inventario',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7.2',
    descripcion: 'CUENTAS DE CIERRE DEL EJERCICIO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7.2.01',
    descripcion: 'IMPUESTOS DEL EJERCICIO',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7.2.01.01',
    descripcion: 'IMPUESTO SOBRE LA RENTA',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7.2.01.01.001',
    descripcion: 'Gasto de ISLR del ejercicio',
    conciliacion: '',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '8',
    descripcion: 'CUENTAS DE ORDEN (DEUDOR)',
    conciliacion: '',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '9',
    descripcion: 'CUENTAS DE ORDEN (ACREEDOR)',
    conciliacion: '',
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

export async function createPlanCuentaLight ({ clienteId }) {
  await createManyItemsSD({
    nameCollection: 'planCuenta',
    enviromentClienteId: clienteId,
    items: planCuentaLightDefecto
  })
}
