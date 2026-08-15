// node src/services/salesRollup.test.js
import assert from 'node:assert/strict';
import { summarizeSales } from './salesRollup.js';

// Two days, both channels. API sends money as strings.
const rows = [
  { sale_date: '2026-08-01', is_online_sale: false, total_sale: '100000', total_cost: '75000', transactions: 4, items_sold: 10 },
  { sale_date: '2026-08-01', is_online_sale: true, total_sale: '50000', total_cost: '40000', transactions: 1, items_sold: 2 },
  { sale_date: '2026-08-02', is_online_sale: false, total_sale: '50000', total_cost: '35000', transactions: 5, items_sold: 8 },
];

const out = summarizeSales(rows);

assert.equal(out.totals.revenue_mmk, 200000);
assert.equal(out.totals.profit_mmk, 50000);
assert.equal(out.totals.margin_pct, 25);
assert.equal(out.totals.transactions, 10);
assert.equal(out.totals.avg_basket_mmk, 20000);

// Channel split must partition, not double-count.
assert.equal(out.by_channel.in_store.revenue_mmk, 150000);
assert.equal(out.by_channel.online.revenue_mmk, 50000);
assert.equal(
  out.by_channel.in_store.revenue_mmk + out.by_channel.online.revenue_mmk,
  out.totals.revenue_mmk
);

// Same date across channels collapses into one day, sorted ascending.
assert.equal(out.by_day.length, 2);
assert.deepEqual(out.by_day.map(d => d.date), ['2026-08-01', '2026-08-02']);
assert.equal(out.by_day[0].revenue_mmk, 150000);
assert.equal(out.by_day[0].transactions, 5);

// No divide-by-zero when a range has no sales.
const empty = summarizeSales([]);
assert.equal(empty.totals.margin_pct, 0);
assert.equal(empty.totals.avg_basket_mmk, 0);
assert.equal(empty.by_day.length, 0);

console.log('salesRollup ok');
