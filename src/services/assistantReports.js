// Pure reducers behind two assistant tools. Plain JS so they run under bare node
// in their test, like salesRollup.js.
import { parseApiDate } from '../utils/apiDate.js';
import { shopToday } from '../utils/shopDay.js';

const money = (v) => Math.round(Number(v ?? 0) || 0);
const shopDay = (iso) => {
  const at = parseApiDate(iso);
  return at ? shopToday(at) : null;
};
const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);

// One product's stock, batch by batch. Only batches still holding stock are
// listed; emptied ones are history, not stock. The newest batch's cost is what
// the next delivery is likely to cost, so it is the one compared with the price.
export const stockDetail = (product, batches, today) => {
  const live = batches
    .filter(b => b.quantity_remaining > 0)
    .map(b => {
      const expiry = b.expiry_date ? shopDay(b.expiry_date) : null;
      return {
        received: shopDay(b.received_at ?? b.created_at),
        remaining: b.quantity_remaining,
        received_qty: b.quantity_received,
        unit_cost_mmk: money(b.unit_cost),
        expiry_date: expiry,
        days_to_expiry: expiry ? daysBetween(today, expiry) : null,
      };
    })
    .sort((a, b) => String(a.received).localeCompare(String(b.received)));

  const newest = [...batches].sort((a, b) =>
    String(b.received_at ?? b.created_at).localeCompare(String(a.received_at ?? a.created_at)))[0];
  const price = money(product.selling_price);
  const latestCost = newest ? money(newest.unit_cost) : null;
  const expiring = live.filter(b => b.days_to_expiry != null).sort((a, b) => a.days_to_expiry - b.days_to_expiry);

  return {
    stock: live.reduce((n, b) => n + b.remaining, 0),
    stock_value_at_cost_mmk: live.reduce((n, b) => n + b.remaining * b.unit_cost_mmk, 0),
    selling_price_mmk: price,
    latest_unit_cost_mmk: latestCost,
    latest_margin_pct: latestCost != null && price > 0 ? Math.round(((price - latestCost) / price) * 1000) / 10 : null,
    selling_below_latest_cost: latestCost != null && price < latestCost,
    next_expiry: expiring[0] ? { date: expiring[0].expiry_date, days: expiring[0].days_to_expiry, units: expiring[0].remaining } : null,
    units_without_expiry_date: live.filter(b => b.expiry_date == null).reduce((n, b) => n + b.remaining, 0),
    batches: live,
  };
};

// Sales in a shop-day range, split by channel and by the staff member who rang
// them up. Online sales have no cashier.
export const salesBreakdown = (sales, start, end) => {
  const inRange = sales.filter(s => {
    const day = shopDay(s.created_at);
    return day && day >= start && day <= end;
  });
  const add = (map, key, amount) => {
    const row = map.get(key) ?? { sales: 0, revenue_mmk: 0 };
    row.sales += 1;
    row.revenue_mmk += amount;
    map.set(key, row);
  };
  const channels = new Map();
  const cashiers = new Map();
  for (const s of inRange) {
    const amount = money(s.total_amount);
    add(channels, s.is_instore_sale ? 'in_store' : 'online', amount);
    if (s.is_instore_sale) add(cashiers, s.by_admin?.username ?? 'unknown', amount);
  }
  const rows = (map, label) => [...map.entries()]
    .map(([key, v]) => ({ [label]: key, ...v, average_sale_mmk: Math.round(v.revenue_mmk / v.sales) }))
    .sort((a, b) => b.revenue_mmk - a.revenue_mmk);
  return {
    sales: inRange.length,
    revenue_mmk: inRange.reduce((n, s) => n + money(s.total_amount), 0),
    by_channel: rows(channels, 'channel'),
    by_cashier: rows(cashiers, 'cashier'),
  };
};

// Batches about to expire, soonest first, each with the shop days left. The
// backend already filters to batches with stock that expire within the window.
export const expiringSoon = (rows, today) => {
  const batches = rows
    .map(r => {
      const expiry = shopDay(r.expiry_date);
      return {
        product: r.product_name,
        batch: String(r.batch_id).slice(0, 8),
        units_left: r.quantity_remaining,
        expiry_date: expiry,
        days_left: expiry ? daysBetween(today, expiry) : null,
      };
    })
    .sort((a, b) => (a.days_left ?? 1e9) - (b.days_left ?? 1e9));
  return {
    batches: batches.length,
    units: batches.reduce((n, b) => n + b.units_left, 0),
    products: new Set(rows.map(r => r.product_id)).size,
    items: batches,
  };
};
