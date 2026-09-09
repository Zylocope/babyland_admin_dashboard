import assert from 'node:assert/strict';
import { pickState } from './playgroundStore.js';

const cards = [{ id: 'PG1', phone: '09', name: 'Su Su', points: 3, visits: 3, lastVisit: '2026-09-08' }];
const entries = [{ at: '9:00:00 AM', name: 'Su Su', phone: '09', free: false }];

// Same day: everything comes back.
const same = pickState({ day: '2026-09-09', visitors: cards, log: entries }, '2026-09-09');
assert.equal(same.visitors.length, 1);
assert.equal(same.log.length, 1, 'today\'s log must survive a refresh');

// Day rolled over: cards are cumulative and stay, but the log is "today's
// check-ins" — yesterday's entries must not be counted as today's.
const rolled = pickState({ day: '2026-09-08', visitors: cards, log: entries }, '2026-09-09');
assert.equal(rolled.visitors.length, 1, 'reward cards are cumulative');
assert.deepEqual(rolled.log, [], 'yesterday\'s log must be dropped');

// Junk in storage must not take the till down.
for (const bad of [null, undefined, 'nonsense', 42, {}, { visitors: 'x', log: 'y', day: '2026-09-09' }]) {
  const out = pickState(bad, '2026-09-09');
  assert.deepEqual(out, { visitors: [], log: [] }, `${JSON.stringify(bad)} should fall back to empty`);
}

console.log('playgroundStore ok');
