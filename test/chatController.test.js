const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const dbPath = path.join(os.tmpdir(), `spabot-chat-${process.pid}-${Date.now()}.sqlite`);
process.env.DATABASE_PATH = dbPath;
process.env.AI_API_KEY = 'test';
process.env.AI_BASE_URL = 'http://127.0.0.1:4011/v1';
process.env.AI_MODEL = 'test-model';

const chatController = require('../src/controllers/chatController');
const spaRepository = require('../src/repositories/spaRepository');
const { getDatabase, closeDatabase } = require('../src/config/database');

const future = (() => {
  const d = new Date(Date.now() + 2 * 86400000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

let mock;

before(async () => {
  mock = http.createServer((req, res) => {
    let body = '';
    req.on('data', c => { body += c; });
    req.on('end', () => {
      const content = JSON.stringify({
        reply: 'Confirmado',
        schedule: { service_id: 'paquete-bienestar', date: future, time: '17:30', client_name: 'Ana' },
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: 'x', object: 'chat.completion', created: 0, model: 'test',
        choices: [{ index: 0, message: { role: 'assistant', content }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      }));
    });
  });
  await new Promise(resolve => mock.listen(4011, resolve));
});

after(() => {
  mock.close();
  closeDatabase();
  for (const f of [dbPath, `${dbPath}-wal`, `${dbPath}-shm`]) {
    if (fs.existsSync(f)) fs.unlinkSync(f);
  }
});

function fakeRes() {
  return {
    code: 200,
    payload: null,
    status(c) { this.code = c; return this; },
    json(p) { this.payload = p; return this; },
  };
}

test('demoChat aísla sesiones, persiste la respuesta final y no agenda fuera de horario', async () => {
  const db = getDatabase();
  const historyOf = key => db.prepare('SELECT content FROM conversations WHERE client_phone = ? ORDER BY id').all(key).map(r => r.content);

  const a = fakeRes();
  const b = fakeRes();
  await chatController.demoChat({ body: { message: 'uno', sessionId: 'AAA' }, ip: '1.2.3.4' }, a);
  await chatController.demoChat({ body: { message: 'dos', sessionId: 'BBB' }, ip: '1.2.3.4' }, b);

  assert.ok(a.payload.reply.includes('horario'), 'el paquete de 150 min no cabe a las 17:30');
  assert.notStrictEqual(a.payload.reply, 'Confirmado');
  assert.deepStrictEqual(historyOf('+demo-AAA'), ['uno', a.payload.reply]);
  assert.deepStrictEqual(historyOf('+demo-BBB'), ['dos', b.payload.reply]);

  const appointments = db.prepare('SELECT COUNT(*) AS c FROM appointments').get().c;
  assert.strictEqual(appointments, 0);
});

test('demoChat responde 404 si no hay spa activo', async () => {
  const original = spaRepository.findFirstActive;
  spaRepository.findFirstActive = () => undefined;
  const res = fakeRes();
  await chatController.demoChat({ body: { message: 'hola' }, ip: '1.2.3.4' }, res);
  spaRepository.findFirstActive = original;
  assert.strictEqual(res.code, 404);
});
