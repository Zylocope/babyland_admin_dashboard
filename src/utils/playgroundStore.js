// Local persistence for the playground reward cards.
//
// ponytail: a stopgap, not the design. Cards belong on the server — the tables
// exist (playground_accounts / purchases / tokens) but nothing is wired to them
// yet, so without this a refresh wiped the day's work. Delete this module when
// the endpoints land; the hook is the only caller.
//
// Deliberately NOT keyed per user: a reward card belongs to the shop, not to
// whoever is holding the phone, so two staff on one device share the same list.

export const STORE_KEY = 'al_playground';

// Myanmar is UTC+06:30 with no DST. toISOString() is UTC, so the shop's
// "today" was rolling over at 06:30 local -- a check-in at 07:00 counted as the
// previous day. Shifting by the offset gives the Myanmar calendar date whatever
// the device clock is set to, which is what the shop's day actually means.
const MM_OFFSET_MIN = 6 * 60 + 30;
export const today = () =>
  new Date(Date.now() + MM_OFFSET_MIN * 60_000).toISOString().slice(0, 10);

// Pure so it can be tested without a browser. `saved` is whatever came out of
// storage — assume nothing about its shape.
export function pickState(saved, day) {
  const empty = { visitors: [], log: [] };
  if (!saved || typeof saved !== 'object') return empty;
  return {
    visitors: Array.isArray(saved.visitors) ? saved.visitors : [],
    // The log is "today's check-ins". Yesterday's must not show up as today's,
    // so it is dropped when the day rolls over. Cards are cumulative and stay.
    log: saved.day === day && Array.isArray(saved.log) ? saved.log : [],
  };
}

export function readStore() {
  try {
    return pickState(JSON.parse(localStorage.getItem(STORE_KEY)), today());
  } catch {
    // Private mode, cleared storage, or corrupt JSON. Starting empty beats
    // taking down the till.
    return { visitors: [], log: [] };
  }
}

export function writeStore(visitors, log) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ day: today(), visitors, log }));
  } catch {
    // Quota or a blocked store — the session still works, it just will not
    // survive a refresh.
  }
}
