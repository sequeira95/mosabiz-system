import { dataBasePrincipal } from '../constants.js'
import { accessToDataBase } from '../utils/dataBaseConfing.js'

export const getRols = async (req, res) => {
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const rolsCollections = await db.collection('rols')
    const rols = await rolsCollections.find().toArray()
    return res.status(200).json(rols)
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}

export const createRol = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body
    const db = await accessToDataBase(dataBasePrincipal)
    const rolsCollections = await db.collection('rols')
    await rolsCollections.insertOne({ nombre, descripcion })
    return res.status(200).json({ ok: 'Rol creado' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
