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
export const collectionNameClient = ['ajustes', 'periodos', 'planCuenta', 'planCuentaRespaldo', 'comprobantes', 'detallesComprobantes', 'terceros']
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
