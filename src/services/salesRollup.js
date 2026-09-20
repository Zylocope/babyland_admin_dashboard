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
    // Kyat has no subunit in circulation — whole numbers only, so neither the
    // dashboard nor the AI ever reports "5,608.31 MMK".
    revenue_mmk: Math.round(acc.revenue),
    profit_mmk: Math.round(profit),
    margin_pct: acc.revenue ? round((profit / acc.revenue) * 100) : 0,
    transactions: acc.transactions,
    items_sold: acc.items_sold,
    avg_basket_mmk: acc.transactions ? Math.round(acc.revenue / acc.transactions) : 0,
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
    // Complete, never truncated. This used to keep only the last 31 dates while
    // `totals` was computed from every row, so a longer range produced a chart
    // that disagreed with its own headline: aiCharts pads every date in the
    // requested range, and a date missing from by_day is indistinguishable from
    // a date with no sales, so the dropped days were drawn as real zeros.
    // Aggregation for long ranges belongs in the chart, not here -- the reducer's
    // job is to be true.
    by_day: [...byDay.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date,
        ...close(d.all),
        in_store_mmk: close(d.in_store).revenue_mmk,
        online_mmk: close(d.online).revenue_mmk,
      })),
  };
};

// Best and worst days, as two disjoint lists.
//
// The page used to do `ranked.slice(0, 3)` and `ranked.slice(-3)`, which
// overlap whenever there are fewer than six days with sales. With four days
// the middle two appeared in BOTH panels, so the shop's best day was also
// listed as one of its worst — visible on real data, since there are only
// four days of sales.
//
// Worst starts after whatever best already took. Under four days that leaves
// it empty, which is the honest answer: you cannot name a worst day distinct
// from the best when there are three.
export const rankDays = (byDay, size = 3) => {
  const ranked = [...byDay]
    .filter(d => d.revenue_mmk > 0)
    .sort((a, b) => b.revenue_mmk - a.revenue_mmk);
  return {
    ranked,
    best: ranked.slice(0, size),
    worst: ranked.slice(Math.max(size, ranked.length - size)).reverse(),
  };
};
