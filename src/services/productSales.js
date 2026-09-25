// Per-product sales, assembled in the browser from receipts.
//
// The backend has no endpoint for this. `GET /admin/sales` lists sales without
// their line items, and only `GET /admin/sales/{id}` carries them — so the only
// way to learn what SOLD, as opposed to how much money came in, is to open
// every receipt in the range. That is an N+1, and it is here under protest:
// when /admin/sales/top-products lands, this file is deleted and the two tools
// that use it call that instead.
//
// It is usable today because the window is bounded and the walk is concurrent.
// Measured against the live backend: a receipt takes about half a second, so a
// week is a couple of seconds and a month is about ten. The assistant's tool
// budget is ninety.
//
// Concurrency is deliberately modest. The backend runs a tower_governor rate
// limiter whose burst size we do not control, and a 429 in the middle of a walk
// would produce a half-built answer — which is worse than a slow one.
const CONCURRENCY = 5;

// The hard stop. Never silently: `truncated` travels with the result and the
// tool description tells the model to say so. A ranking built from part of the
// range that presents itself as the whole range is the exact bug this codebase
// has shipped before — a capped list feeding a total that still looked right.
const MAX_RECEIPTS = 400;

const inRange = (iso, start, end) => {
  const day = String(iso).slice(0, 10);
  return day >= start && day <= end;
};

// Walks the sales list, keeps the ids inside the range, then opens them.
export const productSales = async ({ start, end, listSales, loadSale }) => {
  const ids = [];
  let page = 1;
  let scanned = 0;

  for (;;) {
    const res = await listSales(page, 200);
    const rows = Array.isArray(res?.data) ? res.data : [];
    const pages = Math.max(1, Number(res?.total_pages ?? 1) || 1);
    for (const row of rows) {
      scanned += 1;
      if (inRange(row.created_at, start, end)) ids.push(row.id);
    }
    page += 1;
    if (page > pages || ids.length >= MAX_RECEIPTS) break;
  }

  const truncated = ids.length > MAX_RECEIPTS;
  const wanted = ids.slice(0, MAX_RECEIPTS);

  const byProduct = new Map();
  let receipts = 0;
  let failed = 0;

  for (let i = 0; i < wanted.length; i += CONCURRENCY) {
    const batch = await Promise.all(
      wanted.slice(i, i + CONCURRENCY).map(id => loadSale(id).catch(() => null))
    );
    for (const sale of batch) {
      if (!sale) { failed += 1; continue; }
      receipts += 1;
      for (const item of sale.sale_items ?? []) {
        const key = item.product_id;
        let row = byProduct.get(key);
        if (!row) {
          row = { product_id: key, name: item.product_name, units: 0, revenue_mmk: 0, cost_mmk: 0 };
          byProduct.set(key, row);
        }
        const qty = Number(item.quantity) || 0;
        row.units += qty;
        row.revenue_mmk += qty * (Number(item.selling_price) || 0);
        row.cost_mmk += qty * (Number(item.cost_price) || 0);
      }
    }
  }

  const rows = [...byProduct.values()]
    .map(r => ({ ...r, profit_mmk: r.revenue_mmk - r.cost_mmk }))
    .sort((a, b) => b.units - a.units);

  return { rows, receipts, scanned, failed, truncated };
};

// Same walk, folded onto categories. The category is not on the sale line, so
// it is joined from the product catalogue by id; anything sold that no longer
// has a catalogue entry is grouped honestly rather than dropped.
export const categorySales = (rows, products) => {
  const category = new Map(products.map(p => [p.id, p.category ?? null]));
  const totals = new Map();

  for (const row of rows) {
    const key = category.get(row.product_id) ?? 'Uncategorised';
    let acc = totals.get(key);
    if (!acc) {
      acc = { category: key, units: 0, revenue_mmk: 0, profit_mmk: 0, products: 0 };
      totals.set(key, acc);
    }
    acc.units += row.units;
    acc.revenue_mmk += row.revenue_mmk;
    acc.profit_mmk += row.profit_mmk;
    acc.products += 1;
  }

  return [...totals.values()].sort((a, b) => b.revenue_mmk - a.revenue_mmk);
};
