// node src/services/assistantReports.test.js
import assert from 'node:assert/strict';
import { stockDetail, salesBreakdown, expiringSoon, productHealth } from './assistantReports.js';

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

// Soonest first; an expiry at 00:00 UTC is already that day in Yangon.
const e = expiringSoon([
  { product_id: 'p1', product_name: 'Milk', batch_id: 'aaaaaaaa-1', quantity_remaining: 4, expiry_date: '2026-10-20T00:00:00Z' },
  { product_id: 'p2', product_name: 'Biscuit', batch_id: 'bbbbbbbb-2', quantity_remaining: 6, expiry_date: '2026-10-07T00:00:00Z' },
  { product_id: 'p1', product_name: 'Milk', batch_id: 'cccccccc-3', quantity_remaining: 2, expiry_date: '2026-10-06T00:00:00Z' },
], '2026-10-06');
assert.deepEqual(e.items.map(i => [i.product, i.days_left]), [['Milk', 0], ['Biscuit', 1], ['Milk', 14]]);
assert.equal(e.units, 12);
assert.equal(e.products, 2);
assert.equal(e.items[0].batch, 'cccccccc');

// productHealth: starts from stock, so a product that never sold is still seen.
const prods = [
  { id: 'milk', name: 'Milk', quantity_in_stock: 30, selling_price: '10000', is_shown_online: true },
  { id: 'toy', name: 'Toy', quantity_in_stock: 8, selling_price: '20000', is_shown_online: false },
  { id: 'pen', name: 'Pen', quantity_in_stock: 100, selling_price: '1000', is_shown_online: true },
  { id: 'soap', name: 'Soap', quantity_in_stock: 5, selling_price: '3000', original_price: '3500', is_shown_online: true },
  { id: 'gone', name: 'Gone', quantity_in_stock: 0, selling_price: '5000', is_shown_online: true },
];
const sold = [
  { product_id: 'milk', units: 9, cost_mmk: 72000 },   // 0.1/day: 30 left need 300 days
  { product_id: 'pen', units: 9, cost_mmk: 8100 },     // 0.1/day: 100 left = 1000 days; cost 900
  { product_id: 'soap', units: 90, cost_mmk: 180000 }, // 1/day: 5 left = 5 days
];
const exp = [{ product_id: 'milk', quantity_remaining: 20, expiry_date: '2026-10-24T00:00:00Z' }]; // 20 days
const h = productHealth({ products: prods, sold, expiring: exp, costs: new Map([['toy', 25000]]), days: 90, today: '2026-10-04', limit: 10 });
assert.equal(h.products_with_stock, 4, 'out-of-stock products are not considered');
assert.deepEqual(h.items.map(i => i.name), ['Milk', 'Toy', 'Pen'], 'expiring first, then never sold, then slow');
assert.deepEqual(h.counts, { expiring_unsold: 1, no_sales: 1, slow: 2 });
assert.equal(h.moving_well, 1);
const milk = h.items[0];
assert.deepEqual(milk.next_expiry, { days: 20, units: 20, sells_before_expiry: false });
assert.equal(milk.latest_unit_cost_mmk, 8000, 'average cost of what sold when no batch cost is given');
assert.equal(milk.max_discount_pct_without_loss, 20);
assert.equal(milk.suggested_discount_pct, 20, 'never suggests more than the room above cost');
const toy = h.items[1];
assert.equal(toy.units_sold, 0);
assert.equal(toy.days_of_stock_at_current_pace, null);
assert.equal(toy.max_discount_pct_without_loss, 0, 'already priced below cost: no room');
assert.equal(toy.margin_pct, -25);
assert.equal(h.items[2].days_of_stock_at_current_pace, 1000);
assert.equal(h.items[2].suggested_discount_pct, 10, 'slow sellers are capped at a 10% nudge');
assert.deepEqual(h.best_sellers[0], { name: 'Soap', units_sold: 90 });
assert.ok(!('score' in milk), 'internal ranking score is not sent to the model');

console.log('assistantReports ok');
