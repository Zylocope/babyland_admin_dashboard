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

// Per-day channel split feeds the combined chart; must partition the day total.
assert.equal(out.by_day[0].in_store_mmk, 100000);
assert.equal(out.by_day[0].online_mmk, 50000);
assert.equal(out.by_day[0].in_store_mmk + out.by_day[0].online_mmk, out.by_day[0].revenue_mmk);
// A day with no online sales reports 0, not undefined.
assert.equal(out.by_day[1].online_mmk, 0);
assert.equal(out.by_day[1].in_store_mmk, 50000);

// No divide-by-zero when a range has no sales.
const empty = summarizeSales([]);
assert.equal(empty.totals.margin_pct, 0);
assert.equal(empty.totals.avg_basket_mmk, 0);
assert.equal(empty.by_day.length, 0);


// --- regression: the reporting range must survive the reducer ---------------
// by_day was capped at the last 31 dates while totals were computed from every
// row, so a longer range produced a chart that disagreed with its own headline.
const long = Array.from({ length: 40 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 6, 1) + i * 86400000).toISOString().slice(0, 10);
  return { sale_date: d, is_online_sale: false, total_sale: '100', total_cost: '60', transactions: 1, items_sold: 1 };
});
const wide = summarizeSales(long);
assert.equal(wide.by_day.length, 40, 'every date in the range must be kept');
assert.equal(wide.totals.revenue_mmk, 4000);
assert.equal(
  wide.by_day.reduce((sum, d) => sum + d.revenue_mmk, 0),
  wide.totals.revenue_mmk,
  'by_day must reconcile with totals — a gap here is a false zero on the chart'
);
assert.equal(wide.by_day[0].date, '2026-07-01', 'the oldest day must not be dropped');

console.log('salesRollup ok');