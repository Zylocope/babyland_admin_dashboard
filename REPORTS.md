# Reports — what a shop like this can show

Every table a baby store with an indoor playground would reasonably want, with
the columns it needs and what it looks like filled in. Ordered so the ones worth
the most come first inside each section.

Status on every table is one of:

| | meaning |
|---|---|
| **READY** | the data exists and the table loads fast. Frontend work only. |
| **SLOW** | buildable today, but only by opening every receipt or every product one at a time. Works; gets worse every week. |
| **BACKEND** | cannot be built at all until Set Kaung adds something. |

Sample rows use real product and customer names from the live database so the
shape is recognisable. The numbers are illustrative.

---

## 1. Sales and revenue

### 1.1 Top products — BUILT (SLOW)

The one the owner asks for first. Live on Sales → Top products.

| Item | Units | Buy | Sell | Revenue | Gross profit |
|---|---|---|---|---|---|
| Fountain LAMY | 38 | 60,421 MMK | 72,632 MMK | 2,760,000 MMK | 464,000 MMK |
| Set Kaung's T-shirt | 13 | 46,923 MMK | 13,300 MMK | 172,900 MMK | −437,100 MMK |
| Two Babies အနှီး 5 pcs | 12 | 23,676 MMK | 29,000 MMK | 348,000 MMK | 63,891 MMK |

Currently opens every receipt in the range — about nine seconds for a week.
Needs `GET /admin/sales/product-performance` to become one query.

### 1.2 Worst sellers — SLOW

Same walk, sorted the other way, restricted to products that have stock. What to
discount or stop buying.

| Item | Units sold | Stock left | Stock value | Days since last sale |
|---|---|---|---|---|
| ကျားညှပ်အနက် | 1 | 63 | 378,000 MMK | 22 |
| Shen Gang က | 0 | 22 | 235,400 MMK | never |

### 1.3 Sales by category — SLOW

Which category earns, as opposed to which one sells.

| Category | Units | Revenue | Gross profit | Margin | Share of revenue |
|---|---|---|---|---|---|
| Stationery | 51 | 2,932,900 MMK | 466,000 MMK | 15.9% | 68% |
| Accessories | 33 | 648,000 MMK | 121,400 MMK | 18.7% | 15% |
| Food | 22 | 214,000 MMK | 61,300 MMK | 28.6% | 5% |

### 1.4 Daily sales — READY (BUILT)

Live on Sales → Daily.

| Date | Transactions | Items | Revenue | Gross profit | Margin |
|---|---|---|---|---|---|
| 2026-09-24 | 21 | 99 | 1,880,100 MMK | 468,000 MMK | 24.9% |
| 2026-09-23 | 9 | 31 | 149,000 MMK | 38,900 MMK | 26.1% |

### 1.5 By weekday — READY (BUILT)

Live on Sales → By weekday. Averages per occurrence, so a month with five
Wednesdays does not flatter Wednesday.

| Day | Days counted | Avg revenue | Avg transactions | Avg basket |
|---|---|---|---|---|
| Friday | 4 | 921,950 MMK | 9.3 | 99,134 MMK |
| Monday | 4 | 255,525 MMK | 4.0 | 63,881 MMK |

### 1.6 Receipts — READY (BUILT)

Live on Sales → Receipts, and a row opens the line items.

| Receipt | Date | Channel | Cashier | Items | Total |
|---|---|---|---|---|---|
| 924027eb | 2026-09-25 02:23 | In-store | cyclops | 1 | 45,000 MMK |
| 45981565 | 2026-09-25 00:18 | Online | — | 3 | 13,300 MMK |

Channel and cashier are only on the detail today. **BACKEND** to get them on the
list rows — the oldest item outstanding.

### 1.7 Hour of day — BACKEND

When the shop is actually busy, for staffing and opening hours.

| Hour | Transactions | Revenue | Share |
|---|---|---|---|
| 17:00–18:00 | 34 | 612,000 MMK | 18% |
| 10:00–11:00 | 6 | 88,400 MMK | 3% |

Needs sale timestamps grouped by hour in Asia/Yangon. The summary endpoint only
groups by day.

### 1.8 Payment methods — BACKEND

| Method | Transactions | Amount | Share |
|---|---|---|---|
| Cash | 78 | 2,910,000 MMK | 62% |
| KPay | 39 | 1,502,000 MMK | 32% |
| Wave | 7 | 284,000 MMK | 6% |

Not recorded at all. `POST /admin/sales` takes no payment method.

