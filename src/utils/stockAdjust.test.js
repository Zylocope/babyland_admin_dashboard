// node src/utils/stockAdjust.test.js
import assert from 'node:assert/strict';
import { buildAdjustment } from './stockAdjust.js';

const product = { id: 'p1', quantity_in_stock: 10 };
const batches = [
  { id: 'b1', quantity_remaining: 3 },
  { id: 'b2', quantity_remaining: 7 },
];
const form = (over) => ({ direction: 'remove', quantity: '2', reason: 'damaged', batchId: '', note: '', ...over });

// Removal without a batch goes to FIFO and is sent as a negative change.
assert.deepEqual(buildAdjustment(form(), product, batches), {
  payload: { product_id: 'p1', quantity_change: -2, reason: 'damaged' },
});

// Removal from a named batch cannot exceed what that batch holds.
assert.deepEqual(buildAdjustment(form({ batchId: 'b1', quantity: '4' }), product, batches),
  { error: 'adjustStock.errTooMany', available: 3 });

// Removal without a batch cannot exceed total stock.
assert.equal(buildAdjustment(form({ quantity: '11' }), product, batches).error, 'adjustStock.errTooMany');

// Addition needs a batch, and is sent positive with the batch and trimmed note.
assert.equal(buildAdjustment(form({ direction: 'add' }), product, batches).error, 'adjustStock.errBatch');
assert.deepEqual(
  buildAdjustment(form({ direction: 'add', batchId: 'b2', reason: 'miscounted', note: '  shelf recount ' }), product, batches),
  { payload: { product_id: 'p1', quantity_change: 2, reason: 'miscounted', inventory_id: 'b2', note: 'shelf recount' } },
);

// Zero, fractions and unknown reasons are refused before the round trip.
assert.equal(buildAdjustment(form({ quantity: '0' }), product, batches).error, 'adjustStock.errQty');
assert.equal(buildAdjustment(form({ quantity: '1.5' }), product, batches).error, 'adjustStock.errQty');
assert.equal(buildAdjustment(form({ reason: 'stolen' }), product, batches).error, 'adjustStock.errReason');

console.log('stockAdjust ok');
