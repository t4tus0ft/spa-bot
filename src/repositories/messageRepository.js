const { getDatabase } = require('../config/database');

function markIfNew(messageId) {
  const db = getDatabase();
  const result = db.prepare('INSERT OR IGNORE INTO processed_messages (message_id) VALUES (?)').run(messageId);
  return result.changes > 0;
}

function remove(messageId) {
  const db = getDatabase();
  db.prepare('DELETE FROM processed_messages WHERE message_id = ?').run(messageId);
}

function deleteOlderThan(days) {
  const db = getDatabase();
  const stmt = db.prepare("DELETE FROM processed_messages WHERE created_at < datetime('now', '-' || ? || ' days')");
  return stmt.run(days);
}

module.exports = { markIfNew, remove, deleteOlderThan };
