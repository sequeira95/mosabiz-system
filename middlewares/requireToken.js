import jwt from 'jsonwebtoken'
import { tokenVerificationErrors } from '../utils/generateToken.js'

export const requireToken = (req, res, next) => {
  try {
    let token = req.headers?.authorization
    if (!token) throw new Error('No bearer')
    token = token.split(' ')[1]
    const { uid } = jwt.verify(token, process.env.JWT_SECRET)
    req.uid = uid
    next()
  } catch (e) {
    console.log(e)
    return res.status(500).send({ error: tokenVerificationErrors[e.message] })
  }
}
