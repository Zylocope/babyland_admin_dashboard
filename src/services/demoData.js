// Generated sales for demo mode. Products, categories and inventory are left
// alone — those are real in the database and good quality; only the sales side
// is too thin to draw a chart from (six transactions in thirty days).
//
// Deterministic on purpose. A seeded PRNG means the same numbers on every
// reload, so a screenshot taken for the report still matches the screen a week
// later, and a chart bug is reproducible instead of a one-off.
import { shopToday, shopDaysAgo } from '../utils/shopDay.js';

// mulberry32 — small, fast, and stable across engines, which matters because
// Math.random() would reshuffle the whole dataset on every render.
const rng = (seed) => () => {
  seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const DAYS = 120;
// Money crosses the wire as a string everywhere in this API (the backend holds
// Decimal), so the mock has to match or the parsing paths differ from real use.
const money = (n) => String(Math.round(n));

// A day index that repeats weekly: weekends busier, Monday quiet. Without this
// the chart is noise, and sales_by_weekday has nothing to show.
const WEEKDAY_WEIGHT = [0.7, 0.85, 0.9, 1.0, 1.25, 1.6, 1.45]; // Sun..Sat

const dayRows = () => {
  const rows = [];
  for (let back = DAYS - 1; back >= 0; back--) {
    const date = shopDaysAgo(back);
    const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
    const r = rng(Number(date.replace(/-/g, '')));

    // A closed day now and then: a flat stretch is real information, and it is
    // the case that used to be drawn as a fake zero.
    if (r() < 0.05) continue;

    const weight = WEEKDAY_WEIGHT[weekday] * (0.75 + r() * 0.5);

    for (const online of [false, true]) {
      // Online is a minority channel and not every day has one.
      const base = online ? 1.4 : 5.2;
      const transactions = Math.max(0, Math.round(base * weight * (online ? r() * 1.6 : 1)));
      if (transactions === 0) continue;

      const itemsPerSale = 1 + r() * 2.4;
      const items_sold = Math.max(transactions, Math.round(transactions * itemsPerSale));
      const avg = (online ? 34000 : 26000) * (0.7 + r() * 0.7);
      const total_sale = transactions * avg;
      // Margin drifts around the mid-thirties, which is where the real six
      // transactions currently sit (33.26%).
      const marginPct = 0.28 + r() * 0.14;
      const total_cost = total_sale * (1 - marginPct);
      const margin = total_sale - total_cost;

      rows.push({
        sale_date: date,
        is_online_sale: online,
        transactions,
        items_sold,
        total_sale: money(total_sale),
        total_cost: money(total_cost),
        margin: money(margin),
        margin_percentage: (marginPct * 100).toFixed(2),
        avg_basket: money(total_sale / transactions),
      });
    }
  }
  return rows;
};

// Built once per session, not per request: the Sales screen, the header figure
// and every assistant tool must agree with each other.
let cache = null;
const allRows = () => (cache ??= dayRows());

export const demoSaleSummary = (startDate, endDate) => {
  const start = startDate || shopDaysAgo(29);
  const end = endDate || shopToday();
  return allRows().filter(r => r.sale_date >= start && r.sale_date <= end);
};

// The receipt list. Derived from the same day rows so the totals on the Sales
// screen cannot disagree with the receipts underneath them.
export const demoSales = (page = 1, pageSize = 10) => {
  const receipts = [];
  for (const row of allRows()) {
    const r = rng(Number(row.sale_date.replace(/-/g, '')) + (row.is_online_sale ? 7 : 3));
    const each = Number(row.total_sale) / row.transactions;
    for (let i = 0; i < row.transactions; i++) {
      const hour = 9 + Math.floor(r() * 11);
      const minute = Math.floor(r() * 60);
      receipts.push({
        id: `demo-${row.sale_date}-${row.is_online_sale ? 'on' : 'in'}-${i}`,
        created_at: `${row.sale_date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`,
        total_amount: money(each * (0.8 + r() * 0.4)),
      });
    }
  }
  receipts.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const total_items = receipts.length;
  const from = (page - 1) * pageSize;
  return {
    current_page: page,
    data: receipts.slice(from, from + pageSize),
    total_items,
    total_pages: Math.max(1, Math.ceil(total_items / pageSize)),
  };
};