### 1.9 Discounts given — BACKEND

| Date | Receipt | Before | Discount | After | Given by |
|---|---|---|---|---|---|
| 2026-09-24 | 924027eb | 50,000 MMK | 5,000 MMK | 45,000 MMK | cyclops |

Not recorded. Same gap as payment method.

### 1.10 Sales by cashier — BACKEND

| Cashier | Transactions | Items | Revenue | Avg basket |
|---|---|---|---|---|
| cyclops | 64 | 288 | 2,914,600 MMK | 45,540 MMK |
| thesalesman | 39 | 151 | 1,488,000 MMK | 38,153 MMK |

`by_admin` exists on the sale detail but not the list, so this needs the walk or
the field moved up.

---

## 2. Stock and inventory

### 2.1 Dead stock — BACKEND (highest value unbuilt)

Cash sitting on a shelf. Products with stock that have not sold in N days.

| Item | Category | Stock | Stock value | Last sold | Days |
|---|---|---|---|---|---|
| Shen Gang က | Toy | 22 | 235,400 MMK | never | — |
| ကျားညှပ်အနက် | Accessories | 63 | 378,000 MMK | 2026-09-03 | 22 |
| **Total** | | **85** | **613,400 MMK** | | |

Needs `last_sold_at` per product. Doing it in the browser means walking 90 days
of receipts — far too slow.

### 2.2 Cost change alert — BACKEND (urgent)

The one that caught Set Kaung's T-shirt. A product whose new batch costs more
than the old one while the shelf price stays put.

| Item | Old cost | New cost | Change | Selling at | Margin now |
|---|---|---|---|---|---|
| Set Kaung's T-shirt | 10,000 MMK | 50,000 MMK | +400% | 13,300 MMK | **−73%** |

This should be a notification the day it happens, not a discovery a month later.

### 2.3 Low stock — READY (BUILT)

Live on the Dashboard and Products → Low.

| Item | Barcode | Stock | Threshold | Sells per week | Days of cover |
|---|---|---|---|---|---|
| Set Kaung's T-shirt | 54354264637 | 1 | 10 | 13 | 0.5 |
| car toy | 247987654 | 5 | 10 | 2 | 17 |

"Sells per week" and "days of cover" are the useful half and need the sales walk
— the current table shows stock against a flat threshold of 10.

### 2.4 Expiring stock — SLOW

Matters in a baby store: formula and food.

| Item | Batch | Qty left | Expires | Days left | Value at risk |
|---|---|---|---|---|---|
| Yum Earth Pop Organics | b7c1 | 18 | 2026-10-12 | 17 | 48,600 MMK |
| Baby Oral Cleanser 60pcs | a904 | 6 | 2026-11-02 | 38 | 109,560 MMK |

`expiry_date` exists on inventory batches, but only per product — 34 requests to
see it across the shop. **BACKEND** for `GET /admin/inventory?expiring_before=`.

### 2.5 Stock on hand by category — READY (BUILT)

Where the money is tied up. Live in the assistant as `stock_by_category`.

| Category | Products | Units | Retail value | Cost value |
|---|---|---|---|---|
| Toy | 9 | 214 | 2,140,000 MMK | 1,284,000 MMK |
| Clothes | 6 | 156 | 1,798,000 MMK | 1,120,000 MMK |

Cost value needs a cost on the product record — **BACKEND**.

### 2.6 Stock movement — BACKEND

Every change to a product's quantity and why.

| Date | Item | Change | Reason | By | Balance |
|---|---|---|---|---|---|
| 2026-09-24 | Fountain LAMY | +50 | Stock in | cyclops | 88 |
| 2026-09-24 | Fountain LAMY | −3 | Sale 924027eb | cyclops | 85 |
| 2026-09-23 | Fountain LAMY | −2 | Damaged | cyclops | 38 |

There is no adjustments/write-off concept at all. Without it, stock silently
drifts from reality and nobody can explain the gap.

### 2.7 Stock-in history — READY

Batches received, per product. The data is there; no screen lists it.

| Date | Item | Qty | Unit cost | Total cost | Expiry | By |
|---|---|---|---|---|---|---|
| 2026-09-24 | Set Kaung's T-shirt | 10 | 50,000 MMK | 500,000 MMK | — | cyclops |
| 2026-09-11 | Set Kaung's T-shirt | 20 | 10,000 MMK | 200,000 MMK | — | cyclops |

