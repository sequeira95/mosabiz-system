import ImageKit from 'imagekit'

const imagekit = new ImageKit({
  publicKey: process.env.IK_PUBLIC,
  privateKey: process.env.IK_PRIVATE,
  urlEndpoint: process.env.IK_URL
})

export async function uploadImg (fileData, fileName) {
  return await imagekit.upload({
    folder: 'aibiz',
    file: fileData,
    fileName
  })
}

export async function deleteImg (fileId) {
  return await imagekit.deleteFile(fileId)
}
