# Backend handoff — for set-kaung

Raised 2026-09-09 from a frontend audit. Frontend commit: see `git log`.
Backend checked at `appleland_backend` **`be80d2d`** (branch `dev`).

**None of these are fixed by the frontend work.** Where the frontend now
compensates, that is a workaround and is marked as such — the underlying issue
is still open.

---

## 1. The AI proxy has no authentication — HIGH

`api/chat.js` (this repo, deployed as a Vercel function).

Anyone who can reach the URL can spend the Gemini allowance. The only gate is an
in-memory per-IP daily counter, which resets on every cold start and is cleared
when the map grows, so it bounds nothing durably. It is a quota guard, never
auth, and was always documented as such — but it is deployed.

Also worth knowing for the privacy question: the proxy holds no shop credentials
and never queries the backend, **but shop data does pass through it.** The tool
loop posts each tool result to Gemini in the request body, so sales figures and
stock levels are relayed by that function. Anything said about what Gemini
receives has to account for that.

- **Needs you (infrastructure):** host the same proxy behind the Rust session
  middleware so it can verify an admin session, and back the usage limit with
  something durable (a table or Redis) rather than process memory.
- **We can prepare locally:** the frontend already sends credentials on its own
  calls; once there is an authenticated endpoint we point the assistant at it.
  Nothing to change until the endpoint exists.

## 2. Sales-report permissions are client-side only — HIGH

The frontend now restricts the Sales screen and today's-revenue figure to
Manager. That is a UI decision and nothing more — `GET /admin/sales/summary`
will still answer any authenticated session, so a sale or playground account can
read revenue directly.

- **Needs you:** enforce the role server-side on the sales routes.
- **We prepared locally:** role gating in the UI, so the app does not *invite*
  it. Do not treat that as the fix.

## 3. Day boundaries are not the shop's — HIGH for correctness

The frontend built its ranges from the device clock, so a machine in another
timezone reported a different day. That is fixed on our side: `utils/shopDay.js`
is now the single definition, Myanmar UTC+06:30, and every date the app sends is
that calendar day.

That only makes the **request** correct. What the server does with it is still
open:

- **Needs you:** confirm `sales.created_at` is stored as `timestamptz`, and that
  `get_sale_summary` groups by the Myanmar day rather than by UTC.
  `filtered_sales` currently does `s.created_at::date`, which casts in the
  session/database timezone. If that is UTC, every sale between 00:00 and 06:30
  Myanmar time is filed under the previous day, and our correct request still
  returns a day boundary six and a half hours out.
- **Also confirm:** the deployed database's timezone setting, since the cast
  depends on it.

## 4. `items_sold` counts rows, not units — MEDIUM, wrong numbers

`src/sales/store.rs:191`, in `get_sale_summary`:

```sql
item_counts AS (
    SELECT sale_id,
           COUNT(*)::INT4        AS items_sold,   -- ← counts sale_item ROWS
           SUM(quantity * cost_price) AS total_cost
    FROM sale_items GROUP BY sale_id
)
```

`COUNT(*)` counts line items, so a sale of one product with quantity 8 reports
`items_sold = 1`. The same CTE sums `quantity` correctly for `total_cost` one
line below, which is what makes this look like an oversight rather than an
intended meaning.

Expected fix: `SUM(quantity)::INT4 AS items_sold`.

Everything downstream is understated: the "items sold" figure on the Sales
dashboard, the assistant's answers, and average items per sale.

- **Needs you:** the SQL change.
- **We cannot compensate:** the per-sale quantities are not in the summary
  response, so the frontend has no way to recover the real number. It is
  displayed as returned.

---

## Still wanted (unchanged from earlier asks)

- `GET /admin/orders` — the new orders routes are write-only. Nothing exposes an
  order id, so `PATCH /admin/orders/{id}` and `.../update_status/{id}` cannot be
  called at all.
- Expose the admin/cashier on `GET /admin/sales` and `/admin/sales/{id}`.
  `admin_sales(sale_id, admin_id)` already records it; it is only ever read as
  `a.id IS NULL` to derive `is_online_sale`. This is a read-side gap, not a
  missing write.
- `GET /admin/sales/top-products?start_date=&end_date=` — best-seller is still
  unanswerable without an N+1 over `getSaleDetail`.
- Global `GET /admin/inventory` with `expiring_before`.
- Staff endpoints — none exist. Staff create/edit/delete are disabled in the UI
  because they only ever mutated React state.
- `get_all_categories` has no `WHERE is_deleted = false`, so soft-deleted
  categories still come back. The frontend filters in
  `categoryService.getCategories`; the query is the better place.
- Drop `updated_by` from `UpdateCategoryPayload` — it is required by the schema
  and then overwritten from the session, so the client sends a value that is
  always discarded.
