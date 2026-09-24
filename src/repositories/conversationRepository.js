const { getDatabase } = require('../config/database');

function addMessage(spaId, phone, role, content) {
  const db = getDatabase();
  const stmt = db.prepare('INSERT INTO conversations (spa_id, client_phone, role, content) VALUES (?, ?, ?, ?)');
  return stmt.run(spaId, phone, role, content);
}

function getHistory(spaId, phone, limit = 10) {
  const db = getDatabase();
  return db.prepare(`
    SELECT role, content FROM conversations
    WHERE spa_id = ? AND client_phone = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(spaId, phone, limit).reverse();
}

function deleteOlderThan(days) {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM conversations WHERE created_at < datetime('now', '-' || ? || ' days')");
  return stmt.run(days);
}

module.exports = { addMessage, getHistory, deleteOlderThan };
