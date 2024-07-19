export const dataBasePrincipal = 'aibiz'

export const dataBaseSecundaria = process.env.DB_NAME
export const subDominioName = process.env.ENVIROMENTID
export const lengthCodigoByNiveles = {
  1: 1,
  2: 2,
  3: 4,
  4: 7,
  5: 10,
  6: 13
}
export const nivelesCodigoByLength = {
  1: 1,
  2: 2,
  4: 3,
  7: 4,
  10: 5,
  13: 6
}
export const ObjectNumbersMonths = {
  ENERO: 1,
  FEBRERO: 2,
  MARZO: 3,
  ABRIL: 4,
  MAYO: 5,
  JUNIO: 6,
  JULIO: 7,
  AGOSTO: 8,
  SEPTIEMBRE: 9,
  OCTUBRE: 10,
  NOVIEMBRE: 11,
  DICIEMBRE: 12

}
export const getParentCode = (code) => {
  const nivel = nivelesCodigoByLength[String(code).length]
  const length = lengthCodigoByNiveles[nivel - 1]
  const parentCode = String(code).slice(0, length)
  return parentCode
}

export const statusOptionsPeriodos = {
  activo: 'Activo',
  preCierre: 'Pre-cierre',
  cerrado: 'Cerrado'
}
export const keyActivosFijos = {
  fechaAdquisicion: 'Fecha adquisición',
  zona: 'Zona',
  categoria: 'Categoría',
  nombre: 'Nombre',
  codigo: 'Código',
  descripcion: 'Descripción',
  tipo: 'Tipo',
  unidad: 'Unidad',
  cantidad: 'Cantidad',
  vidaUtil: 'Vida útil',
  comprobanteRegistroActivo: 'Comprobante de registro de activo'
}
export const collectionNameClient = [
  'ajustes', 'periodos', 'planCuenta', 'planCuentaRespaldo', 'comprobantes', 'detallesComprobantes', 'terceros', 'estadoBancarios', 'categorias',
  'zonas', 'categoriaPorZona', 'activosFijos', 'almacenes', 'categoriaPorAlmacen', 'historial', 'productos', 'contadores', 'movimientos', 'detalleMovimientos',
  'productosPorAlmacen', 'retencionISLR', 'bancos', 'clientes', 'servicios', 'iva', 'proveedores', 'metodosPagos', 'compras', 'detalleCompra', 'transacciones',
  'documentosFiscales', 'detalleDocumentosFiscales', 'ventassucursales', 'ventaszonas', 'zonasPorSucursales'
]
export const collectionNameAIbiz = [
  'islr', 'iva', 'bancos', 'retIva'
]
export const ListIndexesClient = [
  {
    collection: 'ajustes',
    indices:
    [
      { key: { tipo: 1 }, background: true }
    ]
  },
  {
    collection: 'ajustes',
    indices:
    [
      { key: { tipo: 1 }, background: true }
    ]
  },
  {
    collection: 'comprobantes',
    indices:
    [
      { key: { periodoId: 1 }, background: true },
      { key: { periodoId: 1, nombre: 1 }, background: true }
    ]
  },
  {
    collection: 'detallesComprobantes',
    indices:
    [
      { key: { comprobanteId: 1 }, background: true }
    ]
  }
]
export const tipoMovimientosShort = {
  solicitudInterna: 'SI',
  solicitudCompra: 'SC',
  transferencia: 'TR',
  Ajuste: 'AJ',
  devolucion: 'DEV',
  recepcion: 'REC'
}
