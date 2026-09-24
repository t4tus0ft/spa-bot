const { test, after } = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = path.join(os.tmpdir(), `spabot-msg-${process.pid}-${Date.now()}.sqlite`);
process.env.DATABASE_PATH = dbPath;

const messageRepository = require('../src/repositories/messageRepository');
const { getDatabase, closeDatabase } = require('../src/config/database');

test('markIfNew detecta duplicados y remove permite reintentar', () => {
  getDatabase();
  const id = 'wamid.TEST_MESSAGE';

  assert.strictEqual(messageRepository.markIfNew(id), true);
  assert.strictEqual(messageRepository.markIfNew(id), false);
  messageRepository.remove(id);
  assert.strictEqual(messageRepository.markIfNew(id), true);
});

after(() => {
  closeDatabase();
  for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
});
