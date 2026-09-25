// node src/services/salesRollup.test.js
import assert from 'node:assert/strict';
import { summarizeSales, rankDays } from './salesRollup.js';

// Two days, both channels. API sends money as strings.
const rows = [
  { sale_date: '2026-08-01', is_instore_sale: true, total_sale: '100000', total_cost: '75000', transactions: 4, items_sold: 10 },
  { sale_date: '2026-08-01', is_instore_sale: false, total_sale: '50000', total_cost: '40000', transactions: 1, items_sold: 2 },
  { sale_date: '2026-08-02', is_instore_sale: true, total_sale: '50000', total_cost: '35000', transactions: 5, items_sold: 8 },
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

// The regression this file missed for weeks. The rollup read `is_online_sale`,
// which the API has never sent, so every row was undefined-therefore-in-store
// and the online column read zero however many online sales there were. The
// fixtures said `is_online_sale` too, so they agreed with the bug and passed.
//
// Two guards. The field has to be the one the wire actually uses, and a row
// carrying only the OLD name must not be mistaken for an in-store sale — if
// someone reintroduces that spelling, this fails instead of silently swinging
// the whole split back.
assert.ok(out.by_channel.online.revenue_mmk > 0, 'online revenue must not be zero on mixed rows');
{
  const stale = summarizeSales([
    { sale_date: '2026-08-03', is_online_sale: false, total_sale: '10000', total_cost: '5000', transactions: 1, items_sold: 1 },
  ]);
  assert.equal(stale.by_channel.in_store.revenue_mmk, 0, 'the old field name must not mark a sale in-store');
  assert.equal(stale.by_channel.online.revenue_mmk, 10000);
}

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
  return { sale_date: d, is_instore_sale: true, total_sale: '100', total_cost: '60', transactions: 1, items_sold: 1 };
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
// ---- byWeekday -------------------------------------------------------------
{
  const { byWeekday } = await import('./salesRollup.js');

  // 2026-09-19 is a Saturday. Two Saturdays, one Tuesday, and a Sunday the shop
  // was shut — a range that is deliberately lopsided, because that is the case
  // raw totals get wrong.
  const rows = [
    { date: '2026-09-19', revenue_mmk: 300000, transactions: 10, items_sold: 40 }, // Sat
    { date: '2026-09-22', revenue_mmk: 100000, transactions: 5,  items_sold: 12 }, // Tue
    { date: '2026-09-26', revenue_mmk: 500000, transactions: 15, items_sold: 60 }, // Sat
    { date: '2026-09-20', revenue_mmk: 0,      transactions: 0,  items_sold: 0  }, // Sun, shut
  ];
  const week = byWeekday(rows);
  const on = key => week.find(d => d.key === key);

  assert.equal(week.length, 7, 'always seven weekdays, traded or not');

  // The whole point: two Saturdays totalling 800k must report 400k, not 800k.
  assert.equal(on('Sat').days, 2);
  assert.equal(on('Sat').avg_revenue_mmk, 400000);
  assert.equal(on('Tue').days, 1);
  assert.equal(on('Tue').avg_revenue_mmk, 100000);

  // Saturday really is the better day, and by the right multiple.
  assert.equal(on('Sat').avg_revenue_mmk / on('Tue').avg_revenue_mmk, 4);

  // A shut day is not a quiet day. Sunday has no occurrences at all, so it
  // cannot drag an average down.
  assert.equal(on('Sun').days, 0);
  assert.equal(on('Sun').avg_revenue_mmk, 0);

  // Basket is revenue over transactions, not an average of averages.
  assert.equal(on('Sat').avg_basket_mmk, 800000 / 25);
  assert.equal(on('Sat').avg_transactions, 12.5);

  // Untraded weekdays are present and zeroed rather than missing.
  for (const key of ['Mon', 'Wed', 'Thu', 'Fri']) {
    assert.equal(on(key).days, 0, `${key} present`);
  }

  // A malformed date is skipped, not counted as a Sunday via NaN.
  assert.deepEqual(
    byWeekday([{ date: 'not-a-date', revenue_mmk: 999, transactions: 1 }]).map(d => d.days),
    [0, 0, 0, 0, 0, 0, 0],
  );

  console.log('byWeekday ok');
}
