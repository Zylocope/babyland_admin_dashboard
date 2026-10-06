// node src/utils/tableSort.test.js
import assert from 'node:assert/strict';
import { sortRows, nextSort } from './tableSort.js';

const cols = [
  { key: 'name', sort: r => r.name, firstDir: 'asc' },
  { key: 'profit', sort: r => r.profit },
  { key: 'plain' },
];
const rows = [
  { name: 'Lamy', profit: 464000 },
  { name: 'T-shirt', profit: -423900 },
  { name: 'Clock', profit: 51534 },
];
const names = (r) => r.map(x => x.name);

assert.deepEqual(names(sortRows(rows, cols, { key: 'profit', dir: 'desc' })), ['Lamy', 'Clock', 'T-shirt']);
// Lowest first puts the loss-maker at the top.
assert.deepEqual(names(sortRows(rows, cols, { key: 'profit', dir: 'asc' })), ['T-shirt', 'Clock', 'Lamy']);
assert.deepEqual(names(sortRows(rows, cols, { key: 'name', dir: 'asc' })), ['Clock', 'Lamy', 'T-shirt']);
// No sort, or a column that does not opt in, leaves the order alone and does not copy.
assert.equal(sortRows(rows, cols, null), rows);
assert.equal(sortRows(rows, cols, { key: 'plain', dir: 'asc' }), rows);
assert.deepEqual(names(rows), ['Lamy', 'T-shirt', 'Clock'], 'input is not mutated');

assert.deepEqual(nextSort({ key: 'profit', dir: 'desc' }, cols[1]), { key: 'profit', dir: 'asc' });
assert.deepEqual(nextSort({ key: 'profit', dir: 'asc' }, cols[1]), { key: 'profit', dir: 'desc' });
assert.deepEqual(nextSort({ key: 'profit', dir: 'desc' }, cols[0]), { key: 'name', dir: 'asc' });
assert.deepEqual(nextSort(null, cols[1]), { key: 'profit', dir: 'desc' });

console.log('tableSort ok');
