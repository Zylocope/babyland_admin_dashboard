// node src/utils/csv.test.js
import assert from 'node:assert/strict';
import { toCsv } from './csv.js';

const NL = String.fromCharCode(10);
const QUOTE = String.fromCharCode(34);

const columns = [
  { label: 'Date', value: r => r.date },
  { label: 'Product', value: r => r.name },
  { label: 'Amount', value: r => r.amount },
];

const csv = toCsv(columns, [
  { date: '2026-08-25', name: 'Diaper M', amount: 29800 },
  // Money is formatted with a comma elsewhere, so cells must survive commas.
  { date: '2026-08-26', name: 'Wipes, baby', amount: '1,200 MMK' },
  // Quotes double, and an embedded newline stays inside the quoted cell.
  { date: '2026-08-27', name: 'Bottle 6' + QUOTE + NL + 'large', amount: 0 },
  { date: '2026-08-28', name: null, amount: undefined },
]);

const lines = csv.split('\r\n');
assert.equal(lines[0], 'Date,Product,Amount');
assert.equal(lines[1], '2026-08-25,Diaper M,29800');
assert.equal(lines[2], '2026-08-26,"Wipes, baby","1,200 MMK"');
// Still one CSV row: the newline is protected by the surrounding quotes.
assert.equal(lines[3], '2026-08-27,"Bottle 6""' + NL + 'large",0');
// null/undefined render empty, never the string "null".
assert.equal(lines[4], '2026-08-28,,');
assert.equal(lines.length, 5);

// Header-only export when there are no rows.
assert.equal(toCsv(columns, []), 'Date,Product,Amount');

console.log('csv ok');
