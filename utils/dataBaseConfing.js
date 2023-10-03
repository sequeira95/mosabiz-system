import { clientDb } from '../index.js'
// accedemos a la base de datos correspondiente
export async function accessToDataBase (dataBaseName) {
  return await clientDb.db(dataBaseName)
}
// formateo del nombre de la coleccion
export function formatCollectionName ({ enviromentEmpresa, enviromentCliente, nameCollection }) {
  if (enviromentCliente) {
    return `col_${enviromentEmpresa}_${enviromentCliente}_${nameCollection}`
  }
  return `col_${enviromentEmpresa}_${nameCollection}`
}
