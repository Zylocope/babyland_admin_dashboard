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

  const price = money(product.selling_price);
  const latestCost = latestUnitCost(batches);
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

// The newest delivery's unit cost: what restocking costs now, so it is the cost
// a discount is measured against. Null when nothing was ever received.
export const latestUnitCost = (batches) => {
  const newest = [...batches].sort((a, b) =>
    String(b.received_at ?? b.created_at).localeCompare(String(a.received_at ?? a.created_at)))[0];
  return newest ? money(newest.unit_cost) : null;
};

// How each product with stock is moving, for "what is selling badly / what
// should I discount" questions. Unlike the sales reports it starts from the
// stock list, so a product that never sold is still in it -- that is the
// product a manager most needs to hear about.
//
// products: AdminProduct[]; sold: per-product sales in the window
// ({ product_id, units, cost_mmk }); expiring: batches with stock expiring soon;
// costs: Map(product_id -> latest unit cost) for products that did not sell.
const EXPIRY_HORIZON = 60;  // days ahead an expiry counts as "soon"
const SLOW_DAYS = 180;      // more than ~6 months of stock at the current pace

export const productHealth = ({ products, sold, expiring, costs = new Map(), days, today, limit = 15 }) => {
  const soldBy = new Map(sold.map(r => [r.product_id, r]));
  const batchesBy = new Map();
  for (const b of expiring) {
    const expiry = shopDay(b.expiry_date);
    if (!expiry) continue;
    const list = batchesBy.get(b.product_id) ?? [];
    list.push({ units: b.quantity_remaining, days: daysBetween(today, expiry) });
    batchesBy.set(b.product_id, list);
  }

  const rows = products.filter(p => p.quantity_in_stock > 0).map(p => {
    const s = soldBy.get(p.id);
    const units = s?.units ?? 0;
    const rate = units / days;
    const stock = p.quantity_in_stock;
    const price = money(p.selling_price);
    const cost = costs.get(p.id) ?? (units > 0 ? money(s.cost_mmk / units) : null);
    const room = cost != null && price > 0 ? Math.floor(((price - cost) / price) * 100) : null;

    const soon = (batchesBy.get(p.id) ?? []).filter(b => b.days <= EXPIRY_HORIZON).sort((a, b) => a.days - b.days);
    const next = soon[0] ?? null;
    // At the pace of the window, does the soonest batch sell out before it expires?
    const sellsInTime = next ? rate * Math.max(next.days, 0) >= next.units : true;

    const reasons = [];
    if (next && !sellsInTime) reasons.push('expiring_unsold');
    if (units === 0) reasons.push('no_sales');
    else if (stock / rate > SLOW_DAYS) reasons.push('slow');

    // Ordered so the most urgent comes first: stock about to be thrown away,
    // then stock that never moves, then stock that moves too slowly.
    const score = reasons.includes('expiring_unsold') ? 3000 - next.days
      : reasons.includes('no_sales') ? 2000 + Math.min(999, (stock * price) / 10000)
      : reasons.includes('slow') ? 1000 + Math.min(999, stock / rate / 10)
      : 0;
    const cap = reasons.includes('expiring_unsold') ? 30 : reasons.includes('no_sales') ? 20 : 10;

    return {
      id: p.id,
      name: p.name,
      category: p.category ?? null,
      stock,
      units_sold: units,
      days_of_stock_at_current_pace: units > 0 ? Math.round(stock / rate) : null,
      next_expiry: next ? { days: next.days, units: next.units, sells_before_expiry: sellsInTime } : null,
      price_mmk: price,
      already_discounted: p.original_price != null && money(p.original_price) > price,
      latest_unit_cost_mmk: cost,
      margin_pct: room,
      max_discount_pct_without_loss: room == null ? null : Math.max(0, room),
      suggested_discount_pct: room == null ? null : Math.max(0, Math.min(cap, room)),
      stock_value_at_cost_mmk: cost == null ? null : stock * cost,
      shown_online: p.is_shown_online,
      reasons,
      score,
    };
  });

  const attention = rows.filter(r => r.reasons.length).sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const count = (reason) => attention.filter(r => r.reasons.includes(reason)).length;
  return {
    days,
    products_with_stock: rows.length,
    needs_attention: attention.length,
    counts: { expiring_unsold: count('expiring_unsold'), no_sales: count('no_sales'), slow: count('slow') },
    moving_well: rows.length - attention.length,
    // Bundling partners: the fastest sellers in the same window.
    best_sellers: [...rows].filter(r => r.units_sold > 0).sort((a, b) => b.units_sold - a.units_sold)
      .slice(0, 5).map(r => ({ name: r.name, units_sold: r.units_sold })),
    // The ranking score is internal; the model gets the reasons, not the number.
    items: attention.slice(0, limit).map(r => Object.fromEntries(Object.entries(r).filter(([k]) => k !== 'score'))),
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
