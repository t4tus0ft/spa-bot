const { getDatabase } = require('../config/database');

function create(spaId, data) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO appointments (spa_id, client_name, client_phone, client_email, service_id, service_name, appointment_date, appointment_time, duration_minutes, notes)
    VALUES (@spa_id, @client_name, @client_phone, @client_email, @service_id, @service_name, @appointment_date, @appointment_time, @duration_minutes, @notes)
  `);
  const result = stmt.run({
    spa_id: spaId,
    client_name: data.client_name,
    client_phone: data.client_phone,
    client_email: data.client_email || null,
    service_id: data.service_id,
    service_name: data.service_name,
    appointment_date: data.appointment_date,
    appointment_time: data.appointment_time,
    duration_minutes: data.duration_minutes,
    notes: data.notes || null,
  });
  return result.lastInsertRowid;
}

function findByPhone(spaId, phone) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM appointments WHERE spa_id = ? AND client_phone = ? ORDER BY appointment_date DESC, appointment_time DESC').all(spaId, phone);
}

function findByDate(spaId, date) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM appointments WHERE spa_id = ? AND appointment_date = ? ORDER BY appointment_time').all(spaId, date);
}

function findById(id) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
}

function updateStatus(id, status) {
  const db = getDatabase();
  db.prepare("UPDATE appointments SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, id);
}

function findConflictingSlot(spaId, date, time, durationMinutes) {
  const db = getDatabase();
  const rows = db.prepare(`
    SELECT appointment_time, duration_minutes FROM appointments
    WHERE spa_id = ? AND appointment_date = ? AND status = 'confirmed'
    ORDER BY appointment_time
  `).all(spaId, date);

  const requestedStart = timeToMinutes(time);
  const requestedEnd = requestedStart + durationMinutes;

  for (const row of rows) {
    const existingStart = timeToMinutes(row.appointment_time);
    const existingEnd = existingStart + row.duration_minutes;

    if (requestedStart < existingEnd && requestedEnd > existingStart) {
      return true;
    }
  }
  return false;
}

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

module.exports = { create, findByPhone, findByDate, findById, updateStatus, findConflictingSlot };
