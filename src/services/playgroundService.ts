import { request } from "./baseService";
import type { CreateClaimTokenPayload, PlaygroundCheckoutDataAdmin } from "../types";

// unit_price travels as a string: the backend holds it as a Decimal, and a
// float round-trip would round money.
export const createPlaygroundToken = (
  payload: CreateClaimTokenPayload
): Promise<string> =>
  request("/admin/playground/tokens", {
    method: "POST",
    body: JSON.stringify(payload),
  });

// What the customer actually owes, once they have scanned the code.
//
// The token is the only thing staff hold — the customer identifies themselves by
// scanning, and the server reads the claimant off the token. That is why there
// is no user id here: an earlier version of this endpoint took one as a query
// parameter, and omitting it silently returned the undiscounted price.
//
// `claimed_by` is null until the customer scans, and `total_price` is null with
// it — a token nobody has claimed has no bill yet. `total_price` already has the
// customer's free-ticket coupons deducted, so it is the number to charge, not a
// figure to do arithmetic on.
export const getPlaygroundCheckout = (
  tokenId: string
): Promise<PlaygroundCheckoutDataAdmin> =>
  request(`/admin/playground/checkout/${tokenId}`, { method: "GET" });
