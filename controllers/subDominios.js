import crypto from 'node:crypto'
import { encryptPassword } from '../utils/hashPassword.js'
import { senEmail } from '../utils/nodemailsConfing.js'
import { accessToDataBase } from '../utils/dataBaseConfing.js'
import { dataBasePrincipal } from '../constants.js'
// import { formatCollectionName } from '../utils/formatCollectionName.js'

export const getSubDominios = async (req, res) => {
  try {
    const db = await accessToDataBase(dataBasePrincipal)
    const subDominiosCollection = await db.collection('sub-dominios')
    const subDominios = await subDominiosCollection.find().toArray()
    return res.status(200).json(subDominios)
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}

export const createSubDominio = async (req, res) => {
  try {
    const { subDominio, nombreEmpresa, rif, email/* , nombreUsuario */ } = req.body
    const db = await accessToDataBase(dataBasePrincipal)
    const subDominiosCollection = await db.collection('sub-dominios')
    // buscamos si el sub-dominio ya existe
    const verifySubDominio = await subDominiosCollection.findOne({ subDominio })
    // en caso de que exista, retornamos un error
    if (verifySubDominio) return res.status(400).json({ error: 'El sub-dominio ya existe' })
    // buscamos si el email ya existe
    const verifyEmail = await subDominiosCollection.findOne({ email })
    // en caso de que exista, retornamos un error
    if (verifyEmail) return res.status(400).json({ error: 'El email ya existe' })
    // en caso de que no exista, insertamos el sub-dominio
    const empresa = await subDominiosCollection.insertOne({ subDominio, nombreEmpresa, rif, email })
    const usuariosCollection = await db.collection('usuarios')
    // generamos un password aleatorio
    const randomPassword = crypto.randomBytes(10).toString('hex')
    // encriptamos el password
    const password = await encryptPassword(randomPassword)
    // insertamos un usuario por defecto para la empresa
    const usuario = await usuariosCollection.insertOne({
      email,
      password,
      empresaId: empresa.insertedId,
      subDominio,
      nombre: nombreEmpresa
    })
    console.log(usuario)
    // enviamos el email con el password
    const emailConfing = {
      from: '"prueba 👻" <pruebaenviocorreonode@gmail.com>',
      to: email,
      subject: 'verifique cuenta de email',
      html: `
      <p>email: ${email}</p>
      <p>Contraseña: ${randomPassword}</p>
      `
    }
    await senEmail(emailConfing)
    // enviromentEmpresa = nombre del sub dominio o del enviroment de sub dominio
    // nameCollection = nombre de la coleccion de la empresa
    /* const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominio, nameCollection: 'personas' })
    const subDominioPersonasCollections = await clientDb.collection(subDominioPersonasCollectionsName)
    await subDominioPersonasCollections.insertOne({
      nombreUsuario,
      email,
      telefono,
    }) */

    return res.status(200).json({ status: 'sub dominio y usuario creado' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
