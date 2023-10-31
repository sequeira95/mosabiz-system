import { dataBaseSecundaria, subDominioName } from '../../constants'
import { accessToDataBase, formatCollectionName } from '../../utils/dataBaseConfing'

export const getPerfilEmpresa = async (req, res) => {
  try {
    const db = await accessToDataBase(dataBaseSecundaria)
    const subDominioEmpresaCollectionsName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'empresa' })
    const empresaCollection = await db.collection(subDominioEmpresaCollectionsName)
    const empresa = await empresaCollection.findOne()
    return res.status(200).json(empresa)
  } catch (e) {
    return res.status(500).json({ error: 'Error de servidor al momento de buscar los datos de la empresa' })
  }
}
