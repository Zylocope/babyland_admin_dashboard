// The deterministic half of the assistant. These answers are built straight from
// a tool result with no model call, so they return in well under a second instead
// of the two Gemini round trips a typed question costs.
//
// Split by HOW the question was asked, not by parsing what it said: tapping a
// chip is unambiguous, so it needs no interpretation. Typed text still goes to
// the model — which is what keeps Burmese working, since keyword matching in
// Burmese is exactly where a parser would fall over.
import { shopDaysAgo } from '../utils/shopDay.js';
import { runTool } from './aiTools';
import { chartFromTool } from './aiCharts';
import { classifyReport, isFailed } from './reportState.js';

const day = (offset = 0) => shopDaysAgo(offset);
const mmk = (n) => `${new Intl.NumberFormat('en-US').format(Math.round(n || 0))} MMK`;

const salesLine = (res, t) => {
  // Failure and emptiness are different answers. A request that never landed has
  // no `totals`, which used to fall through to "no sales" -- a manager reading a
  // broken connection as a quiet day.
  if (isFailed(res)) return t('quick.failed');
  if (res.note || !res.totals || res.totals.transactions === 0) return t('quick.noSales');
  const { totals, by_channel: ch } = res;
  const lines = [
    t('quick.salesLine', {
      revenue: mmk(totals.revenue_mmk),
      profit: mmk(totals.profit_mmk),
      margin: totals.margin_pct,
    }),
    t('quick.salesCounts', {
      txns: totals.transactions,
      items: totals.items_sold,
      basket: mmk(totals.avg_basket_mmk),
    }),
  ];
  if (ch?.online?.revenue_mmk > 0) {
    lines.push(t('quick.salesChannels', {
      instore: mmk(ch.in_store.revenue_mmk),
      online: mmk(ch.online.revenue_mmk),
    }));
  }
  return lines.join('\n');
};

const lowStockLine = (res, t) => {
  if (isFailed(res)) return t('quick.failed');
  if (!res.low_stock_count) return t('quick.noLowStock', { threshold: res.threshold });
  const rows = res.products.map(p => `- ${p.name} — ${p.stock} (${mmk(p.price_mmk)})`);
  return [t('quick.lowStockLine', {
    count: res.low_stock_count,
    total: res.total_products,
    threshold: res.threshold,
  }), ...rows].join('\n');
};

const compareLine = (res, t) => {
  if (isFailed(res) || !res.current) return t('quick.failed');
  const { current: c, previous: p, change_pct: d } = res;
  const arrow = (v) => (v === null ? '' : v > 0 ? `▲ ${v}%` : v < 0 ? `▼ ${Math.abs(v)}%` : '= 0%');
  return [
    `${t('aiChart.current')}: ${c.range.start} – ${c.range.end}\n${t('aiChart.previous')}: ${p.range.start} – ${p.range.end}`,
    t('quick.compareRevenue', { current: mmk(c.revenue_mmk), previous: mmk(p.revenue_mmk), change: arrow(d.revenue) }),
    t('quick.compareProfit', { current: mmk(c.profit_mmk), previous: mmk(p.profit_mmk), change: arrow(d.profit) }),
    t('quick.compareTxns', { current: c.transactions, previous: p.transactions, change: arrow(d.transactions) }),
  ].join('\n');
};

const stockValueLine = (res, t) => {
  if (isFailed(res) || !res.categories?.length) return t('quick.failed');
  const total = res.categories.reduce((sum, c) => sum + c.retail_value_mmk, 0);
  const rows = res.categories.slice(0, 8).map(c => `- ${c.category} — ${mmk(c.retail_value_mmk)} (${c.units})`);
  return [t('quick.stockValueLine', { total: mmk(total), products: res.total_products }), ...rows].join('\n');
};

// Most profitable first, then anything sold at a loss: the two things an owner
// acts on. Loss-makers are listed even when they are not in the top five.
const profitLine = (res, t) => {
  if (isFailed(res)) return t('quick.failed');
  const rows = res.products ?? [];
  if (!rows.length) return t('quick.noSales');
  const line = p => `- ${p.name} — ${mmk(p.profit_mmk)} (${p.margin_pct}%)`;
  const losing = rows.filter(p => p.profit_mmk < 0);
  const out = [
    t('quick.profitTop'),
    ...rows.filter(p => p.profit_mmk >= 0).slice(0, 5).map(line),
  ];
  if (losing.length) out.push(t('quick.profitLosing', { count: losing.length }), ...losing.map(line));
  if (res.covers_whole_range === false) out.push(t('quick.partial'));
  return out.join('\n');
};

