const test = require('node:test');
const assert = require('node:assert');
const { rateLimit } = require('../src/middleware/rateLimit');

function mockReq(ip) {
  return { ip, socket: { remoteAddress: ip } };
}

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    set(k, v) { this.headers[k] = v; },
    status(c) { this.statusCode = c; return this; },
    json(b) { this.body = b; return this; },
  };
}

test('rateLimit bloquea tras superar el máximo por IP', () => {
  const limiter = rateLimit({ windowMs: 60000, max: 3 });
  let passed = 0;
  for (let i = 0; i < 3; i++) {
    const res = mockRes();
    limiter(mockReq('1.2.3.4'), res, () => { passed++; });
    assert.strictEqual(res.statusCode, 200);
  }
  assert.strictEqual(passed, 3);

  const blocked = mockRes();
  limiter(mockReq('1.2.3.4'), blocked, () => { passed++; });
  assert.strictEqual(blocked.statusCode, 429);
  assert.ok(blocked.headers['Retry-After']);

  const otherIp = mockRes();
  limiter(mockReq('5.6.7.8'), otherIp, () => { passed++; });
  assert.strictEqual(otherIp.statusCode, 200);
});

test('rateLimit vuelve a permitir tras la ventana', async () => {
  const limiter = rateLimit({ windowMs: 50, max: 1 });
  const first = mockRes();
  limiter(mockReq('9.9.9.9'), first, () => {});
  assert.strictEqual(first.statusCode, 200);

  const blocked = mockRes();
  limiter(mockReq('9.9.9.9'), blocked, () => {});
  assert.strictEqual(blocked.statusCode, 429);

  await new Promise(r => setTimeout(r, 70));
  const after = mockRes();
  limiter(mockReq('9.9.9.9'), after, () => {});
  assert.strictEqual(after.statusCode, 200);
});
