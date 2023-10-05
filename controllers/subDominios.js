import crypto from 'node:crypto'
import { encryptPassword } from '../utils/hashPassword.js'
import { senEmail } from '../utils/nodemailsConfing.js'
import { accessToDataBase } from '../utils/dataBaseConfing.js'
import { dataBasePrincipal } from '../constants.js'
import { formatCollectionName } from '../utils/formatCollectionName.js'
import moment from 'moment/moment.js'

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
    const { subDominio, nombre, rif, email } = req.body
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
    const newSubDominio = await subDominiosCollection.insertOne({ subDominio, nombre, rif, email })
    const usuariosCollection = await db.collection('usuarios')
    // generamos un password aleatorio
    const randomPassword = crypto.randomBytes(10).toString('hex')
    // encriptamos el password
    const password = await encryptPassword(randomPassword)
    // insertamos un usuario por defecto para el nuevo sub dominio
    const newUsuario = await usuariosCollection.insertOne({
      email,
      password,
      subDominioId: newSubDominio.insertedId,
      subDominio,
      nombre,
      fechaActPass: moment().toDate()
    })
    // insertamos una persona por defecto para el nuevo sub dominio
    const personasCollection = await db.collection('personas')
    await personasCollection.insertOne({
      email,
      subDominioId: newSubDominio.insertedId,
      subDominio,
      nombre,
      usuarioId: newUsuario.insertedId
    })
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

    // creamos los campos del sub dominio en la  nueva base de datos
    const dbSubDominio = await accessToDataBase(subDominio)
    const subDominioUsuariosCollectionsName = formatCollectionName({ enviromentEmpresa: subDominio, nameCollection: 'usuarios' })
    const subDominioUsuariosCollections = await dbSubDominio.collection(subDominioUsuariosCollectionsName)
    const newUsuarioSubDominio = await subDominioUsuariosCollections.insertOne({
      nombre,
      email,
      password,
      fechaActPass: moment().toDate()
    })
    const subDominioPersonasCollectionsName = formatCollectionName({ enviromentEmpresa: subDominio, nameCollection: 'personas' })
    const subDominioPersonasCollections = await dbSubDominio.collection(subDominioPersonasCollectionsName)
    await subDominioPersonasCollections.insertOne({
      nombre,
      email,
      isEmpresa: true,
      usuarioId: newUsuarioSubDominio.insertedId
    })

    return res.status(200).json({ status: 'sub dominio y usuario creado' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor' })
  }
}
