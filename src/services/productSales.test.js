import assert from 'node:assert/strict';
import { productSales, categorySales } from './productSales.js';

// Two receipts inside the range, one outside it.
const SALES = [
  { id: 's1', created_at: '2026-09-20T10:00:00Z' },
  { id: 's2', created_at: '2026-09-21T10:00:00Z' },
  { id: 'old', created_at: '2026-08-01T10:00:00Z' },
];

const DETAIL = {
  s1: { sale_items: [
    { product_id: 'p1', product_name: 'Nappies', quantity: 3, selling_price: '2000', cost_price: '1200' },
    { product_id: 'p2', product_name: 'Toy', quantity: 1, selling_price: '9000', cost_price: '5000' },
  ] },
  s2: { sale_items: [
    { product_id: 'p1', product_name: 'Nappies', quantity: 5, selling_price: '2000', cost_price: '1200' },
  ] },
  old: { sale_items: [
    { product_id: 'p2', product_name: 'Toy', quantity: 99, selling_price: '9000', cost_price: '5000' },
  ] },
};

const listSales = async () => ({ data: SALES, total_pages: 1 });
const loadSale = async (id) => DETAIL[id];

const out = await productSales({ start: '2026-09-20', end: '2026-09-21', listSales, loadSale });

// The out-of-range receipt must not be opened at all — if it leaked in, the toy
// would top the ranking with 99 units from a different month.
assert.equal(out.receipts, 2);
assert.equal(out.rows.length, 2);
assert.equal(out.truncated, false);

// Quantities add across receipts, not counted as one line each.
const nappies = out.rows.find(r => r.name === 'Nappies');
assert.equal(nappies.units, 8, '3 + 5 units, not 2 line items');
assert.equal(nappies.revenue_mmk, 16000);
assert.equal(nappies.profit_mmk, 16000 - 9600);

// Ranked by units sold, so the best seller is first.
assert.equal(out.rows[0].name, 'Nappies');

// A receipt that fails to load is counted, never silently treated as empty —
// an answer built on nine of ten receipts must be able to say so.
{
  const flaky = await productSales({
    start: '2026-09-20', end: '2026-09-21', listSales,
    loadSale: async (id) => { if (id === 's2') throw new Error('boom'); return DETAIL[id]; },
  });
  assert.equal(flaky.failed, 1);
  assert.equal(flaky.receipts, 1);
  assert.equal(flaky.rows.find(r => r.name === 'Nappies').units, 3, 'only the receipt that loaded');
}

// Categories join from the catalogue by id, and anything no longer in the
// catalogue is grouped rather than dropped.
{
  const cats = categorySales(out.rows, [
    { id: 'p1', category: 'Nappies & Wipes' },
  ]);
  assert.equal(cats.length, 2);
  const top = cats[0];
  assert.equal(top.category, 'Nappies & Wipes');
  assert.equal(top.revenue_mmk, 16000);
  assert.ok(cats.some(c => c.category === 'Uncategorised'), 'p2 has no catalogue row');
  // Ranked by revenue, and the parts must sum to the whole.
  assert.equal(
    cats.reduce((s, c) => s + c.revenue_mmk, 0),
    out.rows.reduce((s, r) => s + r.revenue_mmk, 0),
  );
}

console.log('productSales ok');
