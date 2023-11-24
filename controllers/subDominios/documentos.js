import { deleteImg, uploadImg } from '../../utils/cloudImage.js'

export const saveDocument = async (req, res) => {
  try {
    if (req.files) {
      const documento = req.files.documentoFile
      const extension = documento.mimetype.split('/')[1]
      const namePath = `${documento.name}`
      const resDoc = await uploadImg(documento.data, namePath)
      const documentoFile =
        {
          path: resDoc.filePath,
          name: resDoc.name,
          url: resDoc.url,
          type: extension,
          fileId: resDoc.fileId
        }
      return res.status(200).json({ documentoFile })
    }
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de procesar el documento' + e.message })
  }
}
export const deleteDocument = async (req, res) => {
  const { documentoFile } = req.body
  try {
    await deleteImg(documentoFile.fileId)
    return res.status(200).json({ status: 'Documento eliminado exitosamente' })
  } catch (e) {
    console.log(e.message)
    return res.status(500).json({ error: 'Error de servidor al momento de eliminar el documento' + e.message })
  }
}
