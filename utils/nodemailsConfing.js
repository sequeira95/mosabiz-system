import nodemailer from 'nodemailer'
export const transport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.userEmailGmail,
    pass: process.env.passwordEmailGmail
  }
})
export async function senEmail (confing) {
  try {
    console.log({ confing, user: process.env.userEmailGmail, pass: process.env.passwordEmailGmail })
    await transport.sendMail(confing)
  } catch (e) {
    return console.log(e.message)
  }
}
// config send email
/*
    await transport.sendMail({
      from: '"desde" <email>',
      to: RECEPTOR,
      subject: 'ASUNTO',
      html: `
      <h1>Lo que sea </h1>
      `
    })
*/
