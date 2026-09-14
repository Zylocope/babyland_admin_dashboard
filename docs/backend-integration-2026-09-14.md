# Backend integration check — 14 September 2026

Reviewed backend dev commit 23ad93a. These are source-code findings, not live deployment tests.

## Questions for Set Kaung

- POS: `create_sale` now requires `SuperAdminRole`. Please allow sale staff to create sales while keeping reports manager-only. Our till uses POST /admin/sales.
- Playground: staff can create a token, but how can staff see whether the customer claimed it, paid/free quantities, and the final charge? Please provide a staff-session read endpoint. Current claim and ticket endpoints require a customer JWT.
- Playground: please return the authoritative unit price and final amount with the completed claim. The current purchase response only includes IDs, quantities, and the free-redemption flag.
- Coupons: where can the customer fetch available coupon IDs? `claim_free` returns account counters, but claiming a token requires coupon IDs. No coupon-list route is present.
- Coupons: `claim_free_ticket` checks eligibility greater than 10. Should exactly 10 qualify? Also check concurrent redemption: the eligibility read happens before the transaction that deducts it.
- Sales dates: keep UTC timestamps; filter and group sales by Asia/Yangon shop days. SQL still uses `created_at::date`, depending on database session timezone.

## Frontend work

- Day.js with explicit Asia/Yangon now supplies shop dates, sales receipt display/filtering, and playground clock/filtering.
- Header and assistant already consume the shared shop-date helper.
- Existing playground visitor screens remain local prototypes. Do not treat their points or check-ins as server-confirmed purchases, or connect customer-only APIs using staff credentials.
- Full staff coupon confirmation is blocked on the staff read endpoint above.
- AI integration remains blocked on the authenticated Gemini proxy.

## Verification next

- Quantity fix is present: SUM(quantity) replaces COUNT(*). Verify a controlled sale of three units reports three items.
- Use an isolated test environment or mocked responses for sale staff permissions, coupon success/expiry/reuse, and chart ranges. Do not create production sales for tests.
- Test report dates at Myanmar midnight, with the browser set to another timezone.
