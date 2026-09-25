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

// The wire says is_instore_sale, and says it positively. This read used to be
// `r.is_online_sale`, a field the API has never sent — so it was undefined on
// every row, every sale fell into the in-store bucket, and the online column
// sat at zero no matter how many online sales there were. Nothing failed
// loudly: the grand total stayed correct because it does not depend on the
// split, which is why it survived so long.
//
// Anything that is not explicitly in-store counts as online, so a row that
// stops carrying the flag lands in the smaller bucket where it is noticed
// rather than quietly padding the larger one.
const isOnline = (row) => row.is_instore_sale !== true;

export const summarizeSales = (rows) => {
  const grand = blank();
  const inStore = blank();
  const online = blank();
  const byDay = new Map();

  for (const r of rows) {
    add(grand, r);
    add(isOnline(r) ? online : inStore, r);

    let day = byDay.get(r.sale_date);
    if (!day) {
      day = { all: blank(), in_store: blank(), online: blank() };
      byDay.set(r.sale_date, day);
    }
    add(day.all, r);
    add(isOnline(r) ? day.online : day.in_store, r);
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

// Sales folded onto the seven weekdays.
//
// The point is staffing: "Saturday is worth three times a Tuesday" is only
// answerable over several weeks, and a week-at-a-time chart cannot say it.
//
// Totals alone would lie. A range covering three Saturdays and two Sundays
// makes Saturday look bigger for a reason that has nothing to do with trade,
// so every figure here is an AVERAGE PER OCCURRENCE and the occurrence count
// travels with it — a weekday seen once is a data point, not a pattern, and
// the screen has to be able to say which it is.
//
// The weekday comes from the shop-day string itself, parsed as UTC. The date
// has already been resolved to the Myanmar calendar day upstream; re-reading it
// through a device clock is what would move it.
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const byWeekday = (byDay) => {
  const slots = WEEKDAYS.map((key, index) => ({
    index, key,
    days: 0, revenue_mmk: 0, transactions: 0, items_sold: 0,
  }));

  for (const day of byDay) {
    const at = new Date(`${day.date}T00:00:00Z`);
    if (Number.isNaN(at.getTime())) continue;
    const slot = slots[at.getUTCDay()];
    // Only days that traded count as occurrences. A closed Sunday averaged in
    // as a zero would report the shop as quiet on Sundays rather than shut.
    if (!(day.revenue_mmk > 0)) continue;
    slot.days += 1;
    slot.revenue_mmk += day.revenue_mmk;
    slot.transactions += day.transactions ?? 0;
    slot.items_sold += day.items_sold ?? 0;
  }

  return slots.map(s => ({
    ...s,
    avg_revenue_mmk: s.days ? s.revenue_mmk / s.days : 0,
    avg_transactions: s.days ? s.transactions / s.days : 0,
    avg_basket_mmk: s.transactions ? s.revenue_mmk / s.transactions : 0,
  }));
};
