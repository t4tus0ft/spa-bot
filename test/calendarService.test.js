const test = require('node:test');
const assert = require('node:assert');
const calendarService = require('../src/services/calendarService');

const spa = {
  work_start_hour: 9,
  work_end_hour: 18,
  catalog_json: JSON.stringify([{ id: 'masaje-relajante', duration_minutes: 60 }]),
};

test('isWithinBusinessHours respeta apertura, cierre y duración', () => {
  assert.strictEqual(calendarService.isWithinBusinessHours(spa, '09:00', 60), true);
  assert.strictEqual(calendarService.isWithinBusinessHours(spa, '17:00', 60), true);
  assert.strictEqual(calendarService.isWithinBusinessHours(spa, '17:30', 30), true);
  assert.strictEqual(calendarService.isWithinBusinessHours(spa, '17:30', 60), false);
  assert.strictEqual(calendarService.isWithinBusinessHours(spa, '17:30', 150), false);
  assert.strictEqual(calendarService.isWithinBusinessHours(spa, '18:00', 0), true);
  assert.strictEqual(calendarService.isWithinBusinessHours(spa, '18:00', 30), false);
  assert.strictEqual(calendarService.isWithinBusinessHours(spa, '08:30', 0), false);
});

test('normalizeScheduleDate acepta fechas futuras y rechaza inválidas o pasadas', () => {
  const fmt = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const future = fmt(new Date(Date.now() + 2 * 86400000));
  const past = fmt(new Date(Date.now() - 2 * 86400000));

  assert.strictEqual(calendarService.normalizeScheduleDate(future, '10:00'), future);
  assert.strictEqual(calendarService.normalizeScheduleDate(past, '10:00'), null);
  assert.strictEqual(calendarService.normalizeScheduleDate('no-es-fecha', '10:00'), null);
  assert.strictEqual(calendarService.normalizeScheduleDate('2030-02-31', '10:00'), null);
});

test('getServiceById tolera ids normalizados', () => {
  assert.ok(calendarService.getServiceById(spa, 'masaje-relajante'));
  assert.ok(calendarService.getServiceById(spa, 'masaje_relajante'));
  assert.strictEqual(calendarService.getServiceById(spa, 'inexistente'), undefined);
});
