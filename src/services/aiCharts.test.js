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

// Low stock: capped at 8 bars, long names truncated so the axis stays readable.
const stock = chartFromTool('low_stock', {
  products: Array.from({ length: 12 }, (_, i) => ({ name: 'x'.repeat(30), stock: i })),
});
assert.equal(stock.data.length, 8);
assert.ok(stock.data[0].name.length <= 22);
assert.ok(stock.data[0].name.endsWith('…'));

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

// stock_by_category: capped at 8 bars, valued in MMK.
const cat = chartFromTool('stock_by_category', {
  categories: Array.from({ length: 10 }, (_, i) => ({ category: `c${i}`, retail_value_mmk: i * 100, units: i })),
});
assert.equal(cat.data.length, 8);
assert.equal(cat.unit, 'mmk');
assert.equal(chartFromTool('stock_by_category', { categories: [{ category: 'only', retail_value_mmk: 5 }] }), null);

console.log('aiCharts ok');
