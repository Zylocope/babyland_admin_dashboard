import assert from 'node:assert/strict';
import { shopToday, shopDaysAgo, shopDayStart, formatShopTime } from './shopDay.js';

for (const zone of ['UTC', 'America/Los_Angeles', 'Asia/Bangkok', 'Asia/Yangon']) {
  process.env.TZ = zone;
  assert.equal(shopToday('2026-09-12T17:29:59Z'), '2026-09-12');
  assert.equal(shopToday('2026-09-12T17:30:00Z'), '2026-09-13');
  assert.equal(formatShopTime('2026-09-12T18:30:00Z', 'YYYY-MM-DD HH:mm'), '2026-09-13 01:00');
  assert.equal(shopDayStart('2026-09-13').toISOString(), '2026-09-12T17:30:00.000Z');
  assert.equal(shopDaysAgo(1, '2026-01-01T00:00:00Z'), '2025-12-31');
  assert.equal(shopDaysAgo(1, '2024-03-01T00:00:00Z'), '2024-02-29');
  const from = shopDayStart('2026-09-13');
  const to = shopDayStart(shopDaysAgo(-1, from));
  assert.equal(to.toISOString(), '2026-09-13T17:30:00.000Z');
  assert.ok(new Date('2026-09-12T18:30:00Z') >= from);
  assert.ok(new Date('2026-09-12T18:30:00Z') < to);
}
console.log('shopDay: Myanmar boundaries pass in four device timezones');
