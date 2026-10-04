// node src/services/assistantReports.test.js
import assert from 'node:assert/strict';
import { stockDetail, salesBreakdown } from './assistantReports.js';

const product = { selling_price: '22500' };
const batches = [
  { received_at: '2026-09-01T03:00:00Z', quantity_received: 10, quantity_remaining: 0, unit_cost: '15000', expiry_date: null },
  { received_at: '2026-09-20T03:00:00Z', quantity_received: 5, quantity_remaining: 3, unit_cost: '16000', expiry_date: '2026-10-14T00:00:00Z' },
  { received_at: '2026-10-01T03:00:00Z', quantity_received: 4, quantity_remaining: 4, unit_cost: '50000', expiry_date: '2027-01-01T00:00:00Z' },
];
const d = stockDetail(product, batches, '2026-10-04');
assert.equal(d.stock, 7);
assert.equal(d.batches.length, 2, 'emptied batches are not stock');
assert.equal(d.stock_value_at_cost_mmk, 3 * 16000 + 4 * 50000);
assert.equal(d.latest_unit_cost_mmk, 50000, 'newest batch, not the oldest');
assert.equal(d.selling_below_latest_cost, true);
assert.deepEqual(d.next_expiry, { date: '2026-10-14', days: 10, units: 3 });
assert.equal(d.units_without_expiry_date, 0);
assert.equal(stockDetail(product, [{ ...batches[1], expiry_date: null }], '2026-10-04').units_without_expiry_date, 3);

// 2026-10-03T18:00Z is 00:30 on Oct 4 in Yangon: a shop-day sale for the 4th, not the 3rd.
const sales = [
  { created_at: '2026-10-03T18:00:00Z', is_instore_sale: true, total_amount: '10000', by_admin: { username: 'cashier1' } },
  { created_at: '2026-10-04T05:00:00Z', is_instore_sale: true, total_amount: '30000', by_admin: { username: 'cashier2' } },
  { created_at: '2026-10-04T06:00:00Z', is_instore_sale: false, total_amount: '5000', by_admin: null },
  { created_at: '2026-10-03T10:00:00Z', is_instore_sale: true, total_amount: '99999', by_admin: { username: 'cashier1' } },
];
const b = salesBreakdown(sales, '2026-10-04', '2026-10-04');
assert.equal(b.sales, 3);
assert.equal(b.revenue_mmk, 45000);
assert.deepEqual(b.by_channel.map(c => [c.channel, c.sales]), [['in_store', 2], ['online', 1]]);
assert.deepEqual(b.by_cashier.map(c => [c.cashier, c.revenue_mmk]), [['cashier2', 30000], ['cashier1', 10000]]);

console.log('assistantReports ok');
