const appointmentRepository = require('../repositories/appointmentRepository');
const spaRepository = require('../repositories/spaRepository');

function listSpas(req, res) {
  const spas = spaRepository.findAll();
  res.json({
    spas: spas.map(s => ({
      id: s.id,
      name: s.name,
      work_start_hour: s.work_start_hour,
      work_end_hour: s.work_end_hour,
      active: !!s.active,
      phone_number_id: s.phone_number_id || null,
      services_count: spaRepository.toCatalog(s).length,
    })),
  });
}

function getSpa(req, res) {
  const spa = spaRepository.findById(req.params.id);
  if (!spa) {
    return res.status(404).json({ error: 'Spa no encontrado' });
  }
  res.json(toAdminSpa(spa));
}

function toAdminSpa(spa) {
  return {
    id: spa.id,
    name: spa.name,
    work_start_hour: spa.work_start_hour,
    work_end_hour: spa.work_end_hour,
    active: !!spa.active,
    phone_number_id: spa.phone_number_id || null,
    has_whatsapp_token: !!spa.whatsapp_token,
    catalog: spaRepository.toCatalog(spa),
  };
}

function createSpa(req, res) {
  const { name } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'name es requerido' });
  }
  const id = spaRepository.create({
    name,
    work_start_hour: req.body.work_start_hour,
    work_end_hour: req.body.work_end_hour,
    catalog: req.body.catalog,
    phone_number_id: req.body.phone_number_id,
    whatsapp_token: req.body.whatsapp_token,
  });
  res.status(201).json(toAdminSpa(spaRepository.findById(id)));
}

function updateSpa(req, res) {
  const spa = spaRepository.update(req.params.id, req.body);
  if (!spa) {
    return res.status(404).json({ error: 'Spa no encontrado' });
  }
  res.json(toAdminSpa(spa));
}

function listAppointments(req, res) {
  const { spa_id, date } = req.query;
  const db = require('../config/database').getDatabase();
  let rows;
  if (spa_id) {
    rows = date
      ? db.prepare('SELECT * FROM appointments WHERE spa_id = ? AND appointment_date = ? ORDER BY appointment_time').all(spa_id, date)
      : db.prepare('SELECT * FROM appointments WHERE spa_id = ? ORDER BY appointment_date DESC, appointment_time DESC').all(spa_id);
  } else {
    return res.status(400).json({ error: 'El parámetro "spa_id" es requerido' });
  }
  res.json({ count: rows.length, appointments: rows });
}

function updateAppointmentStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['confirmed', 'cancelled', 'completed', 'no_show'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: `status inválido. Use: ${validStatuses.join(', ')}` });
  }
  const appointment = appointmentRepository.findById(id);
  if (!appointment) {
    return res.status(404).json({ error: 'Cita no encontrada' });
  }
  appointmentRepository.updateStatus(id, status);
  res.json(appointmentRepository.findById(id));
}

module.exports = { listSpas, getSpa, createSpa, updateSpa, listAppointments, updateAppointmentStatus };
