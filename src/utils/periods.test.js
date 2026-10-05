// node src/utils/periods.test.js
import assert from 'node:assert/strict';
import { periodRange, monthOptions, chartBuckets, bucketOf, isMonth } from './periods.js';

const today = '2026-10-05';
assert.deepEqual(periodRange('today', today), { start: today, end: today });
assert.deepEqual(periodRange('week', today), { start: '2026-09-29', end: today });
assert.deepEqual(periodRange('d30', today), { start: '2026-09-06', end: today });
assert.deepEqual(periodRange('year', today), { start: '2026-01-01', end: today });
assert.deepEqual(periodRange('y3', today), { start: '2023-10-06', end: today });

// A past month is the whole calendar month; the current one stops at today.
assert.deepEqual(periodRange('2026-09', today), { start: '2026-09-01', end: '2026-09-30' });
assert.deepEqual(periodRange('2026-02', today), { start: '2026-02-01', end: '2026-02-28' });
assert.deepEqual(periodRange('2026-10', today), { start: '2026-10-01', end: today });
assert.equal(isMonth('2026-10'), true);
assert.equal(isMonth('week'), false);

assert.deepEqual(monthOptions(today, 3), ['2026-10', '2026-09', '2026-08']);
assert.deepEqual(monthOptions('2026-01-15', 2), ['2026-01', '2025-12']);

// Up to two months: a bucket per day. Beyond: a bucket per month.
const week = chartBuckets('2026-09-29', today);
assert.equal(week.unit, 'day');
assert.equal(week.keys.length, 7);
assert.equal(week.keys[0], '2026-09-29');
const year = chartBuckets('2026-01-01', today);
assert.equal(year.unit, 'month');
assert.deepEqual(year.keys.slice(0, 2), ['2026-01', '2026-02']);
assert.equal(year.keys.length, 10);
assert.equal(chartBuckets('2023-10-06', today).keys.length, 37);
assert.equal(bucketOf('2026-09-14', 'month'), '2026-09');
assert.equal(bucketOf('2026-09-14', 'day'), '2026-09-14');

console.log('periods ok');
