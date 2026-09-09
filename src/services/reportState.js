// Three outcomes a report can have, kept apart.
//
// The sales quick report collapsed all three into "no sales": a thrown request
// produces a result with no `totals`, and the renderer read a missing total as a
// zero total. A manager then reads a broken connection as a quiet day, which is
// the most expensive possible misreading of a sales screen.
//
// Pure and dependency-free so it can be tested under bare `node`; the tools it
// classifies cannot be, because they reach the network.

export const FAILED = 'failed';
export const EMPTY = 'empty';
export const OK = 'ok';

// A tool signals "the call did not work" with `error`, and "the call worked but
// the range holds nothing" with `note`. Anything without either is a real answer.
export const classifyReport = (res) => {
  if (!res || res.error) return FAILED;
  if (res.note) return EMPTY;
  return OK;
};

export const isFailed = (res) => classifyReport(res) === FAILED;
