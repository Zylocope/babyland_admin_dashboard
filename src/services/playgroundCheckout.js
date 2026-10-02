// Turns one checkout response into the three things the door staff need:
// which state the sale is in, what to charge, and how many tickets the
// customer got free.
//
// Kept apart from the screen because the states are easy to get subtly wrong
// and hard to see in a browser: a token that has expired unclaimed and one that
// was claimed a second before expiry look nearly identical in the payload, and
// charging for the second is a real mistake a real customer would notice.

// Free tickets are now derived from the bill rather than counted from a coupon
// list. The response used to carry `available_coupons`, and the server applied
// min(coupons, quantity); it now returns only the claim with its final price, so
// the count comes back out of the arithmetic: whatever the customer was not
// charged for, at the unit price they were quoted.
//
// Guarded against a zero or missing unit price — dividing by it would produce
// Infinity and render as a free ticket count on a real sale.
export const freeTickets = (data) => {
  const unit = Number(data?.unit_price);
  const total = Number(data?.claim?.total_price);
  const qty = Number(data?.total_quantity);
  if (!Number.isFinite(unit) || unit <= 0) return 0;
  if (!Number.isFinite(total) || !Number.isFinite(qty)) return 0;
  return Math.max(0, Math.min(qty, Math.round(qty - total / unit)));
};

// `claimed` beats `expired`: once a customer has scanned, the sale happened,
// and a token that ticks past its expiry a moment later still has to be paid
// for. The other order would blank the amount owed with the customer standing
// at the door.
export const checkoutStatus = (data) => {
  if (!data) return 'waiting';
  // The claim moved into its own object: present means scanned, absent means
  // still waiting. It used to be a `claimed_by` field at the top level.
  if (data.claim) return 'claimed';
  if (data.expired) return 'expired';
  return 'waiting';
};

// The figure on screen. Before the scan there is no bill, so the expected total
// staff typed in stands in for it — the number is already known locally and
// showing it beats showing a spinner. After the scan the server's number wins,
// because only the server knows the customer's coupons.
export const amountDue = (data, expected) => {
  if (checkoutStatus(data) !== 'claimed') return expected;
  const total = Number(data.claim?.total_price);
  return Number.isFinite(total) ? total : expected;
};

// Polling stops for good once there is nothing left to learn.
export const isSettled = (data) => checkoutStatus(data) !== 'waiting';
