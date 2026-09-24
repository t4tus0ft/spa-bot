const { test, after } = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = path.join(os.tmpdir(), `spabot-retention-${process.pid}-${Date.now()}.sqlite`);
process.env.DATABASE_PATH = dbPath;

const conversationRepository = require('../src/repositories/conversationRepository');
const { getDatabase, closeDatabase } = require('../src/config/database');

test('deleteOlderThan elimina conversaciones antiguas y conserva las recientes', () => {
  const db = getDatabase();
  const spaId = db.prepare('SELECT id FROM spas LIMIT 1').get().id;

  conversationRepository.addMessage(spaId, '+old', 'user', 'antiguo');
  conversationRepository.addMessage(spaId, '+new', 'user', 'reciente');
  db.prepare("UPDATE conversations SET created_at = datetime('now', '-100 days') WHERE client_phone = '+old'").run();

  const result = conversationRepository.deleteOlderThan(90);

  assert.strictEqual(result.changes, 1);
  assert.strictEqual(db.prepare("SELECT COUNT(*) AS c FROM conversations WHERE client_phone = '+old'").get().c, 0);
  assert.strictEqual(db.prepare("SELECT COUNT(*) AS c FROM conversations WHERE client_phone = '+new'").get().c, 1);
});

after(() => {
  closeDatabase();
  for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
});
