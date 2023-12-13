import { dataBasePrincipal } from '../constants.js'
import { accessToDataBase } from '../utils/dataBaseConfing.js'
// import listModulos from '../mocks/modulos.json' assert { type: 'json' }
// Importamos el módulo fs/promises
import fs from 'fs/promises'
// Importamos el archivo JSON
const modulosJson = await fs.readFile('./mocks/modulos.json')
// Convertimos el contenido del archivo JSON a un objeto JavaScript
const listModulos = JSON.parse(modulosJson)

export const createModules = async (req, res) => {
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const modulosCollection = await db.collection('modulos')
    console.log({ listModulos })
    await modulosCollection.insertMany(listModulos)
    return res.json({ status: 'ok' })
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}

export const getModules = async (req, res) => {
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const modulosCollection = await db.collection('modulos')
    const modulos = await modulosCollection.find().toArray()
    return res.status(200).json(modulos)
  } catch (e) {
    // console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
