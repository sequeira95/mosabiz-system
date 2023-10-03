import { MongoClient } from 'mongodb'
async function connect () {
  const client = new MongoClient(process.env.URI)
  try {
    await client.connect()
    console.log('Connected to MongoDB')
    return client
  } catch (e) {
    return console.log(e)
  }
}

const client = await connect()
export default client
