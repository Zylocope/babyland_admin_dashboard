// node src/services/salesRollup.test.js
import assert from 'node:assert/strict';
import { summarizeSales, rankDays } from './salesRollup.js';

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

// rankDays: best and worst must never name the same day. This shipped — with
// four days of real sales the two panels showed the same two dates, so the
// shop's best day was also listed as its worst.
const day = (date, revenue_mmk) => ({ date, revenue_mmk });
const overlaps = (a, b) => a.some(x => b.some(y => y.date === x.date));

const four = rankDays([day('d1', 100), day('d2', 80), day('d3', 60), day('d4', 40)]);
assert.deepEqual(four.best.map(d => d.date), ['d1', 'd2', 'd3']);
assert.deepEqual(four.worst.map(d => d.date), ['d4']);
assert.ok(!overlaps(four.best, four.worst), 'best and worst must be disjoint at 4 days');

const six = rankDays([day('a', 60), day('b', 10), day('c', 50), day('d', 20), day('e', 40), day('f', 30)]);
assert.deepEqual(six.best.map(d => d.date), ['a', 'c', 'e']);
assert.deepEqual(six.worst.map(d => d.date), ['b', 'd', 'f'], 'worst is ascending: quietest first');
assert.ok(!overlaps(six.best, six.worst), 'best and worst must be disjoint at 6 days');

// Under four days there is no worst day distinct from the best. Empty, not a repeat.
for (const n of [0, 1, 2, 3]) {
  const rows = Array.from({ length: n }, (_, i) => day(`x${i}`, (n - i) * 10));
  const r = rankDays(rows);
  assert.equal(r.worst.length, 0, `${n} day(s): worst must be empty, not a repeat of best`);
  assert.ok(!overlaps(r.best, r.worst));
}

// Days with no sales are not ranked at all — a closed day is not the worst day.
const zeros = rankDays([day('open', 500), day('closed', 0), day('quiet', 100), day('shut', 0), day('mid', 300)]);
assert.deepEqual(zeros.ranked.map(d => d.date), ['open', 'mid', 'quiet']);
assert.ok(zeros.ranked.every(d => d.revenue_mmk > 0));

// The input must not be reordered under the caller — by_day feeds the chart.
const source = [day('p', 10), day('q', 90)];
rankDays(source);
assert.deepEqual(source.map(d => d.date), ['p', 'q'], 'rankDays must not mutate its input');

console.log('salesRollup ok');