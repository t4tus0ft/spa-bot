const appointmentRepository = require('../repositories/appointmentRepository');
const spaRepository = require('../repositories/spaRepository');

function getServiceById(spa, serviceId) {
  const catalog = spaRepository.toCatalog(spa);
  return catalog.find(s => s.id === serviceId)
    || catalog.find(s => normalizeId(s.id) === normalizeId(serviceId));
}

function isServiceValid(spa, serviceId) {
  return getServiceById(spa, serviceId) !== undefined;
}

function normalizeId(id) {
  return String(id || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function generateSlots(spa, date) {
  const existing = appointmentRepository.findByDate(spa.id, date);
  const slots = [];

  for (let hour = spa.work_start_hour; hour < spa.work_end_hour; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      if (!isSlotInPast(date, time)) {
        slots.push({ time, available: true });
      }
    }
  }

  for (const apt of existing) {
    if (apt.status === 'confirmed') {
      const startMin = timeToMinutes(apt.appointment_time);
      const endMin = startMin + apt.duration_minutes;
      for (const slot of slots) {
        const slotMin = timeToMinutes(slot.time);
        if (slotMin >= startMin && slotMin < endMin) {
          slot.available = false;
        }
      }
    }
  }

  return slots;
}

function getAvailableSlots(spa, date) {
  const slots = generateSlots(spa, date);
  return slots.filter(s => s.available).map(s => s.time);
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function isSlotInPast(date, time) {
  const now = new Date();
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const slotDate = new Date(year, month - 1, day, hour, minute);
  return slotDate < now;
}

function isWithinBusinessHours(spa, time, durationMinutes = 0) {
  const start = timeToMinutes(time);
  const end = start + durationMinutes;
  return start >= spa.work_start_hour * 60 && end <= spa.work_end_hour * 60;
}

function normalizeScheduleDate(date, time) {
  let year, month, day;

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
  const dmy = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(date || ''));
  if (iso) {
    [year, month, day] = [iso[1], iso[2], iso[3]];
  } else if (dmy) {
    [day, month, year] = [dmy[1], dmy[2], dmy[3]];
  } else {
    return null;
  }

  const now = new Date();
  const currentYear = now.getFullYear();

  if (Number(year) !== currentYear) {
    year = String(currentYear);
  }

  const candidate = new Date(Number(year), Number(month) - 1, Number(day));
  const slotDate = new Date(Number(year), Number(month) - 1, Number(day), time ? timeToMinutes(time) / 60 : 0, time ? timeToMinutes(time) % 60 : 0);

  if (candidate.getFullYear() !== Number(year) || candidate.getMonth() !== Number(month) - 1 || candidate.getDate() !== Number(day)) {
    return null;
  }

  if (slotDate <= now) {
    return null;
  }

  return `${year}-${month}-${day}`;
}

module.exports = { getServiceById, generateSlots, getAvailableSlots, isSlotInPast, isServiceValid, isWithinBusinessHours, normalizeScheduleDate, normalizeId };
