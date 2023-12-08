import { dataBasePrincipal } from '../constants.js'
import { accessToDataBase } from '../utils/dataBaseConfing.js'
// Importamos el módulo fs/promises
import fs from 'fs/promises'
// Importamos el archivo JSON
const rolsJson = await fs.readFile('./mocks/roles.json')
// Convertimos el contenido del archivo JSON a un objeto JavaScript
const listOfRols = JSON.parse(rolsJson)

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
    const db = await accessToDataBase(dataBasePrincipal)
    const rolsCollections = await db.collection('rols')
    console.log({ listOfRols })
    await rolsCollections.insertMany(listOfRols)
    return res.status(200).json({ ok: 'Rol creado' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
