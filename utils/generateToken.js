import jwt from 'jsonwebtoken'
export const generateToken = ({ uid, fechaActPass, email, isSuperAdmin, isAdmin, isProgramador }, res) => {
  const expiresIn = 1000 * 60 * 60 * 24 * 30
  try {
    const token = jwt.sign({ uid, fechaActPass, email, isSuperAdmin, isAdmin, isProgramador }, process.env.JWT_SECRET, { expiresIn })
    res.cookie('aibizToken', token, {
      httpOnly: true,
      secure: !(process.env.MODO === 'developer'),
      expires: new Date(Date.now() + expiresIn)
    })
    return { token, expiresIn }
  } catch (e) {
    // console.log(e)
  }
}
export const tokenVerificationErrors = {
  'invalid signature': 'La firma del JWT no es valida',
  'jwt expired': 'JWT expirado',
  'invalid token': 'Token no válido',
  'No bearer': 'Utiliza formato Bearer',
  'jwt malformed': 'JWT formato no valido'
}