Two rows like these are exactly how the T-shirt problem would have been caught.

---

## 3. Customers

### 3.1 Customer list — READY (BUILT)

| Customer | Phone | Address | Joined |
|---|---|---|---|
| Kar Mine | 0969701195 | Marisa Residence | — |

`created_at` is not returned — **BACKEND**, already asked.

### 3.2 Top customers — BACKEND

| Customer | Orders | Items | Spent | Last order |
|---|---|---|---|---|
| Kar Mine | 4 | 11 | 141,800 MMK | 2026-09-25 |

Needs sales joined to users. Nothing exposes per-customer spend.

### 3.3 Customer detail — BACKEND

One customer's orders, playground visits and spend in one place. Asked for as
`GET /admin/users/{id}`.

---

## 4. Online orders

### 4.1 Order list — READY (BUILT)

| Order | Customer | Date | Amount | Status |
|---|---|---|---|---|
| ae67e218 | Kar Mine | 2026-09-25 00:25 | 60,000 MMK | Pending |
| 45981565 | Kar Mine | 2026-09-25 00:18 | 13,300 MMK | Pending |

### 4.2 Order detail and history — READY (BUILT)

| Status | When | Changed by |
|---|---|---|
| Pending | 2026-09-25 00:25 | — |
| On delivery | 2026-09-25 09:10 | cyclops |

### 4.3 Delivery performance — BACKEND

| Period | Orders | Avg pending → delivered | Still open > 3 days |
|---|---|---|---|
| September | 27 | 2.4 days | 3 |

Derivable from status history if it is exposed in a list rather than per order.

---

## 5. Playground

### 5.1 Daily ticket sales — READY (BUILT)

| Date | Paid | Free | Revenue |
|---|---|---|---|
| 2026-09-24 | 41 | 4 | 82,000 MMK |
| 2026-09-25 | 29 | 3 | 58,000 MMK |

### 5.2 Individual sales — READY (BUILT)

| Time | Customer | Tickets | Amount |
|---|---|---|---|
| Sep 25, 00:42 | Kar Mine | 1 | 0 MMK (free) |
| Sep 25, 00:32 | Kar Mine | 7 | 14,000 MMK |

Sold-by staff is missing — the endpoint joins `users`, not `admins`. **BACKEND**.

### 5.3 Free ticket cost — READY

| Period | Free tickets | Value given away | Share of tickets |
|---|---|---|---|
| September | 7 | 14,000 MMK | 9% |

What the loyalty scheme actually costs. Computable from 5.1 today.

### 5.4 Playground vs retail — READY (BUILT)

Live on Playground → Combined.

---

## 6. Staff

### 6.1 Staff list — READY (BUILT)

| Username | Role |
|---|---|
| cyclops | Manager |
| thesalesman | Sale staff |

Only two columns because that is all `AdminStaff` returns. No created date, no
last login, no way to add or remove anyone. **BACKEND**.

### 6.2 Staff activity — BACKEND

| Staff | Sales | Revenue | Tickets sold | Stock-ins | Last active |
|---|---|---|---|---|---|
| cyclops | 64 | 2,914,600 MMK | 51 | 12 | 2026-09-25 |

### 6.3 Audit log — BACKEND

Who changed a price, deleted a product, moved an order.

| When | Who | Action | Target | Before → after |
|---|---|---|---|---|
| 2026-09-24 | cyclops | Price change | Fountain LAMY | 68,000 → 72,632 MMK |
| 2026-09-24 | cyclops | Deleted | car toy | — |

---

## Summary

| Status | Count |
|---|---|
| Built and live | 12 |
| Buildable now, nobody has | 3 |
| Buildable but slow until the backend helps | 4 |
| Blocked on Set Kaung | 14 |

### The five to push him hardest on

1. **`product-performance`** — unlocks 1.1, 1.2, 1.3, 2.1, 2.3 and makes the AI fast
2. **Cost change alert (2.2)** — we are losing money on a product right now
3. **Dead stock (2.1)** — the report with the most cash attached
4. **`is_instore_sale` + cashier on sale rows** — unlocks 1.6 and 1.10, and has been asked for longest
5. **Stock adjustments (2.6)** — without it, inventory drifts and nothing explains it

### What we can build without him

- **2.7 Stock-in history** — the data is already there and no screen shows it. This is the table that would have caught the T-shirt.
- **5.3 Free ticket cost** — one division on data we already fetch
- **2.4 Expiring stock** — 34 requests today; acceptable now, not at 300 products
