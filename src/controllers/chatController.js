const openaiService = require('../services/openaiService');
const calendarService = require('../services/calendarService');
const whatsappService = require('../services/whatsappService');
const appointmentRepository = require('../repositories/appointmentRepository');
const conversationRepository = require('../repositories/conversationRepository');
const messageRepository = require('../repositories/messageRepository');
const spaRepository = require('../repositories/spaRepository');

async function handleWhatsApp(req, res) {
  let messageId = null;
  try {
    const value = req.body?.entry?.[0]?.changes?.[0]?.value;
    const msgObj = value?.messages?.[0];
    const phoneNumberId = value?.metadata?.phone_number_id;

    const spa = phoneNumberId
      ? spaRepository.findByPhoneNumberId(phoneNumberId)
      : spaRepository.findFirstActive();

    if (!spa) {
      console.error('Webhook WhatsApp sin spa configurado', { phoneNumberId });
      return res.status(200).send('ok');
    }

    const from = msgObj?.from;
    const text = msgObj?.text?.body;
    messageId = msgObj?.id;

    if (!from || !text) {
      return res.status(200).send('ok');
    }

    if (messageId && !messageRepository.markIfNew(messageId)) {
      console.log(`Webhook WhatsApp duplicado ignorado: ${messageId}`);
      return res.status(200).send('ok');
    }

    const history = conversationRepository.getHistory(spa.id, from, 6);
    const result = await openaiService.chat(spa, text, history);

    conversationRepository.addMessage(spa.id, from, 'user', text);

    const schedule = result.schedule;
    if (schedule) {
      const outcome = await tryCreateAppointment(spa, from, schedule);
      if (outcome.reply) {
        result.reply = outcome.reply;
        result.schedule = null;
      }
    }

    conversationRepository.addMessage(spa.id, from, 'assistant', result.reply);
    await whatsappService.sendTextMessage(spa, from, result.reply);

    res.status(200).send('ok');
  } catch (error) {
    if (messageId) {
      messageRepository.remove(messageId);
    }
    console.error('Error en chat controller:', error.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function tryCreateAppointment(spa, from, scheduleData) {
  try {
    const serviceId = scheduleData.service_id;
    const service = calendarService.getServiceById(spa, serviceId);
    if (!service) {
      return { reply: 'Lo siento, no encontré ese servicio en nuestro catálogo. ¿Podrías repetir cuál te interesa? 🙏' };
    }

    const normalizedDate = calendarService.normalizeScheduleDate(scheduleData.date, scheduleData.time);
    if (!normalizedDate) {
      return { reply: 'Lo siento, esa fecha y hora no están disponibles. ¿Podrías indicarme otra fecha u horario? (por ejemplo, mañana a las 11:00) 🙏' };
    }

    if (!calendarService.isWithinBusinessHours(spa, scheduleData.time, service.duration_minutes)) {
      return { reply: `Lo siento, nuestro horario es de ${spa.work_start_hour}:00 a ${spa.work_end_hour}:00. ¿Te conviene otro horario? 🙏` };
    }

    const hasConflict = appointmentRepository.findConflictingSlot(
      spa.id,
      normalizedDate,
      scheduleData.time,
      service.duration_minutes
    );

    if (hasConflict) {
      return { reply: 'Lo siento, ese horario ya está ocupado. ¿Te gustaría otra hora o fecha? 🙏' };
    }

    appointmentRepository.create(spa.id, {
      client_name: scheduleData.client_name,
      client_phone: scheduleData.client_phone || from,
      service_id: service.id,
      service_name: service.name,
      appointment_date: normalizedDate,
      appointment_time: scheduleData.time,
      duration_minutes: service.duration_minutes,
      notes: null,
      client_email: null,
    });
    console.log(`Cita creada para spa ${spa.id}: ${normalizedDate} ${scheduleData.time}`);
    return { reply: null };
  } catch (error) {
    console.error('Error creando cita:', error.message);
    return { reply: 'Ocurrió un error al agendar. Por favor intenta de nuevo. 😅' };
  }
}

module.exports = { handleWhatsApp };
