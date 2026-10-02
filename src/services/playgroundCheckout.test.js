import assert from 'node:assert/strict';
import { checkoutStatus, freeTickets, amountDue, isSettled } from './playgroundCheckout.js';

const EXPECTED = 6000; // 3 tickets typed in at 2000 each

// Nothing fetched yet, and the code is still on screen unscanned. Both show the
// staff member the price they typed rather than a placeholder.
assert.equal(checkoutStatus(null), 'waiting');
assert.equal(amountDue(null, EXPECTED), EXPECTED);

// The shape the server sends now: the claim is its own object, absent until
// the customer scans. It used to be claimed_by/total_price at the top level
// alongside an available_coupons array.
const unscanned = {
  claim: null, expired: false,
  total_quantity: 3, unit_price: '2000',
};
assert.equal(checkoutStatus(unscanned), 'waiting');
assert.equal(amountDue(unscanned, EXPECTED), EXPECTED);
assert.equal(isSettled(unscanned), false);

// Scanned, no coupons: the server agrees with the till.
const plain = { ...unscanned, claim: { claimed_by: 'u1', total_price: '6000' } };
assert.equal(checkoutStatus(plain), 'claimed');
assert.equal(amountDue(plain, EXPECTED), 6000);
assert.equal(freeTickets(plain), 0);
assert.equal(isSettled(plain), true);

// Scanned with one free ticket: charge for two, not three. Taking the typed
// total here would overcharge by 2000, which is the whole reason this screen
// asks the server at all.
// Three tickets, one free: billed for two at 2000. The free count is derived
// from the bill now, not from a coupon list the server no longer sends.
const oneFree = { ...plain, claim: { claimed_by: 'u1', total_price: '4000' } };
assert.equal(amountDue(oneFree, EXPECTED), 4000);
assert.equal(freeTickets(oneFree), 1);

// More coupons than tickets: three coupons cannot make four tickets free.
const overCouponed = { ...plain, claim: { claimed_by: 'u1', total_price: '0' } };
assert.equal(freeTickets(overCouponed), 3);
assert.equal(amountDue(overCouponed, EXPECTED), 0);

// Expired before anyone scanned: nothing is owed and the code is dead.
const dead = { ...unscanned, expired: true };
assert.equal(checkoutStatus(dead), 'expired');
assert.equal(isSettled(dead), true);

// Claimed, then the clock rolled past expiry. The customer is standing there
// holding tickets they scanned — they still owe for them.
const lateButPaid = { ...plain, expired: true };
assert.equal(checkoutStatus(lateButPaid), 'claimed');
assert.equal(amountDue(lateButPaid, EXPECTED), 6000);

// A price the server sends as something unparseable must not render NaN in
// front of a customer; fall back to the figure staff typed.
const broken = { ...plain, claim: { claimed_by: 'u1', total_price: 'null' } };
assert.equal(amountDue(broken, EXPECTED), EXPECTED);

// A unit price of zero must not divide: Infinity free tickets on a real sale
// would be worse than reporting none.
assert.equal(freeTickets({ ...plain, unit_price: '0' }), 0, 'no divide by zero');
assert.equal(freeTickets({ claim: { total_price: '0' } }), 0, 'missing fields are not free tickets');

console.log('playgroundCheckout ok');
