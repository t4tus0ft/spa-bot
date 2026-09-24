const test = require('node:test');
const assert = require('node:assert');
const { computeSignature, verifySignature } = require('../src/middleware/whatsappSignature');

const body = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account', entry: [] }));
const secret = 'app-secret-test';
const header = computeSignature(body, secret);

test('verifySignature acepta la firma correcta', () => {
  assert.strictEqual(verifySignature(body, header, secret), true);
});

test('verifySignature rechaza firma, body o formato inválidos', () => {
  assert.strictEqual(verifySignature(body, header, 'otro-secreto'), false);
  assert.strictEqual(verifySignature(Buffer.from('{}'), header, secret), false);
  assert.strictEqual(verifySignature(body, undefined, secret), false);
  assert.strictEqual(verifySignature(body, 'sha1=abc', secret), false);
  assert.strictEqual(verifySignature(body, 'sha256=deadbeef', secret), false);
  assert.strictEqual(verifySignature(null, header, secret), false);
});
