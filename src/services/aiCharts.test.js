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

console.log('aiCharts ok');
