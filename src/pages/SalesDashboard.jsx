import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconCash, IconReportMoney, IconReceipt, IconShoppingBag, IconPackage,
  IconDatabase, IconChartHistogram, IconCalendarStats, IconTrophy, IconTicket, IconPrinter,
  IconCalendarWeek
} from '@tabler/icons-react';
import { Area, Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatCard from '../components/common/StatCard';
import SubBar from '../components/common/SubBar';
import ChartLegend from '../components/common/ChartLegend';
import ReportDialog from '../components/common/ReportDialog';
import PrintSheet from '../components/common/PrintSheet';
import { formatMMK, formatMMKShort } from '../utils/currency';
import { downloadCsvSections } from '../utils/csv';
import { downloadExcelWorkbook } from '../utils/excel';
import { colorAt, seriesColor } from '../utils/chartPalette';
import { useTheme } from '../context/ThemeContext';
import { parseApiDate } from '../utils/apiDate';
import { useAuth } from '../context/AuthContext';
import { getSaleSummary, getSales, getSaleDetail } from '../services/salesService';
import ReceiptDialog from '../components/common/ReceiptDialog';
import { productSales } from '../services/productSales';
import { summarizeSales, rankDays, byWeekday } from '../services/salesRollup';
import { formatShopTime, shopToday, shopDaysAgo, shopDayStart } from '../utils/shopDay';
import PlaygroundAnalytics from '../components/playground/PlaygroundAnalytics';

const PERIODS = ['today', 'week', 'month'];
const PERIOD_DAYS = { today: 1, week: 7, month: 30 };
const RECEIPT_PAGE = 100;
function SalesTooltip({ active, payload, label, inStoreLabel, onlineLabel, totalLabel }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  return (
    <div className="chart-tooltip min-w-48">
      <p className="text-xs font-semibold text-ink mb-2">{label}</p>
      <div className="space-y-1.5 text-xs">
        <p className="flex justify-between gap-5 text-sub"><span>{inStoreLabel}</span><strong className="text-ink tabular-nums">{formatMMK(row[inStoreLabel])}</strong></p>
        <p className="flex justify-between gap-5 text-sub"><span>{onlineLabel}</span><strong className="text-ink tabular-nums">{formatMMK(row[onlineLabel])}</strong></p>
        <p className="flex justify-between gap-5 pt-1.5 border-t border-app text-sub"><span>{totalLabel}</span><strong className="text-brand tabular-nums">{formatMMK(row.total)}</strong></p>
      </div>
    </div>
  );
}

function periodToDates(period) {
  const end = shopToday();
  return { start: shopDaysAgo(PERIOD_DAYS[period] - 1, shopDayStart(end)), end };
}

function Empty({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-mute text-sm gap-2">
      <IconDatabase size={28} stroke={1.2} />
      {label}
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="surface-card p-5">
      <h3 className="text-[13px] font-semibold text-ink mb-3">{title}</h3>
      {children}
    </div>
  );
}

// One table renderer for every view — columns carry both the cell and the CSV value.
function DataTable({ columns, rows, empty, onRowClick }) {
  if (!rows.length) return <Empty label={empty} />;
  return (
    // Header matches the Products list: a quiet tinted strip, not a filled
    // brand-coloured bar. The panel around this already draws the container,
    // so the table adds no border of its own.
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-app bg-base/55 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-mute">
            {columns.map(c => (
              <th key={c.key} className={`px-4 py-3.5 font-semibold ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-app">
          {rows.map((row, i) => (
            <tr key={row._key ?? i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`hover:bg-brand-light transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}>
              {columns.map(c => (
                <td key={c.key} className={`px-4 py-3 text-ink tabular-nums ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {c.cell ? c.cell(row) : c.value(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SalesDashboard() {
  const { t } = useTranslation();
  const { isManager } = useAuth();
  const { darkMode } = useTheme();
  const [source, setSource] = useState('retail');
  const [view, setView] = useState('channel');
  const [period, setPeriod] = useState('week');
  const [records, setRecords] = useState([]);
  const [receipts, setReceipts] = useState({ data: [], total: 0 });
  const [openReceipt, setOpenReceipt] = useState(null);
  // What actually sold, as opposed to how much came in. The sale list carries
  // no line items, so this opens every receipt in the period — which is why it
  // only runs when the view is actually looked at, not on page load.
  const [sold, setSold] = useState({ key: '', rows: [], partial: false, error: '' });
  const [loading, setLoading] = useState(true);

  const { start, end } = useMemo(() => periodToDates(period), [period]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      getSaleSummary({ start_date: start, end_date: end }).catch(() => []),
      getSales(1, RECEIPT_PAGE).catch(() => ({ data: [], total_items: 0 })),
    ])
      .then(([summary, sales]) => {
        if (!active) return;
        setRecords(Array.isArray(summary) ? summary : []);
        setReceipts({ data: sales?.data ?? [], total: sales?.total_items ?? 0 });
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [start, end]);

  const s = useMemo(() => summarizeSales(records), [records]);
  const { totals, by_channel: ch } = s;

  const inStoreLabel = t('posDash.chInstore');
  const onlineLabel = t('posDash.chOnline');

  const chart = useMemo(() => {
    const byDate = new Map(s.by_day.map(d => [d.date, d]));
    const days = PERIOD_DAYS[period];
    return Array.from({ length: days }, (_, i) => {
      const date = shopDaysAgo(days - 1 - i, shopDayStart(end));
      const row = byDate.get(date);
      return {
        day: formatShopTime(shopDayStart(date), 'MMM D'),
        [inStoreLabel]: row?.in_store_mmk ?? 0,
        [onlineLabel]: row?.online_mmk ?? 0,
        total: row?.revenue_mmk ?? 0,
      };
    });
  }, [s, period, end, inStoreLabel, onlineLabel]);

  // The sales list has no date filter server-side, so the period is applied here.
  const soldKey = `${start}|${end}`;
  useEffect(() => {
    if (view !== 'products' || sold.key === soldKey) return undefined;
    let active = true;
    productSales({ start, end, listSales: getSales, loadSale: getSaleDetail })
      .then(out => {
        if (!active) return;
        setSold({ key: soldKey, rows: out.rows, partial: out.truncated || out.failed > 0, error: '' });
      })
      .catch(err => {
        if (active) setSold({ key: soldKey, rows: [], partial: false, error: err?.message || '' });
      });
    return () => { active = false; };
  }, [view, soldKey, sold.key, start, end]);

  const periodReceipts = useMemo(() => {
    const from = shopDayStart(start);
    const to = shopDayStart(shopDaysAgo(-1, shopDayStart(end)));
    return receipts.data
      .map(r => ({ ...r, _key: r.id, _at: parseApiDate(r.created_at) }))
      .filter(r => r._at && r._at >= from && r._at < to)
      .sort((a, b) => b._at - a._at);
  }, [receipts, start, end]);

  const { ranked, best, worst } = useMemo(() => rankDays(s.by_day), [s]);

  const posPct = totals.revenue_mmk ? Math.round((ch.in_store.revenue_mmk / totals.revenue_mmk) * 100) : 0;
  // Seeded at 0, not -1: with no sales at all every total ties, and the old
  // seed made the first day of the range read as the peak.
  const peakDay = chart.reduce((best, row) => (row.total > (best?.total ?? 0) ? row : best), null);
  // The stack separator and the second series only make sense when online sales
  // exist. With a single segment the 2px stroke just eats into thin bars, and at
  // 30 days the bars are thin.
  const hasOnline = chart.some(row => Number(row[onlineLabel]) > 0);
  const barRadius = chart.length > 14 ? 3 : 5;
  const show = (v) => (loading ? '...' : v);
  const [reportOpen, setReportOpen] = useState(false);
  const [printing, setPrinting] = useState(null);

  const VIEWS = [
    { key: 'channel', label: t('salesViews.channel'), icon: IconChartHistogram },
    { key: 'receipts', label: t('salesViews.receipts'), icon: IconReceipt },
    { key: 'daily', label: t('salesViews.daily'), icon: IconCalendarStats },
    { key: 'bestworst', label: t('salesViews.bestworst'), icon: IconTrophy },
    { key: 'weekday', label: t('salesViews.weekday'), icon: IconCalendarWeek },
    { key: 'products', label: t('salesViews.products'), icon: IconPackage },
  ];

  // Buying and selling price per unit, averaged over what actually sold in the
  // period. Neither is on the product record — selling_price is the current
  // shelf price and there is no cost on it at all — so these come from the sale
  // lines, which store both as they were at the moment of sale. That is also
  // the only way a price change mid-period shows up honestly.
  const perUnit = (total, units) => (units ? Math.round(total / units) : 0);
  const soldCols = [
    { key: 'name', label: t('table.item'), value: r => r.name },
    { key: 'units', label: t('salesTable.unitsSold'), align: 'right', value: r => r.units },
    { key: 'buy', label: t('salesTable.buyPrice'), align: 'right',
      value: r => formatMMK(perUnit(r.cost_mmk, r.units)) },
    { key: 'sell', label: t('salesTable.sellPrice'), align: 'right',
      value: r => formatMMK(perUnit(r.revenue_mmk, r.units)) },
    { key: 'revenue', label: t('posDash.revenue'), align: 'right', value: r => formatMMK(Math.round(r.revenue_mmk)) },
    // A product sold below cost is the whole reason to look at this table, so
    // it is coloured rather than left as one number among six.
    { key: 'profit', label: t('posDash.profit'), align: 'right',
      value: r => formatMMK(Math.round(r.profit_mmk)),
      cell: r => (
        <span style={r.profit_mmk < 0 ? { color: 'var(--status-cancelled)', fontWeight: 600 } : undefined}>
          {formatMMK(Math.round(r.profit_mmk))}
        </span>
      ) },
  ];

  const receiptCols = [
    // text: a receipt id is an identifier, not a number.
    { key: 'id', label: t('salesTable.receipt'), value: r => r.id, text: true, cell: r => <span className="font-mono text-xs text-brand">{r.id.slice(0, 8)}</span> },
    { key: 'date', label: t('salesTable.date'), value: r => formatShopTime(r._at, 'YYYY-MM-DD') },
    { key: 'time', label: t('salesTable.time'), value: r => formatShopTime(r._at, 'HH:mm') },
    { key: 'amount', label: t('salesTable.amount'), align: 'right', value: r => Number(r.total_amount), cell: r => formatMMK(Number(r.total_amount)) },
  ];

  const dailyCols = [
    { key: 'date', label: t('salesTable.date'), value: d => d.date },
    { key: 'revenue', label: t('posDash.revenue'), align: 'right', value: d => d.revenue_mmk, cell: d => formatMMK(d.revenue_mmk) },
    { key: 'profit', label: t('posDash.profit'), align: 'right', value: d => d.profit_mmk, cell: d => formatMMK(d.profit_mmk) },
    { key: 'margin', label: t('salesTable.marginCol'), align: 'right', value: d => d.margin_pct, cell: d => `${d.margin_pct}%` },
    { key: 'txns', label: t('posDash.txns'), align: 'right', value: d => d.transactions },
    { key: 'items', label: t('posDash.items'), align: 'right', value: d => d.items_sold },
    { key: 'instore', label: inStoreLabel, align: 'right', value: d => d.in_store_mmk, cell: d => formatMMK(d.in_store_mmk) },
    { key: 'online', label: onlineLabel, align: 'right', value: d => d.online_mmk, cell: d => formatMMK(d.online_mmk) },
  ];

  const channelCols = [
    { key: 'metric', label: t('posDash.metric'), value: r => r.label },
    { key: 'instore', label: inStoreLabel, align: 'right', value: r => r.fmt(ch.in_store[r.field]), cell: r => show(r.fmt(ch.in_store[r.field])) },
    { key: 'online', label: onlineLabel, align: 'right', value: r => r.fmt(ch.online[r.field]), cell: r => show(r.fmt(ch.online[r.field])) },
    { key: 'total', label: t('posDash.totalCol'), align: 'right', value: r => r.fmt(totals[r.field]), cell: r => show(r.fmt(totals[r.field])) },
  ];

  const channelRows = [
    { _key: 'revenue', label: t('posDash.revenue'), field: 'revenue_mmk', fmt: formatMMK },
    { _key: 'profit', label: t('posDash.profit'), field: 'profit_mmk', fmt: formatMMK },
    { _key: 'txns', label: t('posDash.txns'), field: 'transactions', fmt: v => v },
    { _key: 'items', label: t('posDash.items'), field: 'items_sold', fmt: v => v },
    { _key: 'basket', label: t('posDash.basket'), field: 'avg_basket_mmk', fmt: formatMMK },
  ];

  // Months rolled up from the daily rows already in memory. A year of days is
  // 365 lines nobody reads; twelve is a page.
  const monthlyRows = useMemo(() => {
    const byMonth = new Map();
    for (const d of s.by_day) {
      const key = d.date.slice(0, 7);
      const acc = byMonth.get(key) ?? {
        month: key, revenue_mmk: 0, in_store_mmk: 0, online_mmk: 0,
        cost_mmk: 0, profit_mmk: 0, transactions: 0, items_sold: 0,
      };
      acc.revenue_mmk += d.revenue_mmk; acc.in_store_mmk += d.in_store_mmk;
      acc.online_mmk += d.online_mmk; acc.cost_mmk += d.cost_mmk ?? 0;
      acc.profit_mmk += d.profit_mmk; acc.transactions += d.transactions;
      acc.items_sold += d.items_sold;
      byMonth.set(key, acc);
    }
    return [...byMonth.values()].map(m => ({
      ...m,
      margin_pct: m.revenue_mmk ? Math.round((m.profit_mmk / m.revenue_mmk) * 1000) / 10 : 0,
    }));
  }, [s]);

  const monthlyCols = [
    { key: 'month', label: t('salesTable.month'), value: m => m.month },
    { key: 'instore', label: inStoreLabel, align: 'right', value: m => m.in_store_mmk, cell: m => formatMMK(m.in_store_mmk) },
    { key: 'online', label: onlineLabel, align: 'right', value: m => m.online_mmk, cell: m => formatMMK(m.online_mmk) },
    { key: 'revenue', label: t('posDash.revenue'), align: 'right', value: m => m.revenue_mmk, cell: m => formatMMK(m.revenue_mmk) },
    { key: 'profit', label: t('posDash.profit'), align: 'right', value: m => m.profit_mmk, cell: m => formatMMK(m.profit_mmk) },
    { key: 'margin', label: t('salesTable.marginCol'), align: 'right', value: m => m.margin_pct, cell: m => `${m.margin_pct}%` },
    { key: 'txns', label: t('posDash.txns'), align: 'right', value: m => m.transactions },
    { key: 'items', label: t('posDash.items'), align: 'right', value: m => m.items_sold },
  ];

  const reportSections = [
    { key: 'channel', name: t('salesViews.channel'), columns: channelCols, rows: channelRows },
    { key: 'daily', name: t('salesViews.daily'), columns: dailyCols, rows: s.by_day },
    { key: 'bestworst', name: t('salesViews.bestworst'), columns: dailyCols, rows: ranked },
    { key: 'receipts', name: t('salesViews.receipts'), columns: receiptCols, rows: periodReceipts },
    { key: 'monthly', name: t('salesTable.monthly'), columns: monthlyCols, rows: monthlyRows },
    // Every receipt the shop has, not the page currently on screen. Loaded only
    // when ticked, because it walks the pagination and that is many requests.
    {
      key: 'allReceipts',
      name: t('salesTable.allReceipts'),
      columns: receiptCols,
      rows: [],
      count: receipts.total,
      load: async () => {
        const size = 200;
        const first = await getSales(1, size);
        const pages = first.total_pages ?? 1;
        const rest = await Promise.all(
          Array.from({ length: Math.max(0, pages - 1) }, (_, i) => getSales(i + 2, size))
        );
        return [first, ...rest]
          .flatMap(page => page?.data ?? [])
          .map(r => ({ ...r, _at: parseApiDate(r.created_at) }))
          .sort((a, b) => b._at - a._at);
      },
    },
  ];

  const stamp = `appleland-${start}_${end}`;
  return (
    <div className="space-y-4">
      {reportOpen && (
        <ReportDialog
          open onClose={() => setReportOpen(false)} sections={reportSections}
          onPrint={setPrinting}
          onExcel={chosen => downloadExcelWorkbook(`${stamp}.xlsx`, chosen.map(c => ({ name: c.name, columns: c.columns, rows: c.rows })))}
          onCsv={chosen => downloadCsvSections(`${stamp}.csv`, chosen)}
        />
      )}

      <PrintSheet sections={printing} onDone={setPrinting}
        subtitle={`${t('report.range', { start, end })} · ${t('report.generated', { at: formatShopTime(new Date(), 'YYYY-MM-DD HH:mm') })}`} />
      <div className="inline-flex rounded-xl border border-app bg-card p-1" aria-label={t('salesSource.label')}>
        {[
          { key: 'retail', label: t('salesSource.retail'), icon: IconShoppingBag },
          { key: 'playground', label: t('salesSource.playground'), icon: IconTicket },
          { key: 'combined', label: t('salesSource.combined'), icon: IconChartHistogram },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" onClick={() => setSource(key)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${source === key ? 'bg-brand text-white shadow-sm' : 'text-sub hover:text-brand hover:bg-brand-light'}`}>
            <Icon size={15} stroke={1.8} /> {label}
          </button>
        ))}
      </div>

      {source === 'retail' ? (
        <>
      <ReceiptDialog saleId={openReceipt?.id ?? null} onClose={() => setOpenReceipt(null)} />
      <SubBar views={VIEWS} view={view} onView={setView}>
        <div className="inline-flex rounded-lg border border-app overflow-hidden">
          {PERIODS.map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs cursor-pointer transition-colors ${period === p ? 'bg-brand text-white' : 'bg-card text-sub hover:bg-brand-light'}`}>
              {t(`posDash.period_${p}`)}
            </button>
          ))}
        </div>
        {/* Manager only. Export runs in the browser, so this is a UI gate, not a
            permission boundary — a server-side export would need a role check too. */}
        {isManager && (
          <button onClick={() => setReportOpen(true)} disabled={loading}
            title={t('report.title')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-app text-sub hover:text-brand hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
            <IconPrinter size={14} stroke={1.7} /> {t('report.button')}
          </button>
        )}
      </SubBar>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={IconCash}        tone="store"     label={t('posDash.sales')}  value={show(formatMMKShort(totals.revenue_mmk))} />
        <StatCard icon={IconReportMoney} tone="completed" label={t('posDash.profit')} value={show(formatMMKShort(totals.profit_mmk))} trend={{ dir: 'up', value: t('posDash.margin', { n: totals.margin_pct }) }} />
        <StatCard icon={IconReceipt}     tone="combined"  label={t('posDash.txns')}   value={show(totals.transactions)} />
        <StatCard icon={IconShoppingBag} tone="pending"   label={t('posDash.basket')} value={show(formatMMKShort(totals.avg_basket_mmk))} />
        <StatCard icon={IconPackage}     tone="store"     label={t('posDash.items')}  value={show(totals.items_sold)} />
      </div>

      {view === 'channel' && (
        <>
          <Panel title={t('posDash.compareTrend')}>
            <div className="chart-summary-grid mb-4">
              <div><span>{t('table.total')}</span><strong>{show(formatMMK(totals.revenue_mmk))}</strong></div>
              <div><span>{t('aiChart.peak')}</span><strong>{peakDay?.day ?? '—'}</strong></div>
              <div><span>{inStoreLabel}</span><strong>{posPct}%</strong></div>
            </div>
            <ResponsiveContainer width="100%" height={280} debounce={150}>
              <ComposedChart data={chart} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                {/* Dashed, horizontal only, and recessive: the grid is a reading
                    aid, not a subject. */}
                <CartesianGrid strokeDasharray="2 6" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                  axisLine={false} tickLine={false} minTickGap={28} dy={6} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                  width={44} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip content={<SalesTooltip inStoreLabel={inStoreLabel} onlineLabel={onlineLabel} totalLabel={t('table.total')} />}
                  cursor={{ fill: 'var(--orange-light)', opacity: 0.35 }} />
                <Legend content={<ChartLegend />} verticalAlign="top" align="right" height={30} />
                {/* Gradient rather than a flat fill: the bar is strongest at the
                    value it encodes and fades toward the baseline, which stops a
                    row of solid blocks reading as a wall. */}
                <defs>
                  {/* The soft mountain behind the bars. This is what carries the
                      shape of the month at a glance — the bars give you the exact
                      day, the fill gives you the trend without reading any. */}
                  <linearGradient id="salesTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={seriesColor(darkMode)} stopOpacity={0.38} />
                    <stop offset="60%" stopColor={seriesColor(darkMode)} stopOpacity={0.12} />
                    <stop offset="100%" stopColor={seriesColor(darkMode)} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="salesInStore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={seriesColor(darkMode)} stopOpacity={1} />
                    <stop offset="100%" stopColor={seriesColor(darkMode)} stopOpacity={0.45} />
                  </linearGradient>
                  <linearGradient id="salesOnline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colorAt(1, darkMode)} stopOpacity={1} />
                    <stop offset="100%" stopColor={colorAt(1, darkMode)} stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                {/* Declared before the bars so it paints behind them: a smooth
                    gradient fill under the daily total, with no stroke of its
                    own — the crisp edge is the bars' job. */}
                <Area type="monotone" dataKey="total" fill="url(#salesTotal)" stroke="none"
                  legendType="none" tooltipType="none" isAnimationActive={false} />
                {/* The surface-coloured stroke is the gap between stacked
                    segments — applied only when a second segment exists, since on
                    a single thin bar it just eats the fill. */}
                <Bar dataKey={inStoreLabel} stackId="rev" fill="url(#salesInStore)" maxBarSize={40}
                  stroke={hasOnline ? 'var(--s-menu-bg)' : 'none'} strokeWidth={hasOnline ? 2 : 0}
                  radius={hasOnline ? [0, 0, 2, 2] : [barRadius, barRadius, 2, 2]}
                  animationDuration={650} animationEasing="ease-out" />
                <Bar dataKey={onlineLabel} stackId="rev" fill="url(#salesOnline)" maxBarSize={40}
                  stroke={hasOnline ? 'var(--s-menu-bg)' : 'none'} strokeWidth={hasOnline ? 2 : 0}
                  radius={[barRadius, barRadius, 0, 0]}
                  animationDuration={650} animationEasing="ease-out" />
                {/* The total is an annotation over the stack, not a third
                    category, so it wears ink rather than a palette slot. */}
                {/* Always drawn now. With one channel it does trace the bar
                    tops, but it is the line that ties the gradient to the bars —
                    removing it left the fill with no edge. */}
                <Line type="monotone" dataKey="total" name={t('table.total')} stroke={seriesColor(darkMode)}
                  strokeWidth={2} dot={false}
                  animationDuration={800} animationEasing="ease-out"
                  activeDot={{ r: 5, fill: seriesColor(darkMode), stroke: 'var(--s-menu-bg)', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title={t('posDash.glance')}>
            <DataTable columns={channelCols} rows={channelRows} empty={t('posDash.noData')} />
          </Panel>

          <Panel title={t('posDash.shareToday')}>
            {totals.transactions > 0 ? (
              <div className="flex h-7 rounded-lg overflow-hidden border border-app text-[11px] text-white">
                <div className="flex items-center justify-center whitespace-nowrap" style={{ width: `${posPct}%`, background: seriesColor(darkMode) }}>{posPct >= 15 && `${inStoreLabel} ${posPct}%`}</div>
                <div className="flex items-center justify-center whitespace-nowrap" style={{ width: `${100 - posPct}%`, background: colorAt(1, darkMode) }}>{100 - posPct >= 15 && `${onlineLabel} ${100 - posPct}%`}</div>
              </div>
            ) : <Empty label={t('posDash.noData')} />}
          </Panel>
        </>
      )}

      {view === 'receipts' && (
        <Panel title={t('salesViews.receipts')}>
          <DataTable columns={receiptCols} rows={periodReceipts} empty={t('salesTable.noReceipts')}
            onRowClick={setOpenReceipt} />
          {receipts.total > RECEIPT_PAGE && (
            <p className="mt-3 text-[11px] text-mute">{t('salesTable.showing', { count: receipts.data.length, total: receipts.total })}</p>
          )}
        </Panel>
      )}

      {view === 'daily' && (
        <Panel title={t('salesViews.daily')}>
          <DataTable columns={dailyCols} rows={s.by_day} empty={t('posDash.noData')} />
        </Panel>
      )}

      {view === 'weekday' && (() => {
        const week = byWeekday(s.by_day);
        const peak = Math.max(1, ...week.map(d => d.avg_revenue_mmk));
        const traded = week.filter(d => d.days > 0);
        // One of each weekday is a diary, not a pattern. Say so rather than
        // letting a single Saturday be read as "Saturdays are like this".
        const thin = traded.length > 0 && traded.every(d => d.days < 2);
        return (
          <Panel title={t('salesViews.weekday')}>
            <p className="text-[13px] text-sub mb-4">
              {thin ? t('salesTable.weekdayThin') : t('salesTable.weekdayHelp')}
            </p>
            {traded.length === 0 ? (
              <p className="py-10 text-center text-sm text-mute">{t('posDash.noData')}</p>
            ) : (
              <div className="space-y-2.5">
                {week.map((d, i) => (
                  <div key={d.key} className="flex items-center gap-3">
                    <span className="w-10 flex-shrink-0 text-[12px] font-medium text-sub">{d.key}</span>
                    <div className="flex-1 h-6 rounded-md overflow-hidden"
                      style={{ background: 'color-mix(in srgb, var(--text-muted) 10%, transparent)' }}>
                      <div className="chart-bar-grow h-full rounded-md"
                        style={{
                          width: d.days ? `${Math.max(2, (d.avg_revenue_mmk / peak) * 100)}%` : 0,
                          animationDelay: `${i * 45}ms`,
                          background: 'linear-gradient(90deg, color-mix(in srgb, var(--orange-primary) 72%, transparent) 0%, var(--orange-primary) 100%)',
                        }} />
                    </div>
                    <span className="w-28 flex-shrink-0 text-right text-[12px] text-ink font-medium tabular-nums">
                      {d.days ? formatMMK(Math.round(d.avg_revenue_mmk)) : '—'}
                    </span>
                    {/* How many of this weekday the range actually contained.
                        Without it an average is not checkable. */}
                    <span className="w-20 flex-shrink-0 text-right text-[11px] text-mute tabular-nums">
                      {d.days ? t('salesTable.weekdayCount', { count: d.days }) : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        );
      })()}

      {view === 'products' && (
        <Panel title={t('salesViews.products')}>
          {sold.error ? (
            <p className="py-10 text-center text-sm text-mute">{sold.error}</p>
          ) : sold.key !== soldKey ? (
            <>
              {/* This one genuinely waits on a request per receipt, so it says
                  what it is doing instead of shimmering silently for ten
                  seconds and looking stuck. */}
              <p className="text-[13px] text-sub mb-4">{t('salesTable.productsReading')}</p>
              <div className="space-y-2.5 skeleton-row">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3" style={{ '--i': i }}>
                    <div className="skeleton h-3 flex-1 rounded" />
                    <div className="skeleton h-3 w-14 rounded" />
                    <div className="skeleton h-3 w-24 rounded" />
                  </div>
                ))}
              </div>
            </>
          ) : sold.rows.length === 0 ? (
            <p className="py-10 text-center text-sm text-mute">{t('posDash.noData')}</p>
          ) : (
            <>
              {/* Never let a partial answer pass as a complete one. */}
              {sold.partial && (
                <p className="text-[12px] mb-3" style={{ color: 'var(--status-pending)' }}>
                  {t('salesTable.productsPartial')}
                </p>
              )}
              <DataTable columns={soldCols} rows={sold.rows.map((r, i) => ({ ...r, _key: r.product_id ?? i }))}
                empty={t('posDash.noData')} />
            </>
          )}
        </Panel>
      )}

      {view === 'bestworst' && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <Panel title={t('salesTable.best')}>
            <DataTable columns={dailyCols.slice(0, 3)} rows={best} empty={t('posDash.noData')} />
          </Panel>
          <Panel title={t('salesTable.worst')}>
            <DataTable columns={dailyCols.slice(0, 3)} rows={worst} empty={t('posDash.noData')} />
          </Panel>
        </div>
      )}
        </>
      ) : (
        <>
          <div className="flex justify-end">
            <div className="inline-flex rounded-lg border border-app overflow-hidden">
              {PERIODS.map(p => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-xs cursor-pointer transition-colors ${period === p ? 'bg-brand text-white' : 'bg-card text-sub hover:bg-brand-light'}`}>
                  {t(`posDash.period_${p}`)}
                </button>
              ))}
            </div>
          </div>
          <PlaygroundAnalytics
            start={start}
            end={end}
            days={PERIOD_DAYS[period]}
            mode={source}
            retailTotals={totals}
            retailDays={s.by_day}
          />
        </>
      )}
    </div>
  );
}
