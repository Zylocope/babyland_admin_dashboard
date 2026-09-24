// Turns one checkout response into the three things the door staff need:
// which state the sale is in, what to charge, and how many tickets the
// customer got free.
//
// Kept apart from the screen because the states are easy to get subtly wrong
// and hard to see in a browser: a token that has expired unclaimed and one that
// was claimed a second before expiry look nearly identical in the payload, and
// charging for the second is a real mistake a real customer would notice.

// The backend applies min(coupons, quantity) — one coupon buys one ticket — and
// bills the rest. Recomputing it the same way avoids dividing a money string by
// another money string to get back to a count.
export const freeTickets = (data) =>
  Math.min(data?.available_coupons?.length ?? 0, data?.total_quantity ?? 0);

// `claimed` beats `expired`: once a customer has scanned, the sale happened,
// and a token that ticks past its expiry a moment later still has to be paid
// for. The other order would blank the amount owed with the customer standing
// at the door.
export const checkoutStatus = (data) => {
  if (!data) return 'waiting';
  if (data.claimed_by) return 'claimed';
  if (data.expired) return 'expired';
  return 'waiting';
};

// The figure on screen. Before the scan there is no bill, so the expected total
// staff typed in stands in for it — the number is already known locally and
// showing it beats showing a spinner. After the scan the server's number wins,
// because only the server knows the customer's coupons.
export const amountDue = (data, expected) => {
  if (checkoutStatus(data) !== 'claimed') return expected;
  const total = Number(data.total_price);
  return Number.isFinite(total) ? total : expected;
};

// Polling stops for good once there is nothing left to learn.
export const isSettled = (data) => checkoutStatus(data) !== 'waiting';
