// Batches across the whole catalogue, and what changed between them.
//
// `GET /admin/inventory/{product_id}` is per product, so a shop-wide view costs
// one request per product — 34 today, which is fine, and won't be at 300. Same
// N+1 shape as the receipt walk and the same plan: `GET /admin/inventory` with
// a date filter is on Set Kaung's list, and when it lands this file loses its
// walk and keeps its arithmetic.
//
// The arithmetic is the valuable half. A product bought at 10,000 and rebought
// at 50,000 while the shelf price stayed at 13,300 lost 437,100 MMK before
// anyone noticed, because nothing in the system compares one batch to the one
// before it.
const CONCURRENCY = 5;

const money = (v) => Number(v ?? 0) || 0;

// Newest first. `received_at` is when stock actually arrived; `created_at` is
// when someone typed it in, and those differ when a delivery is entered late.
const byNewest = (a, b) =>
  String(b.received_at ?? b.created_at ?? '').localeCompare(String(a.received_at ?? a.created_at ?? ''));

export const loadBatches = async ({ products, fetchRecords }) => {
  const out = [];
  let failed = 0;

  for (let i = 0; i < products.length; i += CONCURRENCY) {
    const batch = await Promise.all(
      products.slice(i, i + CONCURRENCY).map(async (p) => {
        try {
          const res = await fetchRecords(p.id, { page: 1, page_size: 50 });
          const rows = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []);
          return rows.map(r => ({
            id: r.id,
            product_id: p.id,
            name: p.name,
            selling_price: money(p.selling_price),
            unit_cost: money(r.unit_cost),
            quantity_received: Number(r.quantity_received) || 0,
            quantity_remaining: Number(r.quantity_remaining) || 0,
            received_at: r.received_at ?? r.created_at ?? null,
            expiry_date: r.expiry_date ?? null,
          }));
        } catch {
          return null;
        }
      })
    );
    for (const rows of batch) {
      if (rows === null) failed += 1;
      else out.push(...rows);
    }
  }

  return { batches: out.sort(byNewest), failed };
};

// Products whose newest batch cost differs from the one before it.
//
// This is forward-looking risk, not realised loss. Under FIFO the older cheaper
// stock is still being sold, so the margin only turns once that runs out — the
// realised figure lives on the sale lines and is a different number. Saying
// otherwise overstates it, which is the mistake worth not making in an alert.
export const costChanges = (batches, { minPct = 10 } = {}) => {
  const perProduct = new Map();
  for (const b of batches) {
    if (!perProduct.has(b.product_id)) perProduct.set(b.product_id, []);
    perProduct.get(b.product_id).push(b);
  }

  const changes = [];
  for (const rows of perProduct.values()) {
    if (rows.length < 2) continue;              // nothing to compare against
    const [latest, previous] = rows;            // already newest-first
    if (!previous.unit_cost) continue;          // a zero old cost makes the percentage meaningless
    const changePct = ((latest.unit_cost - previous.unit_cost) / previous.unit_cost) * 100;
    if (Math.abs(changePct) < minPct) continue;

    const margin = latest.selling_price
      ? ((latest.selling_price - latest.unit_cost) / latest.selling_price) * 100
      : null;

    changes.push({
      product_id: latest.product_id,
      name: latest.name,
      old_cost: previous.unit_cost,
      new_cost: latest.unit_cost,
      change_pct: changePct,
      selling_price: latest.selling_price,
      // Negative means the next sale loses money at the current shelf price.
      margin_pct: margin,
      received_at: latest.received_at,
    });
  }

  // Losing money first, then the biggest jumps. A rise that still leaves a
  // healthy margin is information; one that goes negative is a decision.
  return changes.sort((a, b) => {
    const aBad = a.margin_pct != null && a.margin_pct < 0;
    const bBad = b.margin_pct != null && b.margin_pct < 0;
    if (aBad !== bBad) return aBad ? -1 : 1;
    return Math.abs(b.change_pct) - Math.abs(a.change_pct);
  });
};
