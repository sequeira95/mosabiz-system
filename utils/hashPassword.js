import bcryptjs from 'bcryptjs'

export const encryptPassword = async (password) => {
  const salt = await bcryptjs.genSalt(10)
  return await bcryptjs.hash(password, salt)
}

export const comparePassword = async (password, receivedPassword) => {
  return await bcryptjs.compare(password, receivedPassword)
}
