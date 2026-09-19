import { request } from "./baseService";
import type { CreateClaimTokenPayload } from "../types";

// Staff can do exactly one thing against the playground backend: mint a claim
// token. There is no read side — nothing exposes whether a token was scanned,
// by whom, or what the customer was finally charged. Do not build a screen that
// implies otherwise until set-kaung ships a staff-session read endpoint.
//
// unit_price travels as a string: the backend holds it as a Decimal, and a
// float round-trip would round money.
export const createPlaygroundToken = (
  payload: CreateClaimTokenPayload
): Promise<string> =>
  request("/admin/playground/tokens", {
    method: "POST",
    body: JSON.stringify(payload),
  });
