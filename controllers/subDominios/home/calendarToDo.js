import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, deleteItemSD, formatCollectionName, getItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import moment from 'moment-timezone'
import { colorSecodnary, subDominioName } from '../../../constants.js'
import { senEmail } from '../../../utils/nodemailsConfing.js'

export const getEvents = async (req, res) => {
  const { clienteId, fechaInit, fechaEnd } = req.body
  try {
    const personasCollection = formatCollectionName({ enviromentEmpresa: subDominioName, nameCollection: 'personas' })
    const events = await agreggateCollectionsSD({
      nameCollection: 'calendarToDo',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            start: { $gte: moment(fechaInit).toDate() },
            end: { $lte: moment(fechaEnd).toDate() }
          }
        },
        { $unwind: { path: '$invitados', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: personasCollection,
            localField: 'invitados',
            foreignField: '_id',
            as: 'infoInvitados'
          }
        },
        { $unwind: { path: '$infoInvitados', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$_id',
            data: { $first: '$$ROOT' }, // Mantenemos la informacion del documento original
            invitados: { $push: '$infoInvitados' }
          }
        },
        {
          $replaceRoot: { // Reemplaza la raíz del documento con el contenido de "data"
            newRoot: {
              $mergeObjects: [
                '$data', // Documetno original
                { invitados: '$invitados' } // Array invitados
              ]
            }
          }
        }
      ]
    })
    return res.status(200).json({ events })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error al obtener los eventos ' + e.message })
  }
}
export const saveEvents = async (req, res) => {
  const { clienteId, event, timeZone } = req.body
  // console.log(req.body?.event?.invitados)
  try {
    let eventoAnterior = null
    if (event?._id) {
      eventoAnterior = await getItemSD({
        nameCollection: 'calendarToDo',
        enviromentClienteId: clienteId,
        filters: { eventsId: event?.eventsId },
      })
    }
    delete event._id
    delete event.infoInvitados
    const invitados = event?.invitados?.map(e => new ObjectId(e._id)) || []
    // console.log(invitados, event)
    const newEvent = await upsertItemSD({
      nameCollection: 'calendarToDo',
      enviromentClienteId: clienteId,
      filters: { eventsId: event?.eventsId },
      update: {
        $set: {
          ...event,
          invitados,
          start: momentDate(timeZone, event.start).toDate(),
          end: momentDate(timeZone, event.end).toDate()
        }
      }
    })
    const cliente = await getItemSD({
      nameCollection: 'clientes',
      filters: { _id: new ObjectId(clienteId) }
    })
    console.log({ eventoAnterior })
    if (!eventoAnterior && invitados && invitados[0]) {
      const correosInvitados = await agreggateCollectionsSD({
        nameCollection: 'personas',
        pipeline: [
          { $match: { _id: { $in: invitados } } },
          {
            $project: {
              email: '$email'
            }
          }
        ]
      })
      console.log(correosInvitados)
      const emailConfing = {
        from: 'Aibiz <pruebaenviocorreonode@gmail.com>',
        to: correosInvitados.map(e => e.email).join(','),
        subject: `Evento ${newEvent.title} asignado`,
        html: `
          <html lang="es">
          <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Asignación de Evento</title>
              <style>
                  body {
                      font-family: Arial, sans-serif;
                      background-color: #f4f4f9;
                      margin: 0;
                      padding: 0;
                      color: #333;
                  }
                  .container {
                      width: 100%;
                      max-width: 600px;
                      margin: 20px auto;
                      background-color: #fff;
                      padding: 20px;
                      border-radius: 10px;
                      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                  }
                  .header {
                      text-align: center;
                      margin-bottom: 20px;
                  }
                  .header h1 {
                      color: ${colorSecodnary};
                  }
                  .content {
                      line-height: 1.6;
                  }
                  .footer {
                      text-align: center;
                      margin-top: 20px;
                      font-size: 12px;
                      color: #888;
                  }
              </style>
          </head>
          <body>
              <div class="container">
                  <div class="header">
                      <h1>Asignación de Evento</h1>
                  </div>
                  <div class="content">
                      <p>Estimado/a,</p>
                      <p>Espero este mensaje le encuentre bien. Me complace informarle que ha sido asignado/a al siguiente evento:</p>
                      <p><strong>Nombre del Evento:</strong> ${newEvent.title}<br>
                        <strong>Descripción:</strong> ${newEvent.content}<br>
                        <strong>Fecha de Inicio:</strong> ${newEvent.allDay ? momentDate(timeZone, event.start).format('DD/MM/YYYY') : momentDate(timeZone, event.start).format('DD/MM/YYYY | HH:mm')}</p>
                        ${newEvent.allDay ? '' : `<strong>Fecha de Culminación:</strong> ${momentDate(timeZone, event.end).format('DD/MM/YYYY | HH:mm')}</p>`}
                      <p>Quedamos a su disposición para cualquier duda o consulta adicional.</p>
                      <p>Atentamente,<br>
                      <strong>${cliente?.nombreCorto || cliente?.razonSocial}</strong><br>
                  </div>
                  <div class="footer">
                      &copy; 2025 ${cliente?.razonSocial}. Todos los derechos reservados.
                  </div>
              </div>
          </body>
          </html>

        `
      }
      senEmail(emailConfing)
    } else if (eventoAnterior) {
      const invitadosOriginales = eventoAnterior.invitados
      // console.log({ invitados, invitadosOriginales })
      const cancelados = invitadosOriginales.filter(id => !invitados.some(modificadoId => modificadoId.equals(id)))
      const agregados = invitados.filter(id => !invitadosOriginales.some(originalId => originalId.equals(id)))
      /** Colocar aqui logica para enviar correo de evento cancelado y correo de evento asignado */
      // console.log({ cancelados, agregados })
      if (cancelados[0]) {
        const correos = await agreggateCollectionsSD({
          nameCollection: 'personas',
          pipeline: [
            { $match: { _id: { $in: cancelados } } },
            {
              $project: {
                email: '$email'
              }
            }
          ]
        })
        const emailConfing = {
          from: 'Aibiz <pruebaenviocorreonode@gmail.com>',
          to: correos.map(e => e.email).join(','),
          subject: `Evento ${newEvent.title} cancelado`,
          html: `
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Evento Cancelado</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f9;
                        margin: 0;
                        padding: 0;
                        color: #333;
                    }
                    .container {
                        width: 100%;
                        max-width: 600px;
                        margin: 20px auto;
                        background-color: #fff;
                        padding: 20px;
                        border-radius: 10px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .header h1 {
                        color: #f55151;
                    }
                    .content {
                        line-height: 1.6;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        font-size: 12px;
                        color: #888;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Evento Cancelado</h1>
                    </div>
                    <div class="content">
                        <p>Estimado/a,</p>
                        <p>Espero este mensaje le encuentre bien. Me complace informarle que el siguiente evento ha sido cancelado:</p>
                        <p><strong>Nombre del Evento:</strong> ${newEvent.title}<br>
                          <strong>Descripción:</strong> ${newEvent.content}<br>
                        <p>Quedamos a su disposición para cualquier duda o consulta adicional.</p>
                        <p>Atentamente,<br>
                        <strong>${cliente?.nombreCorto || cliente?.razonSocial}</strong><br>
                    </div>
                    <div class="footer">
                        &copy; 2025 ${cliente?.razonSocial}. Todos los derechos reservados.
                    </div>
                </div>
            </body>
            </html>
  
          `
        }
        senEmail(emailConfing)
      }
      if (agregados[0]) {
        const correos = await agreggateCollectionsSD({
          nameCollection: 'personas',
          pipeline: [
            { $match: { _id: { $in: agregados } } },
            {
              $project: {
                email: '$email'
              }
            }
          ]
        })
        const emailConfing = {
          from: 'Aibiz <pruebaenviocorreonode@gmail.com>',
          to: correos.map(e => e.email).join(','),
          subject: `Evento ${newEvent.title} asignado`,
          html: `
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Asignación de Evento</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f9;
                        margin: 0;
                        padding: 0;
                        color: #333;
                    }
                    .container {
                        width: 100%;
                        max-width: 600px;
                        margin: 20px auto;
                        background-color: #fff;
                        padding: 20px;
                        border-radius: 10px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .header h1 {
                        color: ${colorSecodnary};
                    }
                    .content {
                        line-height: 1.6;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        font-size: 12px;
                        color: #888;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Asignación de Evento</h1>
                    </div>
                    <div class="content">
                        <p>Estimado/a,</p>
                        <p>Espero este mensaje le encuentre bien. Me complace informarle que ha sido asignado/a al siguiente evento:</p>
                        <p><strong>Nombre del Evento:</strong> ${newEvent.title}<br>
                          <strong>Descripción:</strong> ${newEvent.content}<br>
                          <strong>Fecha de Inicio:</strong> ${newEvent.allDay ? momentDate(timeZone, event.start).format('DD/MM/YYYY') : momentDate(timeZone, event.start).format('DD/MM/YYYY | HH:mm')}</p>
                          ${newEvent.allDay ? '' : `<strong>Fecha de Culminación:</strong> ${momentDate(timeZone, event.end).format('DD/MM/YYYY | HH:mm')}</p>`}
                        <p>Quedamos a su disposición para cualquier duda o consulta adicional.</p>
                        <p>Atentamente,<br>
                        <strong>${cliente?.nombreCorto || cliente?.razonSocial}</strong><br>
                    </div>
                    <div class="footer">
                        &copy; 2025 ${cliente?.razonSocial}. Todos los derechos reservados.
                    </div>
                </div>
            </body>
            </html>
  
          `
        }
        senEmail(emailConfing)
      }
      if (!momentDate(timeZone, eventoAnterior.start).isSame(momentDate(timeZone, newEvent.start))) {
        const invitadosOriginales = eventoAnterior.invitados
        const invitadosFaltantes = invitadosOriginales.filter(id => invitados.some(modificadoId => modificadoId.equals(id)))
        const correos = await agreggateCollectionsSD({
          nameCollection: 'personas',
          pipeline: [
            { $match: { _id: { $in: invitadosFaltantes } } },
            {
              $project: {
                email: '$email'
              }
            }
          ]
        })
        const emailConfing = {
          from: 'Aibiz <pruebaenviocorreonode@gmail.com>',
          to: correos.map(e => e.email).join(','),
          subject: `Evento ${newEvent.title} modificado`,
          html: `
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Evento Modificado</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f9;
                        margin: 0;
                        padding: 0;
                        color: #333;
                    }
                    .container {
                        width: 100%;
                        max-width: 600px;
                        margin: 20px auto;
                        background-color: #fff;
                        padding: 20px;
                        border-radius: 10px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .header h1 {
                        color: ${colorSecodnary};
                    }
                    .content {
                        line-height: 1.6;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        font-size: 12px;
                        color: #888;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Evento Modificado</h1>
                    </div>
                    <div class="content">
                        <p>Estimado/a,</p>
                        <p>Espero este mensaje le encuentre bien. Me complace informarle que el siguiente evento ha sido modificado:</p>
                        <p><strong>Nombre del Evento:</strong> ${newEvent.title}<br>
                          <strong>Descripción:</strong> ${newEvent.content}<br>
                          <strong>Fecha de Inicio:</strong> ${newEvent.allDay ? momentDate(timeZone, event.start).format('DD/MM/YYYY') : momentDate(timeZone, event.start).format('DD/MM/YYYY | HH:mm')}</p>
                          ${newEvent.allDay ? '' : `<strong>Fecha de Culminación:</strong> ${momentDate(timeZone, event.end).format('DD/MM/YYYY | HH:mm')}</p>`}
                        <p>Quedamos a su disposición para cualquier duda o consulta adicional.</p>
                        <p>Atentamente,<br>
                        <strong>${cliente?.nombreCorto || cliente?.razonSocial}</strong><br>
                    </div>
                    <div class="footer">
                        &copy; 2025 ${cliente?.razonSocial}. Todos los derechos reservados.
                    </div>
                </div>
            </body>
            </html>
  
          `
        }
        senEmail(emailConfing)
      }
    }
    return res.status(200).json({ status: 'Evento guardado exitosamente', event: newEvent })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar ' + e.message })
  }
}
export const deleteEvent = async (req, res) => {
  const { clienteId, event } = req.body
  console.log(req.body)
  try {
    if (event?.invitados[0]) {
      const evento = await getItemSD({
        nameCollection: 'calendarToDo',
        enviromentClienteId: clienteId,
        filters: { eventsId: event?.eventsId },
      })
      if (evento && evento?.invitados[0]) {
        const cliente = await getItemSD({
          nameCollection: 'clientes',
          filters: { _id: new ObjectId(clienteId) }
        })
        const correos = await agreggateCollectionsSD({
          nameCollection: 'personas',
          pipeline: [
            { $match: { _id: { $in: evento.invitados } } },
            {
              $project: {
                email: '$email'
              }
            }
          ]
        })
        const emailConfing = {
          from: 'Aibiz <pruebaenviocorreonode@gmail.com>',
          to: correos.map(e => e.email).join(','),
          subject: `Evento ${evento.title} cancelado`,
          html: `
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Evento Cancelado</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #f4f4f9;
                        margin: 0;
                        padding: 0;
                        color: #333;
                    }
                    .container {
                        width: 100%;
                        max-width: 600px;
                        margin: 20px auto;
                        background-color: #fff;
                        padding: 20px;
                        border-radius: 10px;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    .header h1 {
                        color: #f55151;
                    }
                    .content {
                        line-height: 1.6;
                    }
                    .footer {
                        text-align: center;
                        margin-top: 20px;
                        font-size: 12px;
                        color: #888;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Evento Cancelado</h1>
                    </div>
                    <div class="content">
                        <p>Estimado/a,</p>
                        <p>Espero este mensaje le encuentre bien. Me complace informarle que el siguiente evento ha sido cancelado:</p>
                        <p><strong>Nombre del Evento:</strong> ${evento.title}<br>
                          <strong>Descripción:</strong> ${evento.content}<br>
                        <p>Quedamos a su disposición para cualquier duda o consulta adicional.</p>
                        <p>Atentamente,<br>
                        <strong>${cliente?.nombreCorto || cliente?.razonSocial}</strong><br>
                    </div>
                    <div class="footer">
                        &copy; 2025 ${cliente?.razonSocial}. Todos los derechos reservados.
                    </div>
                </div>
            </body>
            </html>
  
          `
        }
        senEmail(emailConfing)
      }
    }
    await deleteItemSD({
      nameCollection: 'calendarToDo',
      enviromentClienteId: clienteId,
      filters: { eventsId: event?.eventsId },
    })
    return res.status(200).json({ status: 'Evento eliminado exitosamente' })
  } catch (e) {
    console.log(e)
    return res.status(500).json({ error: 'Error de servidor al momento de guardar ' + e.message })
  }
}
