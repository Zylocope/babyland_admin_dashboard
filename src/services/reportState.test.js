// node src/services/reportState.test.js
import assert from 'node:assert/strict';
import { classifyReport, isFailed, FAILED, EMPTY, OK } from './reportState.js';

// The regression this exists for: a failed sales call has no `totals`, and the
// renderer treated a missing total as a zero total and said "no sales".
// A broken connection must never be reported as a quiet day.
assert.equal(classifyReport({ error: 'Request failed (500)' }), FAILED);
assert.equal(classifyReport(undefined), FAILED);
assert.equal(classifyReport(null), FAILED);

// Worked, but the range genuinely holds nothing. Tools say so with `note`.
assert.equal(classifyReport({ note: 'No sales recorded in this range.' }), EMPTY);

// A real answer, including one whose numbers are legitimately zero.
assert.equal(classifyReport({ totals: { transactions: 0, revenue_mmk: 0 } }), OK);
assert.equal(classifyReport({ totals: { transactions: 12, revenue_mmk: 400000 } }), OK);

// The three must be mutually exclusive — the original bug was two of them
// sharing one branch.
const cases = [
  { error: 'boom' },
  { note: 'nothing here' },
  { totals: { transactions: 3 } },
];
assert.deepEqual(cases.map(classifyReport), [FAILED, EMPTY, OK]);

assert.equal(isFailed({ error: 'x' }), true);
assert.equal(isFailed({ note: 'x' }), false, 'an empty range is not a failure');

console.log('reportState ok');
