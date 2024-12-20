import { ObjectId } from 'mongodb'
import { agreggateCollectionsSD, deleteItemSD, upsertItemSD } from '../../../utils/dataBaseConfing.js'
import { momentDate } from '../../../utils/momentDate.js'
import moment from 'moment-timezone'

export const getEvents = async (req, res) => {
  const { clienteId, fechaInit, fechaEnd } = req.body
  console.log(req.body)
  try {
    const events = await agreggateCollectionsSD({
      nameCollection: 'calendarToDo',
      enviromentClienteId: clienteId,
      pipeline: [
        {
          $match: {
            start: { $gte: moment(fechaInit).toDate() },
            end: { $lte: moment(fechaEnd).toDate() }
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
  console.log(req.body)
  try {
    delete event._id
    const newEvent = await upsertItemSD({
      nameCollection: 'calendarToDo',
      enviromentClienteId: clienteId,
      filters: { eventsId: event?.eventsId },
      update: {
        $set: {
          ...event,
          start: momentDate(timeZone, event.start).toDate(),
          end: momentDate(timeZone, event.end).toDate()
        }
      }
    })
    console.log({ newEvent })
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
