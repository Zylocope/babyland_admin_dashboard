import assert from 'node:assert/strict';
import { loadBatches, costChanges } from './inventoryHistory.js';

const PRODUCTS = [
  { id: 'p1', name: "Set Kaung's T-shirt", selling_price: '13300' },
  { id: 'p2', name: 'Fountain LAMY', selling_price: '72632' },
  { id: 'p3', name: 'Only One Batch', selling_price: '5000' },
];

// p1 is the real case: bought at 10,000, rebought at 50,000, still on the shelf
// at 13,300. p2 drifted slightly. p3 has a single batch, so there is nothing to
// compare it against.
const RECORDS = {
  p1: [
    { id: 'b2', unit_cost: '50000', quantity_received: 10, quantity_remaining: 10, received_at: '2026-09-24T00:00:00Z' },
    { id: 'b1', unit_cost: '10000', quantity_received: 20, quantity_remaining: 3, received_at: '2026-09-11T00:00:00Z' },
  ],
  p2: [
    { id: 'b4', unit_cost: '61000', quantity_received: 50, quantity_remaining: 50, received_at: '2026-09-20T00:00:00Z' },
    { id: 'b3', unit_cost: '60000', quantity_received: 40, quantity_remaining: 2, received_at: '2026-09-01T00:00:00Z' },
  ],
  p3: [
    { id: 'b5', unit_cost: '3000', quantity_received: 5, quantity_remaining: 5, received_at: '2026-09-15T00:00:00Z' },
  ],
};

const fetchRecords = async (id) => ({ data: RECORDS[id] ?? [] });

const { batches, failed } = await loadBatches({ products: PRODUCTS, fetchRecords });

assert.equal(failed, 0);
assert.equal(batches.length, 5);
// Newest first across the whole catalogue, not grouped per product.
assert.equal(batches[0].id, 'b2', '2026-09-24 is the most recent arrival');
assert.equal(batches.at(-1).id, 'b3', '2026-09-01 is the oldest');
// The product's name and shelf price ride along, so the caller needs no join.
assert.equal(batches[0].name, "Set Kaung's T-shirt");
assert.equal(batches[0].selling_price, 13300);

// A product whose inventory cannot be read is counted, not silently skipped —
// an alert built on 33 of 34 products must be able to say so.
{
  const flaky = await loadBatches({
    products: PRODUCTS,
    fetchRecords: async (id) => { if (id === 'p2') throw new Error('boom'); return { data: RECORDS[id] }; },
  });
  assert.equal(flaky.failed, 1);
  assert.equal(flaky.batches.length, 3, 'p1 and p3 only');
}

// The default 10% threshold is doing its job: only the T-shirt clears it, and
// Fountain LAMY's 1.7% drift is the noise it exists to filter.
assert.equal(costChanges(batches).length, 1);
assert.equal(costChanges(batches)[0].name, "Set Kaung's T-shirt");

// Drop the threshold to see both, and check the ordering.
const changes = costChanges(batches, { minPct: 1 });

// p3 has one batch, so it cannot have changed however low the threshold goes.
assert.equal(changes.length, 2);
assert.ok(!changes.some(c => c.name === 'Only One Batch'));

// The one losing money sorts first, ahead of a larger percentage that is still
// profitable — the order is "what needs a decision", not "what moved most".
assert.equal(changes[0].name, "Set Kaung's T-shirt");
assert.equal(changes[0].old_cost, 10000);
assert.equal(changes[0].new_cost, 50000);
assert.equal(changes[0].change_pct, 400);
assert.ok(changes[0].margin_pct < 0, 'selling below cost');

// A small rise that stays profitable is reported, but not alarming.
const lamy = changes.find(c => c.name === 'Fountain LAMY');
assert.ok(Math.abs(lamy.change_pct - 1.6667) < 0.01);
assert.ok(lamy.margin_pct > 0);

// Nothing clears an absurd threshold.
assert.equal(costChanges(batches, { minPct: 500 }).length, 0);

// A cost that collapses to almost nothing is flagged as probably mistyped, and
// a margin check alone cannot catch it — a cost of 1 against a 4,500 price
// looks like a wonderful margin. Real data had exactly this.
{
  const typo = [
    { product_id: 'e', name: 'City Fire Egg', selling_price: 4500, unit_cost: 1, received_at: '2026-09-20' },
    { product_id: 'e', name: 'City Fire Egg', selling_price: 4500, unit_cost: 3073, received_at: '2026-09-01' },
  ];
  const [row] = costChanges(typo);
  assert.equal(row.suspect, true, 'a 100% collapse is not a negotiation');
  assert.ok(row.margin_pct > 0, 'and it reads as a great margin, which is why suspect exists');
}

// A product repriced above its new cost stops being a decision. The T-shirt was
// bought at 50,000 and the shelf price moved to 60,000, so it ranks below
// anything still selling at a loss.
{
  const fixed = [
    { product_id: 'p1', name: 'Fixed', selling_price: 60000, unit_cost: 50000, received_at: '2026-09-24' },
    { product_id: 'p1', name: 'Fixed', selling_price: 60000, unit_cost: 10000, received_at: '2026-09-11' },
    { product_id: 'p9', name: 'Still losing', selling_price: 22500, unit_cost: 50000, received_at: '2026-09-24' },
    { product_id: 'p9', name: 'Still losing', selling_price: 22500, unit_cost: 15097, received_at: '2026-09-01' },
  ];
  const ranked = costChanges(fixed);
  assert.equal(ranked[0].name, 'Still losing', 'below cost outranks a bigger percentage');
  assert.ok(ranked.find(c => c.name === 'Fixed').margin_pct > 0);
}

// A previous cost of zero would make the percentage meaningless, so it is
// skipped rather than reported as an infinite rise.
{
  const zeroed = [
    { product_id: 'z', name: 'Z', selling_price: 100, unit_cost: 50, received_at: '2026-09-02' },
    { product_id: 'z', name: 'Z', selling_price: 100, unit_cost: 0, received_at: '2026-09-01' },
  ];
  assert.equal(costChanges(zeroed).length, 0, 'no divide by zero');
}

console.log('inventoryHistory ok');
