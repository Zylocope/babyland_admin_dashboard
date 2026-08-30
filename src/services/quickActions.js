// The deterministic half of the assistant. These answers are built straight from
// a tool result with no model call, so they return in well under a second instead
// of the two Gemini round trips a typed question costs.
//
// Split by HOW the question was asked, not by parsing what it said: tapping a
// chip is unambiguous, so it needs no interpretation. Typed text still goes to
// the model — which is what keeps Burmese working, since keyword matching in
// Burmese is exactly where a parser would fall over.
import { format, subDays } from 'date-fns';
import { runTool } from './aiTools';

const day = (offset = 0) => format(subDays(new Date(), offset), 'yyyy-MM-dd');
const mmk = (n) => `${new Intl.NumberFormat('en-US').format(Math.round(n || 0))} MMK`;

const salesLine = (res, t) => {
  if (!res || res.note || !res.totals || res.totals.transactions === 0) return t('quick.noSales');
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
  if (!res || res.error) return t('quick.failed');
  if (!res.low_stock_count) return t('quick.noLowStock', { threshold: res.threshold });
  const rows = res.products.map(p => `- ${p.name} — ${p.stock} (${mmk(p.price_mmk)})`);
  return [t('quick.lowStockLine', {
    count: res.low_stock_count,
    total: res.total_products,
    threshold: res.threshold,
  }), ...rows].join('\n');
};

const categoriesLine = (res, t) =>
  res?.error ? t('quick.failed') : t('quick.categoriesLine', { count: res.count, list: res.categories.join(', ') });

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
    key: 'lowStock',
    labelKey: 'quick.lowStock',
    tool: 'low_stock',
    args: () => ({ threshold: 10 }),
    render: lowStockLine,
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
  return action.render(result, t);
};
