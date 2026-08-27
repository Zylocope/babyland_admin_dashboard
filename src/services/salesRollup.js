// Pure reducer over GET /admin/sales/summary rows. Kept plain JS and dependency-free
// so salesRollup.test.js runs under bare `node`.
const num = (v) => Number(v ?? 0);
const round = (n) => Math.round(n * 100) / 100;

const blank = () => ({ revenue: 0, cost: 0, transactions: 0, items_sold: 0 });

const add = (acc, r) => {
  acc.revenue += num(r.total_sale);
  acc.cost += num(r.total_cost);
  acc.transactions += r.transactions ?? 0;
  acc.items_sold += r.items_sold ?? 0;
  return acc;
};

const close = (acc) => {
  const profit = acc.revenue - acc.cost;
  return {
    revenue_mmk: round(acc.revenue),
    profit_mmk: round(profit),
    margin_pct: acc.revenue ? round((profit / acc.revenue) * 100) : 0,
    transactions: acc.transactions,
    items_sold: acc.items_sold,
    avg_basket_mmk: acc.transactions ? round(acc.revenue / acc.transactions) : 0,
  };
};

export const summarizeSales = (rows) => {
  const grand = blank();
  const inStore = blank();
  const online = blank();
  const byDay = new Map();

  for (const r of rows) {
    add(grand, r);
    add(r.is_online_sale ? online : inStore, r);

    let day = byDay.get(r.sale_date);
    if (!day) {
      day = { all: blank(), in_store: blank(), online: blank() };
      byDay.set(r.sale_date, day);
    }
    add(day.all, r);
    add(r.is_online_sale ? day.online : day.in_store, r);
  }

  return {
    totals: close(grand),
    by_channel: { in_store: close(inStore), online: close(online) },
    by_day: [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-31)
      .map(([date, d]) => ({
        date,
        ...close(d.all),
        in_store_mmk: close(d.in_store).revenue_mmk,
        online_mmk: close(d.online).revenue_mmk,
      })),
  };
};
