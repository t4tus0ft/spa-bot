const { getDatabase } = require('../config/database');

function findAll() {
  const db = getDatabase();
  return db.prepare('SELECT * FROM spas ORDER BY name').all();
}

function findById(id) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM spas WHERE id = ?').get(id);
}

function findByPhoneNumberId(phoneNumberId) {
  const db = getDatabase();
  return db.prepare('SELECT * FROM spas WHERE phone_number_id = ?').get(phoneNumberId);
}

function findFirstActive() {
  const db = getDatabase();
  return db.prepare("SELECT * FROM spas WHERE active = 1 ORDER BY id LIMIT 1").get();
}

function findByIdOrFirstActive(spaId) {
  const id = parseInt(spaId, 10);
  return id ? findById(id) : findFirstActive();
}

function toCatalog(spa) {
  try {
    const parsed = JSON.parse(spa.catalog_json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function create(data) {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO spas (name, work_start_hour, work_end_hour, catalog_json, phone_number_id, whatsapp_token, active)
    VALUES (@name, @work_start_hour, @work_end_hour, @catalog_json, @phone_number_id, @whatsapp_token, @active)
  `);
  const result = stmt.run({
    name: data.name,
    work_start_hour: data.work_start_hour || 9,
    work_end_hour: data.work_end_hour || 18,
    catalog_json: JSON.stringify(data.catalog || []),
    phone_number_id: data.phone_number_id || null,
    whatsapp_token: data.whatsapp_token || null,
    active: data.active === undefined ? 1 : (data.active ? 1 : 0),
  });
  return result.lastInsertRowid;
}

function update(id, data) {
  const db = getDatabase();
  const current = findById(id);
  if (!current) return null;

  const stmt = db.prepare(`
    UPDATE spas SET
      name = @name,
      work_start_hour = @work_start_hour,
      work_end_hour = @work_end_hour,
      catalog_json = @catalog_json,
      phone_number_id = @phone_number_id,
      whatsapp_token = @whatsapp_token,
      active = @active,
      updated_at = datetime('now')
    WHERE id = @id
  `);
  stmt.run({
    id,
    name: data.name !== undefined ? data.name : current.name,
    work_start_hour: data.work_start_hour !== undefined ? data.work_start_hour : current.work_start_hour,
    work_end_hour: data.work_end_hour !== undefined ? data.work_end_hour : current.work_end_hour,
    catalog_json: data.catalog !== undefined ? JSON.stringify(data.catalog) : current.catalog_json,
    phone_number_id: data.phone_number_id !== undefined ? data.phone_number_id : current.phone_number_id,
    whatsapp_token: data.whatsapp_token !== undefined ? data.whatsapp_token : current.whatsapp_token,
    active: data.active !== undefined ? (data.active ? 1 : 0) : current.active,
  });
  return findById(id);
}

module.exports = { findAll, findById, findByPhoneNumberId, findFirstActive, findByIdOrFirstActive, toCatalog, create, update };
