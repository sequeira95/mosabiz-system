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
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '11',
    descripcion: 'ACTIVO CIRCULANTE',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1101',
    descripcion: 'EFECTIVO Y EQUIVALENTES DE EFECTIVO',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110101',
    descripcion: 'EFECTIVO EN CAJAS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110101001',
    descripcion: 'Caja principal - Bolívares',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110101201',
    descripcion: 'Caja principal - Dólares',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110101901',
    descripcion: 'Caja chica - Administración',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110101902',
    descripcion: 'Caja chica - Operaciones',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110102',
    descripcion: 'CAJAS Y PUNTOS DE VENTAS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110102001',
    descripcion: 'Caja punto de venta #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110102002',
    descripcion: 'Caja punto de venta #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110103',
    descripcion: 'BANCOS NACIONALES',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110103001',
    descripcion: 'Banco # 1 - Cta. 12345',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110103002',
    descripcion: 'Banco # 2 - Cta. 12345',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110104',
    descripcion: 'BANCOS NACIONAL CUSTODIOS ME',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110104001',
    descripcion: 'Banco # 1 - Cta. 12345',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110104002',
    descripcion: 'Banco # 2 - Cta. 12345',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110105',
    descripcion: 'BANCOS INTERNACIONALES ME',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110105001',
    descripcion: 'Banco # 1 - Cta. 12345',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110105002',
    descripcion: 'Banco # 2 - Cta. 12345',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110106',
    descripcion: 'DEPOSITOS EN PLAZOS FIJOS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110106001',
    descripcion: 'Deposito a plazo fijo - Banco #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110106002',
    descripcion: 'Deposito a plazo fijo - Banco #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110107',
    descripcion: 'OTRAS COLOCACIONES EN VALORES',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110107001',
    descripcion: 'Bono #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110107002',
    descripcion: 'Bono #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1102',
    descripcion: 'DOCUMENTOS Y CUENTAS POR COBRAR',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110201',
    descripcion: 'CUENTAS POR COBRAR CORRIENTES',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110201001',
    descripcion: 'Cuentas por cobrar comerciales',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110201002',
    descripcion: 'Cuentas por cobrar empleados',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110201003',
    descripcion: 'Cuentas por cobrar accionistas / socios',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110201004',
    descripcion: 'Cuentas por cobrar empresas relacionadas',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110201005',
    descripcion: 'Cuentas por cobrar varias',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1103',
    descripcion: 'INVENTARIOS',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110301',
    descripcion: 'INVENTARIOS GENERALES',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110301001',
    descripcion: 'Inventarios de mercancía general',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110302',
    descripcion: 'INVENTARIOS DE MATERIA PRIMA',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110302001',
    descripcion: 'Almacén principal',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110302002',
    descripcion: 'Almacén #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110302003',
    descripcion: 'Almacén #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110302701',
    descripcion: 'Almacén en transito',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110302801',
    descripcion: 'Almacén de devoluciones',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110302901',
    descripcion: 'Almacén en auditoria',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110303',
    descripcion: 'INVENTARIOS DE PRODUCTOS EN PROCESO',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110303001',
    descripcion: 'Almacén principal',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110303002',
    descripcion: 'Almacén #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110303003',
    descripcion: 'Almacén #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110303701',
    descripcion: 'Almacén en transito',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110303801',
    descripcion: 'Almacén de devoluciones',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110303901',
    descripcion: 'Almacén en auditoria',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110304',
    descripcion: 'INVENTARIOS DE PRODUCTOS TERMINADOS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110304001',
    descripcion: 'Almacén principal - Rubro / categoría #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110304002',
    descripcion: 'Almacén principal - Rubro / categoría #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110304003',
    descripcion: 'Almacén principal - Rubro / categoría #3',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110304701',
    descripcion: 'Almacén en transito',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110304802',
    descripcion: 'Almacén de devoluciones',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110304901',
    descripcion: 'Almacén en auditoria',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1104',
    descripcion: 'GASTOS PAGADOS POR ANTICIPADO',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110401',
    descripcion: 'GASTOS ANTICIPADOS CORRIENTES',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110401001',
    descripcion: 'Anticipo a proveedores',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110401002',
    descripcion: 'Seguros prepagados',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110401003',
    descripcion: 'Mercancía en tránsito',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110401004',
    descripcion: 'Otros gastos pagados por anticipado',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110402',
    descripcion: 'IMPUESTOS Y RETENCIONES NACIONALES ',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110402001',
    descripcion: 'IVA crédito fiscal (compras)',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110402002',
    descripcion: 'Retenciones IVA efectivas',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110402003',
    descripcion: 'ISLR estimada',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110402004',
    descripcion: 'Anticipo ISLR',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110402005',
    descripcion: 'Retenciones ISLR efectivas',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110403',
    descripcion: 'IMPUESTOS Y RETENCIONES MUNICIPALES',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110403001',
    descripcion: 'Retenciones municipales - municipio #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110403002',
    descripcion: 'Estimada impuestos municipales - municipio #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110403003',
    descripcion: 'Retenciones municipales - municipio #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '110403004',
    descripcion: 'Estimada impuestos municipales - municipio #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '12',
    descripcion: 'ACTIVO NO CORRIENTE',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1201',
    descripcion: 'INVERSIONES PERMANENTES',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120101',
    descripcion: 'INVERSIONES EN ACCIONES ',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120101001',
    descripcion: 'Compañías relacionadas',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120101002',
    descripcion: 'Acciones en otras compañías no relacionadas',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1202',
    descripcion: 'PROPIEDAD, PLANTA Y EQUIPO',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120201',
    descripcion: 'COSTOS DE ACTIVOS FIJOS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120201001',
    descripcion: 'Edificaciones e instalaciones',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120201002',
    descripcion: 'Mobiliario y equipos de oficina',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120201003',
    descripcion: 'Equipos de computación',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120201004',
    descripcion: 'Vehículos',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120201005',
    descripcion: 'Maquinaria y equipos pesados',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120202',
    descripcion: 'DEPRECIACION ACUMULADA',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120202001',
    descripcion: 'Dep. acum. edificaciones e instalaciones',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120202002',
    descripcion: 'Dep. acum. mobiliario y equipos de oficina',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120202003',
    descripcion: 'Dep. acum. equipos de computación',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120202004',
    descripcion: 'Dep. acum. vehículos',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120202005',
    descripcion: 'Dep. acum. maquinaria y equipos pesados',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120203',
    descripcion: 'OBRAS EN PROCESO',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120203001',
    descripcion: 'Construcciones en proceso Zona #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120203002',
    descripcion: 'Construcciones en proceso Zona #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1203',
    descripcion: 'ACTIVOS INTANGIBLES',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120301',
    descripcion: 'COSTOS DE INTANGIBLES',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120301001',
    descripcion: 'Software / Licencias #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120301002',
    descripcion: 'Software / Licencias #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120302',
    descripcion: 'AMORTIZACION DE INTANGIBLES',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120302001',
    descripcion: 'Amort. acum. software / licencias #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120302002',
    descripcion: 'Amort. acum. software / licencias #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '1204',
    descripcion: 'OTROS ACTIVOS',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120401',
    descripcion: 'CARGOS DIFERIDOS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120401001',
    descripcion: 'Cargos diferidos  ',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '120401002',
    descripcion: 'Otros activos',
    tipo: 'Movimiento',
    nivelCuenta: 5,
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
    codigo: '21',
    descripcion: 'PASIVO CORRIENTE',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2101',
    descripcion: 'CUENTAS Y EFECTOS POR PAGAR',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210101',
    descripcion: 'PRESTAMOS BANCARIOS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210101001',
    descripcion: 'Préstamo bancario - Banco #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210101002',
    descripcion: 'Préstamo bancario - Banco #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210102',
    descripcion: 'PRESTAMOS FINANCIEROS A CORTO PLAZO',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210102001',
    descripcion: 'Prestamos financieros a terceros',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210103',
    descripcion: 'EFECTOS POR PAGAR CORTO PLAZO',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210103001',
    descripcion: 'Efectos por pagar a terceros',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210104',
    descripcion: 'CUENTAS POR PAGAR CORRIENTES',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210104001',
    descripcion: 'Cuentas por pagar comerciales',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210104002',
    descripcion: 'Cuentas por pagar empleados',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210104003',
    descripcion: 'Cuentas por pagar accionistas / socios',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210104004',
    descripcion: 'Cuentas por pagar empresas relacionadas',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210104005',
    descripcion: 'Cuentas por pagar varias',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2102',
    descripcion: 'RETENCIONES Y GASTOS ACUMULADOS POR PAGAR',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210201',
    descripcion: 'OBLIGACIONES LABORALES',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210201001',
    descripcion: 'Nomina por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210201002',
    descripcion: 'Complemento beneficio por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210201003',
    descripcion: 'Vacaciones por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210201004',
    descripcion: 'Utilidades por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210201005',
    descripcion: 'Bonificaciones a empleados y directores por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210202',
    descripcion: 'RETENCIONES Y APORTES DE EMPLEADOS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210202001',
    descripcion: 'SSO por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210202002',
    descripcion: 'RPE por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210202003',
    descripcion: 'LPH (Banavih) por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210202004',
    descripcion: 'INCES',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210203',
    descripcion: 'IMPUESTOS POR PAGAR',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210203001',
    descripcion: 'IVA débito fiscal (ventas)',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210203002',
    descripcion: 'Retención IVA por pagar (compras)',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210203003',
    descripcion: 'Retención ISLR por pagar (compras)',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210203004',
    descripcion: 'ISLR definitivo por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210203005',
    descripcion: 'Impuestos municipales por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210203006',
    descripcion: 'Fonacit',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210203007',
    descripcion: 'IGTF por pagar (ventas)',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210204',
    descripcion: 'CONTRIBUCIONES POR PAGAR',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210204001',
    descripcion: 'SSO Patronal por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210204002',
    descripcion: 'RPE Patronal por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210204003',
    descripcion: 'LPH Patronal por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210204004',
    descripcion: 'INCE Patronal por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '210204005',
    descripcion: 'Aporte Patronal de pensión',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '22',
    descripcion: 'PASINO NO CORRIENTE',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2201',
    descripcion: 'CUENTAS Y EFECTOS POR PAGAR LARGO PLAZO',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '220101',
    descripcion: 'PRESTAMOS BANCARIOS A LARGO PLAZO',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '220101001',
    descripcion: 'Préstamo bancario a largo plazo - Banco #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '220101002',
    descripcion: 'Préstamo bancario a largo plazo - Banco #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '220102',
    descripcion: 'PRESTAMOS FINANCIEROS A LARGO PLAZO',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '220102001',
    descripcion: 'Prestamos financieros a terceros a largo plazo',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '220103',
    descripcion: 'EFECTOS POR PAGAR LARGO PLAZO',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '220103001',
    descripcion: 'Efectos por pagar a terceros a largo plazo',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '220104',
    descripcion: 'OBLIGACIONES LABORALES A LARGO PLAZO',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '220104001',
    descripcion: 'Prestaciones sociales por pagar',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '220104002',
    descripcion: 'Intereses sobre prestaciones sociales',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '2202',
    descripcion: 'OTROS PASIVOS NO CORRIENTES',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '220201',
    descripcion: 'ANTICIPOS RECIBIDOS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '220201001',
    descripcion: 'Anticipos de obras Zona #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '220201002',
    descripcion: 'Anticipos de obras Zona #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '220202',
    descripcion: 'OTROS DIFERIDOS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '220202001',
    descripcion: 'Otros créditos diferidos',
    tipo: 'Movimiento',
    nivelCuenta: 5,
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
    codigo: '31',
    descripcion: 'PATRIMONIO',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '3101',
    descripcion: 'CAPITAL',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '310101',
    descripcion: 'CAPITAL SOCIAL',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '310101001',
    descripcion: 'Capital social suscrito',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '310101002',
    descripcion: 'Capital social no pagado',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '310102',
    descripcion: 'RESULTADOS ACUMULADOS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '310102001',
    descripcion: 'Superávit / (déficit) acumulado',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '310102002',
    descripcion: 'Resultados del ejercicio en curso',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '310103',
    descripcion: 'RESERVAS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '310103001',
    descripcion: 'Reserva legal obligatoria',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '310104',
    descripcion: 'OTROS RESULTADOS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '310104001',
    descripcion: 'Superávit en acciones recibidas',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '310104002',
    descripcion: 'Superávit por revalorización de activos',
    tipo: 'Movimiento',
    nivelCuenta: 5,
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
    codigo: '41',
    descripcion: 'INGRESOS ORDINARIOS',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4101',
    descripcion: 'INGRESOS POR VENTAS DE MERCANCIAS',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '410101',
    descripcion: 'VENTAS DE MERCANCIAS EN SUCURSAL / ZONA #1',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '410101001',
    descripcion: 'Mercancía / Categoría de producto #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '410101002',
    descripcion: 'Mercancía / Categoría de producto #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '410102',
    descripcion: 'VENTAS DE MERCANCIAS EN SUCURSAL / ZONA #2',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '410102001',
    descripcion: 'Mercancía / Categoría de producto #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '410102002',
    descripcion: 'Mercancía / Categoría de producto #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4102',
    descripcion: 'INGRESOS POR VENTAS DE SERVICIOS',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '410201',
    descripcion: 'SERVICIOS PRESTADOS EN ZONA #1',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '410201001',
    descripcion: 'Servicio #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '410201002',
    descripcion: 'Servicio #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '410202',
    descripcion: 'SERVICIOS PRESTADOS EN ZONA #2',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '410202001',
    descripcion: 'Servicio #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '410202002',
    descripcion: 'Servicio #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '42',
    descripcion: 'INGRESOS EXTRA-ORDINARIOS',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '4201',
    descripcion: 'INGRESOS FINANCIEROS Y OTROS INGRESOS',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '420101',
    descripcion: 'INGRESOS FINANCIEROS  ',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '420101001',
    descripcion: 'Intereses ganados',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '420101002',
    descripcion: 'Dividendos recibidos',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '420102',
    descripcion: 'OTROS INGRESOS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '420102001',
    descripcion: 'Ingresos por alquiler',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '420102002',
    descripcion: 'Ingresos en venta de activos',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '420102003',
    descripcion: 'Ingresos varios',
    tipo: 'Movimiento',
    nivelCuenta: 5,
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
    codigo: '51',
    descripcion: 'COSTOS GENERALES',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5101',
    descripcion: 'COSTOS DE VENTA GENERALES',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '510101',
    descripcion: 'COSTOS DE VENTAS DE MERCANCIA GENERAL',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '510101001',
    descripcion: 'Inventario inicial de mercancías',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '510101002',
    descripcion: 'Compras nacionales de mercancías generales',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '510101003',
    descripcion: 'Compras importadas de mercancías generales',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '510101004',
    descripcion: 'Costos de nacionalización mercancías importadas',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '510101005',
    descripcion: 'Costos de fletes sobre compras',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '510101006',
    descripcion: 'Descuentos y devoluciones sobre compras',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '510101007',
    descripcion: 'Material de empaque',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '510101008',
    descripcion: 'Inventario final de mercancía generales',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '52',
    descripcion: 'COSTOS DE PRODUCCION Y VENTAS',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '5201',
    descripcion: 'COSTOS DE PRODUCCION Y VENTAS PRODUCTOS TERMINADOS',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520101',
    descripcion: 'PRODUCTOS TERMINADOS VENDIDOS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520101001',
    descripcion: 'Costos Inventarios - Rubro / categoría #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520101002',
    descripcion: 'Costos Inventarios - Rubro / categoría #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520101003',
    descripcion: 'Costos Inventarios - Rubro / categoría #3',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520102',
    descripcion: 'CONSUMO DE MATERIA PRIMA',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520102001',
    descripcion: 'Materia prima / materiales #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520102002',
    descripcion: 'Materia prima / materiales #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520102801',
    descripcion: 'Pérdida por devolución en mercancías',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520102999',
    descripcion: 'Distribución a inventarios productos terminados',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520103',
    descripcion: 'COSTOS DE FABRICACION',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520103001',
    descripcion: 'Gasto depreciación instalaciones y edificaciones',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520103002',
    descripcion: 'Gasto depreciación maquinarias y equipos de fabricación',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520103003',
    descripcion: 'Gasto depreciación equipos computación de fabricación',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520103004',
    descripcion: 'Gastos depreciación equipos de trasporte y carga',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520103005',
    descripcion: 'Electricidad, agua y gas y otros servicios públicos',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520103006',
    descripcion: 'Servicios adicionales al costo contratados',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520103007',
    descripcion: 'Descuentos y devoluciones en costos de fabricación',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520103008',
    descripcion: 'Fletes y transporte de mercancía',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520103999',
    descripcion: 'Distribución a inventarios productos terminados',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104',
    descripcion: 'COSTOS DE MANO OBRA DIRECTA',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104001',
    descripcion: 'Sueldos y salarios operacionales',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104002',
    descripcion: 'Sueldos y salarios operacionales (horas extras)',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104003',
    descripcion: 'Complemento beneficio de alimentación',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104004',
    descripcion: 'Cesta ticket de alimentación',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104005',
    descripcion: 'Utilidades personal',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104006',
    descripcion: 'Vacaciones personal',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104007',
    descripcion: 'Bono vacacional',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104008',
    descripcion: 'Prima por antigüedad',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104009',
    descripcion: 'Aporte patronal SSO',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104010',
    descripcion: 'Aporte patronal RPE',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104011',
    descripcion: 'Aporte patronal LPH (Banavih)',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104012',
    descripcion: 'Aporte patronal INCE',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104013',
    descripcion: 'Prestaciones sociales',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104014',
    descripcion: 'Intereses sobre prestaciones sociales',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104015',
    descripcion: 'Uniforme del personal y artículos de seguridad',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104016',
    descripcion: 'Medicinas y gastos médicos',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104017',
    descripcion: 'Gastos transporte del personal',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '520104999',
    descripcion: 'Distribución a inventarios productos terminados',
    tipo: 'Movimiento',
    nivelCuenta: 5,
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
    codigo: '61',
    descripcion: 'GASTOS GENERALES Y DE ADMINISTRACION',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6101',
    descripcion: 'GASTOS OPERACIONALES',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101',
    descripcion: 'GASTOS DE PERSONAL ',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101001',
    descripcion: 'Sueldos directivos',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101002',
    descripcion: 'Bonificación directivos',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101003',
    descripcion: 'Sueldos administración',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101004',
    descripcion: 'Complemento beneficio de alimentación',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101005',
    descripcion: 'Cesta ticket de alimentación',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101006',
    descripcion: 'Utilidades personal',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101007',
    descripcion: 'Vacaciones personal',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101008',
    descripcion: 'Bono vacacional',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101009',
    descripcion: 'Prima por antigüedad',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101010',
    descripcion: 'Aporte patronal SSO',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101011',
    descripcion: 'Aporte patronal RPE',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101012',
    descripcion: 'Aporte patronal LPH (Banavih)',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101013',
    descripcion: 'Aporte patronal INCE',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101014',
    descripcion: 'Prestaciones sociales',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101015',
    descripcion: 'Intereses sobre prestaciones sociales',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101016',
    descripcion: 'Uniformes del personal',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101017',
    descripcion: 'Medicinas y gastos médicos',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101018',
    descripcion: 'Transporte del personal',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101019',
    descripcion: 'Agasajos y reconocimientos al personal',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101020',
    descripcion: 'Alimentos y bebidas',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101021',
    descripcion: 'Viáticos y hospedajes',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610101022',
    descripcion: 'Adiestramiento del personal',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102',
    descripcion: 'GASTOS DE ADMINISTRACION',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102001',
    descripcion: 'Alquiler de local',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102002',
    descripcion: 'Condominio',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102003',
    descripcion: 'Gastos de supervisión',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102004',
    descripcion: 'Honorarios profesionales',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102005',
    descripcion: 'Honorarios contables',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102006',
    descripcion: 'Servicios básicos (internet, agua, electricidad, etc.)',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102007',
    descripcion: 'Papelería y artículos de oficina',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102008',
    descripcion: 'Limpieza y artículos de limpieza',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102009',
    descripcion: 'Impuestos municipal por inmueble urbano',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102010',
    descripcion: 'Impuestos municipales actividades económicas',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102011',
    descripcion: 'Impuesto municipal publicidad y propaganda',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102012',
    descripcion: 'Servicios municipales',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102013',
    descripcion: 'FONACIT',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102014',
    descripcion: 'Gastos legales y gastos de registros',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102015',
    descripcion: 'Vigilancia y suministros de seguridad',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102016',
    descripcion: 'Compra de equipos menores',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102017',
    descripcion: 'Mantenimientos y reparaciones',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102018',
    descripcion: 'Soporte técnico',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102019',
    descripcion: 'Manejo de redes sociales',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102020',
    descripcion: 'Gasto por cuentas incobrables',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102021',
    descripcion: 'Publicidad contratada y gastos de comunicación',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102022',
    descripcion: 'Gastos de representación',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102023',
    descripcion: 'Viáticos y hospedajes',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102024',
    descripcion: 'Donaciones',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102025',
    descripcion: 'Fumigación instalaciones',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102026',
    descripcion: 'Pólizas de seguros',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610102027',
    descripcion: 'Gastos varios',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610103',
    descripcion: 'GASTOS NO DEDUCIBLES',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610103001',
    descripcion: 'Impuesto IGTF (no deducible)',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610103002',
    descripcion: 'Multas (no deducible)',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610103003',
    descripcion: 'Otros gastos no deducibles',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6102',
    descripcion: 'GASTOS DE DEPRECIACION Y AMORTIZACION',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610201',
    descripcion: 'GASTOS DE DEPRECIACION',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610201001',
    descripcion: 'Depreciación edificaciones e instalaciones',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610201002',
    descripcion: 'Depreciación mobiliario y equipos de oficina',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610201003',
    descripcion: 'Depreciación equipos de computación',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610201004',
    descripcion: 'Depreciación vehículos',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610201005',
    descripcion: 'Depreciación maquinaria y equipos pesados',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610202',
    descripcion: 'GASTOS DE AMORTIZACION',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610202001',
    descripcion: 'Amortización software / licencias #1',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610202002',
    descripcion: 'Amortización software / licencias #2',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '6103',
    descripcion: 'OTROS GASTOS',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610301',
    descripcion: 'GASTOS FINANCIEROS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610301001',
    descripcion: 'Comisiones bancarias',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610301002',
    descripcion: 'Intereses bancarios',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '610301003',
    descripcion: 'Intereses moratorios',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7',
    descripcion: 'OTROS INGRESOS O EGRESOS',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '71',
    descripcion: 'OTROS INGRESOS O EGRESOS',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7101',
    descripcion: 'OTROS INGRESOS O EGRESOS ORDINARIOS',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '710101',
    descripcion: 'DIFERENCIAS EN OPERACIONES DIARIAS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '710101001',
    descripcion: 'Diferencias en pagos y cobros',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '710101002',
    descripcion: 'Sobrante / Faltante en caja',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '710102',
    descripcion: 'DIFERENCIAL CAMBIARIO',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '710102001',
    descripcion: 'Ganancia por diferencias en cambio de divisas',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '710102002',
    descripcion: 'Perdida por diferencias en cambio de divisas',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '710103',
    descripcion: 'AJUSTES DE INVENTARIOS',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '710103001',
    descripcion: 'Ganancias en ajustes de inventario',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '710103002',
    descripcion: 'Perdidas en ajustes de inventario',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '72',
    descripcion: 'CUENTAS DE CIERRE DEL EJERCICIO',
    tipo: 'Grupo',
    nivelCuenta: 2,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '7201',
    descripcion: 'IMPUESTOS DEL EJERCICIO',
    tipo: 'Grupo',
    nivelCuenta: 3,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '720101',
    descripcion: 'IMPUESTO SOBRE LA RENTA',
    tipo: 'Grupo',
    nivelCuenta: 4,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '720101001',
    descripcion: 'Gasto de ISLR del ejercicio',
    tipo: 'Movimiento',
    nivelCuenta: 5,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '8',
    descripcion: 'CUENTAS DE ORDEN (DEUDOR)',
    tipo: 'Grupo',
    nivelCuenta: 1,
    fechaCreacion: moment().toDate()
  },
  {
    codigo: '9',
    descripcion: 'CUENTAS DE ORDEN (ACREEDOR)',
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
