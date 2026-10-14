// node src/utils/discount.test.js
import assert from 'node:assert/strict';
import { discountBody, removeDiscountBody, isDiscounted, percentOff } from './discount.js';

const full = { barcode: '1', name: 'Milk', category_id: 'c', sub_category_id: null, selling_price: '10000', original_price: null,
  is_shown_online: true, is_perishable: true, description: 'keep me', image_url: 'img' };

const d = discountBody(full, 20);
assert.equal(d.selling_price, '8000');
assert.equal(d.original_price, '10000');
assert.equal(d.description, 'keep me', 'full PUT keeps every other field');

const on = { ...full, selling_price: '8000', original_price: '10000' };
assert.equal(isDiscounted(on), true);
assert.equal(percentOff(on), 20);
assert.equal(discountBody(on, 10).selling_price, '9000', 're-discount starts from the original price');
assert.deepEqual([removeDiscountBody(on).selling_price, removeDiscountBody(on).original_price], ['10000', null]);
assert.equal(isDiscounted({ ...full, original_price: '9000' }), false, 'original below price is not a discount');

console.log('discount ok');
