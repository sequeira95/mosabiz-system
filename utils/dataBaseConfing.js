import { collectionNameClient, dataBasePrincipal, dataBaseSecundaria, subDominioName } from '../constants.js'
import { clientDb } from '../index.js'
// accedemos a la base de datos correspondiente
export async function accessToDataBase (dataBaseName) {
  return await clientDb.db(dataBaseName)
}
// formateo del nombre de la coleccion
export function formatCollectionName ({ enviromentEmpresa, enviromentClienteId, nameCollection }) {
  if (enviromentClienteId) {
    return `col_${enviromentEmpresa}_${enviromentClienteId}_${nameCollection}`
  }
  return `col_${enviromentEmpresa}_${nameCollection}`
}
// funciones base de datos principal
export async function getCollection ({ nameCollection, filters = {} }) {
  const db = await accessToDataBase(dataBasePrincipal)
  const collection = await db.collection(nameCollection)
  return await collection.find(filters).toArray()
}
export async function getItem ({ nameCollection, filters = {} }) {
  const db = await accessToDataBase(dataBasePrincipal)
  const collection = await db.collection(nameCollection)
  return await collection.findOne(filters)
}
export async function updateItem ({ nameCollection, filters = {}, update = {} }) {
  const db = await accessToDataBase(dataBasePrincipal)
  const collection = await db.collection(nameCollection)
  return await collection.findOneAndUpdate(filters, update, { returnDocument: 'after' })
}
export async function upsertItem ({ nameCollection, filters = {}, update = {} }) {
  const db = await accessToDataBase(dataBasePrincipal)
  const collection = await db.collection(nameCollection)
  return await collection.findOneAndUpdate(filters, update, { upsert: true, returnDocument: 'after' })
}
export async function agreggateCollections ({ nameCollection, pipeline = [] }) {
  const db = await accessToDataBase(dataBasePrincipal)
  const collection = await db.collection(nameCollection)
  return await collection.aggregate(pipeline).toArray()
}
export async function createItem ({ nameCollection, item = {} }) {
  const db = await accessToDataBase(dataBasePrincipal)
  const collection = await db.collection(nameCollection)
  return await collection.insertOne(item)
}
export async function createItems ({ nameCollection, pipeline = [] }) {
  const db = await accessToDataBase(dataBasePrincipal)
  const collection = await db.collection(nameCollection)
  return await collection.bulkWrite(pipeline)
}
export async function deleteItem ({ nameCollection, filters = {} }) {
  const db = await accessToDataBase(dataBasePrincipal)
  const collection = await db.collection(nameCollection)
  return await collection.deleteOne(filters)
}
export async function deleteItems ({ nameCollection, filters = {} }) {
  const db = await accessToDataBase(dataBasePrincipal)
  const collection = await db.collection(nameCollection)
  return await collection.deleteMany(filters)
}
// funciones base de datos secundaria
export async function getCollectionSD ({ enviromentClienteId, nameCollection, filters = {} }) {
  const db = await accessToDataBase(dataBaseSecundaria)
  let collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection })
  if (enviromentClienteId) collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId, nameCollection })
  const collection = await db.collection(collecionName)
  return await collection.find(filters).toArray()
}
export async function getItemSD ({ enviromentClienteId, nameCollection, filters = {} }) {
  const db = await accessToDataBase(dataBaseSecundaria)
  let collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection })
  if (enviromentClienteId) collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId, nameCollection })
  const collection = await db.collection(collecionName)
  return await collection.findOne(filters)
}
export async function updateItemSD ({ enviromentClienteId, nameCollection, filters = {}, update = {} }) {
  const db = await accessToDataBase(dataBaseSecundaria)
  let collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection })
  if (enviromentClienteId) collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId, nameCollection })
  const collection = await db.collection(collecionName)
  return await collection.findOneAndUpdate(filters, update, { returnDocument: 'after' })
}
export async function updateManyItemSD ({ enviromentClienteId, nameCollection, filters = {}, update = {} }) {
  const db = await accessToDataBase(dataBaseSecundaria)
  let collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection })
  if (enviromentClienteId) collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId, nameCollection })
  const collection = await db.collection(collecionName)
  return await collection.updateMany(filters, update)
}
export async function upsertItemSD ({ enviromentClienteId, nameCollection, filters = {}, update = {} }) {
  const db = await accessToDataBase(dataBaseSecundaria)
  let collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection })
  if (enviromentClienteId) collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId, nameCollection })
  const collection = await db.collection(collecionName)
  return await collection.findOneAndUpdate(filters, update, { upsert: true, returnDocument: 'after' })
}
export async function agreggateCollectionsSD ({ enviromentClienteId, nameCollection, pipeline = [] }) {
  const db = await accessToDataBase(dataBaseSecundaria)
  let collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection })
  if (enviromentClienteId) collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId, nameCollection })
  const collection = await db.collection(collecionName)
  return await collection.aggregate(pipeline).toArray()
}
export async function createItemSD ({ enviromentClienteId, nameCollection, item = {} }) {
  const db = await accessToDataBase(dataBaseSecundaria)
  let collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection })
  if (enviromentClienteId) collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId, nameCollection })
  const collection = await db.collection(collecionName)
  return await collection.insertOne(item)
}
export async function createManyItemsSD ({ enviromentClienteId, nameCollection, items = [] }) {
  const db = await accessToDataBase(dataBaseSecundaria)
  let collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection })
  if (enviromentClienteId) collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId, nameCollection })
  const collection = await db.collection(collecionName)
  return await collection.insertMany(items)
}
export async function deleteItemSD ({ enviromentClienteId, nameCollection, filters = {} }) {
  const db = await accessToDataBase(dataBaseSecundaria)
  let collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection })
  if (enviromentClienteId) collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId, nameCollection })
  const collection = await db.collection(collecionName)
  return await collection.deleteOne(filters)
}
export async function deleteManyItemsSD ({ enviromentClienteId, nameCollection, filters = {} }) {
  const db = await accessToDataBase(dataBaseSecundaria)
  let collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection })
  if (enviromentClienteId) collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId, nameCollection })
  const collection = await db.collection(collecionName)
  return await collection.deleteMany(filters)
}
export async function bulkWriteSD ({ enviromentClienteId, nameCollection, pipeline = [] }) {
  const db = await accessToDataBase(dataBaseSecundaria)
  let collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection })
  if (enviromentClienteId) collecionName = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId, nameCollection })
  const collection = await db.collection(collecionName)
  return await collection.bulkWrite(pipeline)
}
export async function deleteCollection ({ enviromentClienteId }) {
  const db = await accessToDataBase(dataBaseSecundaria)
  const listCollections = collectionNameClient
  for (const collection of listCollections) {
    console.log(collection)
    const nameCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId, nameCollection: collection })
    console.log(nameCollection)
    try {
      await db.collection(nameCollection).drop()
      console.log(`La coleccion ${collection} fue eliminada`)
      continue
    } catch (e) {
      console.log({ error: e.message })
      continue
    }
  }
}
export async function createCollectionClient ({ enviromentClienteId }) {
  const db = await accessToDataBase(dataBaseSecundaria)
  const listCollections = collectionNameClient
  for (const collection of listCollections) {
    console.log(collection)
    const nameCollection = formatCollectionName({ enviromentEmpresa: subDominioName, enviromentClienteId, nameCollection: collection })
    console.log(nameCollection)
    try {
      await db.createCollection(nameCollection)
      console.log(`La coleccion ${collection} fue creada`)
      continue
    } catch (e) {
      console.log({ error: e.message })
      continue
    }
  }
  createIndexCollectionClient({ enviromentClienteId })
}
async function createIndexCollectionClient ({ enviromentClienteId }) {
}
