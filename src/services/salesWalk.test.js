// node src/services/salesWalk.test.js
import assert from 'node:assert/strict';
import { salesSince } from './salesWalk.js';

// 250 sales, one per hour going back from Oct 5 00:00 UTC, newest first.
const all = Array.from({ length: 250 }, (_, i) => ({
  id: `s${i}`,
  created_at: new Date(Date.UTC(2026, 9, 5) - i * 3600000).toISOString(),
}));
const calls = [];
const listSales = async (page, size) => {
  calls.push(page);
  return { data: all.slice((page - 1) * size, page * size), total_pages: Math.ceil(all.length / size) };
};

// A period inside page one stops after page one.
let out = await salesSince({ listSales, since: new Date(Date.UTC(2026, 9, 4)) });
assert.deepEqual(calls, [1]);
assert.equal(out.complete, true);

// A period reaching into page three reads three pages, not one: the old cap.
calls.length = 0;
out = await salesSince({ listSales, since: new Date(Date.UTC(2026, 8, 25)) });
assert.deepEqual(calls, [1, 2, 3]);
assert.equal(out.rows.length, 250);
assert.equal(out.complete, true);

// Hitting the page cap before the start is reported, never hidden.
calls.length = 0;
out = await salesSince({ listSales, since: new Date(Date.UTC(2026, 8, 1)), maxPages: 2 });
assert.deepEqual(calls, [1, 2]);
assert.equal(out.complete, false);

// An empty list is complete.
out = await salesSince({ listSales: async () => ({ data: [], total_pages: 1 }), since: new Date() });
assert.equal(out.complete, true);

console.log('salesWalk ok');
