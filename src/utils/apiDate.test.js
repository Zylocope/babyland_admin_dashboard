// node src/utils/apiDate.test.js
import assert from 'node:assert/strict';
import { parseApiDate } from './apiDate.js';

// The format the backend actually sends — this is what new Date() chokes on.
const d = parseApiDate('2026-08-25 08:35:09.923369 +00:00:00');
assert.ok(d instanceof Date && !Number.isNaN(d.getTime()), 'backend format must parse');
assert.equal(d.toISOString().slice(0, 19), '2026-08-25T08:35:09');

// A non-UTC offset must shift the instant, not be dropped.
const off = parseApiDate('2026-08-25 08:35:09 +06:30:00');
assert.equal(off.toISOString().slice(0, 19), '2026-08-25T02:05:09');

// Plain ISO still works, so this is safe to use everywhere.
assert.equal(
  parseApiDate('2026-08-25T08:35:09Z').toISOString().slice(0, 19),
  '2026-08-25T08:35:09'
);

// Junk and empties return null instead of an Invalid Date that formats as "NaN".
for (const bad of [null, undefined, '', 'not a date']) {
  assert.equal(parseApiDate(bad), null, `${JSON.stringify(bad)} should be null`);
}

console.log('apiDate ok');
