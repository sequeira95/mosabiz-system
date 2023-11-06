import moment from 'moment'
import { dataBasePrincipal, dataBaseSecundaria, subDominioName } from '../../constants.js'
import { accessToDataBase, formatCollectionName } from '../../utils/dataBaseConfing.js'

export const upsertAjusteCliente = async (req, res) => {
  const ajuste = req.body
  console.log(ajuste)
}
