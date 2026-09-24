// node src/services/aiCharts.test.js
import assert from 'node:assert/strict';
import { chartFromTool } from './aiCharts.js';

// A quiet month: one day of sales inside a 5-day range must still plot a line.
const sparse = chartFromTool('sales_summary', {
  range: { start: '2026-08-01', end: '2026-08-05' },
  by_day: [{ date: '2026-08-03', revenue_mmk: 29800, in_store_mmk: 29800, online_mmk: 0 }],
});
assert.equal(sparse.kind, 'sales');
assert.equal(sparse.data.length, 5, 'every day in the range gets a point');
assert.deepEqual(sparse.data.map(d => d.revenue), [0, 0, 29800, 0, 0]);
assert.equal(sparse.hasOnline, false, 'no online sales means no second series');

// Month boundaries must not be skipped or duplicated.
const across = chartFromTool('sales_summary', {
  range: { start: '2026-07-30', end: '2026-08-02' },
  by_day: [{ date: '2026-08-01', revenue_mmk: 100, in_store_mmk: 60, online_mmk: 40 }],
});
assert.deepEqual(across.data.map(d => d.date), ['2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02']);
assert.equal(across.hasOnline, true);

// A single-day range has nothing to trend, so no chart.
assert.equal(chartFromTool('sales_summary', {
  range: { start: '2026-08-05', end: '2026-08-05' },
  by_day: [{ date: '2026-08-05', revenue_mmk: 500, in_store_mmk: 500, online_mmk: 0 }],
}), null);

// No sales at all, a failed tool, and an untracked tool all render nothing.
assert.equal(chartFromTool('sales_summary', { range: { start: '2026-08-01', end: '2026-08-05' }, by_day: [] }), null);
assert.equal(chartFromTool('low_stock', { error: 'boom' }), null);
assert.equal(chartFromTool('list_categories', { count: 6, categories: ['a'] }), null);

// Keep full names: the responsive bar list and table can wrap them.
const stock = chartFromTool('low_stock', {
  products: Array.from({ length: 12 }, (_, i) => ({ name: 'x'.repeat(30), stock: i })),
});
assert.equal(stock.data.length, 8);
assert.equal(stock.data[0].name, 'x'.repeat(30));
assert.equal(stock.allData.length, 12);

// compare_periods: two same-scale metrics only; counts stay out of the chart.
const cmp = chartFromTool('compare_periods', {
  current: { revenue_mmk: 300, profit_mmk: 90, transactions: 3 },
  previous: { revenue_mmk: 200, profit_mmk: 40, transactions: 2 },
});
assert.equal(cmp.kind, 'compare');
assert.deepEqual(cmp.data.map(d => d.metric), ['revenue', 'profit']);
assert.equal(cmp.data[0].current, 300);
assert.equal(cmp.data[0].previous, 200);
assert.equal(chartFromTool('compare_periods', { note: 'no sales' }), null);

// weekday: quiet days keep their bar, but a single active day is not a pattern.
const wk = chartFromTool('sales_by_weekday', {
  by_weekday: [
    { weekday: 'Sunday', revenue_mmk: 0 }, { weekday: 'Monday', revenue_mmk: 500 },
    { weekday: 'Tuesday', revenue_mmk: 800 }, { weekday: 'Wednesday', revenue_mmk: 0 },
    { weekday: 'Thursday', revenue_mmk: 0 }, { weekday: 'Friday', revenue_mmk: 0 },
    { weekday: 'Saturday', revenue_mmk: 0 },
  ],
});
assert.equal(wk.kind, 'bars');
assert.equal(wk.data.length, 7, 'zero days still get a bar');
assert.deepEqual(wk.data.map(d => d.label).slice(0, 3), ['Sun', 'Mon', 'Tue']);
assert.equal(chartFromTool('sales_by_weekday', {
  by_weekday: [{ weekday: 'Monday', revenue_mmk: 500 }, { weekday: 'Tuesday', revenue_mmk: 0 }],
}), null, 'one active day is not a trend');

// stock_by_category: eight named tiles plus a lossless grouped tail, valued in MMK.
const cat = chartFromTool('stock_by_category', {
  categories: Array.from({ length: 10 }, (_, i) => ({ category: `c${i}`, retail_value_mmk: i * 100, units: i })),
});
assert.equal(cat.kind, 'treemap');
assert.equal(cat.data.length, 9);
assert.equal(cat.groupedCount, 2);
assert.equal(cat.data.at(-1).other, true);
assert.equal(cat.data.reduce((sum, row) => sum + row.value, 0), cat.allData.reduce((sum, row) => sum + row.value, 0));
assert.equal(cat.unit, 'mmk');
assert.equal(chartFromTool('stock_by_category', { categories: [{ category: 'only', retail_value_mmk: 5 }] }), null);


// --- regression: long ranges aggregate, they do not invent zeros ------------
// 40 real selling days must not be padded down to a 31-day tail with nine
// leading zeros. Points are bucketed, and the plotted revenue must still equal
// the revenue that went in.
const days = Array.from({ length: 40 }, (_, i) => ({
  date: new Date(Date.UTC(2026, 6, 1) + i * 86400000).toISOString().slice(0, 10),
  revenue_mmk: 100, in_store_mmk: 100, online_mmk: 0,
}));
const wide = chartFromTool('sales_summary', {
  range: { start: '2026-07-01', end: '2026-08-09' },
  by_day: days,
});
assert.equal(wide.granularity, 'week', '40 days should bucket into weeks');
assert.ok(wide.data.length <= 31, 'a long range must not render one bar per day');
assert.equal(
  wide.data.reduce((sum, d) => sum + d.revenue, 0),
  4000,
  'aggregation must preserve every kyat'
);
assert.ok(wide.data.every(d => d.revenue > 0), 'no bucket may be a fabricated zero');

// A short range stays daily and still pads genuine gaps, which are real zeros.
const short = chartFromTool('sales_summary', {
  range: { start: '2026-08-01', end: '2026-08-05' },
  by_day: [{ date: '2026-08-03', revenue_mmk: 500, in_store_mmk: 500, online_mmk: 0 }],
});
assert.equal(short.granularity, 'day');
assert.equal(short.data.length, 5);
assert.equal(short.data.filter(d => d.revenue === 0).length, 4, 'genuine no-sale days stay zero');

console.log('aiCharts ok');

// Multi-year queries must keep the tail that the old 366-day guard discarded.
const longDays = Array.from({ length: 800 }, (_, i) => ({
  date: new Date(Date.UTC(2024, 0, 1) + i * 86400000).toISOString().slice(0, 10),
  revenue_mmk: 100, in_store_mmk: 60, online_mmk: 40,
}));
const longRange = { start: longDays[0].date, end: longDays.at(-1).date };
const longChart = chartFromTool('sales_summary', { range: longRange, by_day: longDays });
assert.equal(longChart.data.reduce((sum, row) => sum + row.revenue, 0), 80000);
assert.equal(longChart.data.reduce((sum, row) => sum + row.inStore, 0), 48000);
assert.equal(longChart.data.reduce((sum, row) => sum + row.online, 0), 32000);
assert.equal(longChart.data.at(-1).endDate, longRange.end);
assert.deepEqual(longChart.range, longRange);
assert.ok(longChart.data.length <= 31);
assert.equal(cat.metricKey, 'aiChart.retailValue');
assert.equal(cat.totalCount, 10);
assert.equal(cat.allData.length, 10);
assert.equal(chartFromTool('sales_summary', { range: { start: '2026-02-30', end: '2026-03-04' }, by_day: days }), null);
