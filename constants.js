export const dataBasePrincipal = 'aibiz'

export const dataBaseSecundaria = process.env.DB_NAME
export const subDominioName = process.env.ENVIROMENTID
export const lengthCodigoByNiveles = {
  1: 1,
  2: 3,
  3: 5,
  4: 8,
  5: 11,
  6: 14
}
export const nivelesCodigoByLength = {
  1: 1,
  3: 2,
  5: 3,
  8: 4,
  11: 5,
  14: 6
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
  vidaUtil: 'Vida útil'
}
export const collectionNameClient = [
  'ajustes', 'periodos', 'planCuenta', 'planCuentaRespaldo', 'comprobantes', 'detallesComprobantes', 'terceros', 'estadoBancarios', 'categorias',
  'zonas', 'categoriaPorZona', 'activosFijos', 'almacenes', 'categoriaPorAlmacen', 'historial', 'productos'
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