const expiringLine = (res, t) => {
  if (isFailed(res)) return t('quick.failed');
  if (!res.batches) return t('quick.noExpiring', { days: res.days });
  const rows = res.items.map(b => `- ${b.product} — ${b.units_left} (${b.expiry_date}, ${t('quick.daysLeft', { count: b.days_left })})`);
  return [t('quick.expiringLine', { batches: res.batches, units: res.units, days: res.days }), ...rows].join('\n');
};

// One line per product to act on: why it needs attention, then how far the
// price can drop before it sells at a loss.
const discountLine = (res, t) => {
  if (isFailed(res)) return t('quick.failed');
  if (!res.needs_attention) return t('quick.noDiscount', { days: res.days });
  const why = (i) => {
    if (i.reasons.includes('expiring_unsold')) return t('quick.reasonExpiring', { units: i.next_expiry.units, days: i.next_expiry.days });
    if (i.reasons.includes('no_sales')) return t('quick.reasonNoSales', { days: res.days, stock: i.stock });
    return t('quick.reasonSlow', { stock: i.stock, months: Math.round(i.days_of_stock_at_current_pace / 30) });
  };
  const offer = (i) => (i.max_discount_pct_without_loss > 0
    ? t('quick.upTo', { pct: i.max_discount_pct_without_loss })
    : t('quick.noRoom'));
  const rows = res.items.map(i => `- ${i.name} — ${why(i)} → ${offer(i)}`);
  const out = [t('quick.discountLine', { count: res.needs_attention, days: res.days }), ...rows];
  if (res.covers_whole_range === false) out.push(t('quick.partial'));
  return out.join('\n');
};

const categoriesLine = (res, t) =>
  isFailed(res) ? t('quick.failed') : t('quick.categoriesLine', { count: res.count, list: res.categories.join(', ') });

export const QUICK_ACTIONS = [
  {
    key: 'today',
    labelKey: 'quick.today',
    tool: 'sales_summary',
    args: () => ({ start_date: day(0), end_date: day(0) }),
    render: salesLine,
  },
  {
    key: 'week',
    labelKey: 'quick.week',
    tool: 'sales_summary',
    args: () => ({ start_date: day(6), end_date: day(0) }),
    render: salesLine,
  },
  {
    key: 'month',
    labelKey: 'quick.month',
    tool: 'sales_summary',
    args: () => ({ start_date: day(29), end_date: day(0) }),
    render: salesLine,
  },
  {
    key: 'profit',
    labelKey: 'quick.profit',
    tool: 'product_performance',
    args: () => ({ start_date: day(29), end_date: day(0), sort: 'profit', order: 'desc', limit: 50 }),
    render: profitLine,
  },
  {
    key: 'expiring',
    labelKey: 'quick.expiring',
    tool: 'expiring_soon',
    args: () => ({ days: 30 }),
    render: expiringLine,
  },
  {
    key: 'discount',
    labelKey: 'quick.discount',
    tool: 'product_health',
    args: () => ({ days: 90, limit: 10 }),
    render: discountLine,
  },
  {
    key: 'lowStock',
    labelKey: 'quick.lowStock',
    tool: 'low_stock',
    args: () => ({ threshold: 10 }),
    render: lowStockLine,
  },
  {
    key: 'compare',
    labelKey: 'quick.compare',
    tool: 'compare_periods',
    args: () => ({ period: 'month' }),
    render: compareLine,
  },
  {
    key: 'stockValue',
    labelKey: 'quick.stockValue',
    tool: 'stock_by_category',
    args: () => ({}),
    render: stockValueLine,
  },
  {
    key: 'categories',
    labelKey: 'quick.categories',
    tool: 'list_categories',
    args: () => ({}),
    render: categoriesLine,
  },
];

export const runQuickAction = async (action, t) => {
  const result = await runTool(action.tool, action.args());
  // status travels with the text so the caller can offer Retry on a failure
  // without re-parsing the rendered string to guess what happened.
  return {
    // Tools name the range either start/end or start_date/end_date.
    text: [result.range ? `${result.range.start ?? result.range.start_date} – ${result.range.end ?? result.range.end_date}` : '', action.render(result, t)].filter(Boolean).join('\n'),
    chart: chartFromTool(action.tool, result),
    status: classifyReport(result),
  };
};
