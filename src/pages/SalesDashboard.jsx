import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconCash, IconReportMoney, IconReceipt, IconShoppingBag, IconPackage,
  IconDatabase, IconDownload, IconChartHistogram, IconCalendarStats, IconTrophy,
} from '@tabler/icons-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatCard from '../components/common/StatCard';
import SubBar from '../components/common/SubBar';
import { formatMMK, formatMMKShort } from '../utils/currency';
import { downloadCsv } from '../utils/csv';
import { colorAt, seriesColor } from '../utils/chartPalette';
import { useTheme } from '../context/ThemeContext';
import { parseApiDate } from '../utils/apiDate';
import { useAuth } from '../context/AuthContext';
import { getSaleSummary, getSales } from '../services/salesService';
import { summarizeSales } from '../services/salesRollup';
import { format, subDays, startOfDay, parseISO } from 'date-fns';

const PERIODS = ['today', 'week', 'month'];
const PERIOD_DAYS = { today: 1, week: 7, month: 30 };
const RECEIPT_PAGE = 100;
const tip = { borderRadius: 12, border: '1px solid var(--border)', background: 'var(--s-menu-bg, var(--bg-card))', fontSize: 12, color: 'var(--text-primary)' };

function periodToDates(period) {
  const today = startOfDay(new Date());
  const end = format(today, 'yyyy-MM-dd');
  return { start: format(subDays(today, PERIOD_DAYS[period] - 1), 'yyyy-MM-dd'), end };
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
function DataTable({ columns, rows, empty }) {
  if (!rows.length) return <Empty label={empty} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-mute text-xs">
            {columns.map(c => (
              <th key={c.key} className={`py-2 font-medium ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-app">
          {rows.map((row, i) => (
            <tr key={row._key ?? i} className="hover:bg-brand-light transition-colors">
              {columns.map(c => (
                <td key={c.key} className={`py-2.5 text-ink tabular-nums ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
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
  const [view, setView] = useState('channel');
  const [period, setPeriod] = useState('week');
  const [records, setRecords] = useState([]);
  const [receipts, setReceipts] = useState({ data: [], total: 0 });
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
    const today = startOfDay(new Date());
    const days = PERIOD_DAYS[period];
    return Array.from({ length: days }, (_, i) => {
      const d = subDays(today, days - 1 - i);
      const row = byDate.get(format(d, 'yyyy-MM-dd'));
      return {
        day: format(d, 'MMM d'),
        [inStoreLabel]: row?.in_store_mmk ?? 0,
        [onlineLabel]: row?.online_mmk ?? 0,
      };
    });
  }, [s, period, inStoreLabel, onlineLabel]);

  // The sales list has no date filter server-side, so the period is applied here.
  const periodReceipts = useMemo(() => {
    const from = parseISO(start);
    const to = new Date(parseISO(end).getTime() + 86_400_000);
    return receipts.data
      .map(r => ({ ...r, _key: r.id, _at: parseApiDate(r.created_at) }))
      .filter(r => r._at && r._at >= from && r._at < to)
      .sort((a, b) => b._at - a._at);
  }, [receipts, start, end]);

  const ranked = useMemo(
    () => [...s.by_day].filter(d => d.revenue_mmk > 0).sort((a, b) => b.revenue_mmk - a.revenue_mmk),
    [s]
  );
  const best = ranked.slice(0, 3);
  const worst = ranked.slice(-3).reverse();

  const posPct = totals.revenue_mmk ? Math.round((ch.in_store.revenue_mmk / totals.revenue_mmk) * 100) : 0;
  const show = (v) => (loading ? '...' : v);

  const VIEWS = [
    { key: 'channel', label: t('salesViews.channel'), icon: IconChartHistogram },
    { key: 'receipts', label: t('salesViews.receipts'), icon: IconReceipt },
    { key: 'daily', label: t('salesViews.daily'), icon: IconCalendarStats },
    { key: 'bestworst', label: t('salesViews.bestworst'), icon: IconTrophy },
  ];

  const receiptCols = [
    { key: 'id', label: t('salesTable.receipt'), value: r => r.id, cell: r => <span className="font-mono text-xs text-brand">{r.id.slice(0, 8)}</span> },
    { key: 'date', label: t('salesTable.date'), value: r => format(r._at, 'yyyy-MM-dd') },
    { key: 'time', label: t('salesTable.time'), value: r => format(r._at, 'HH:mm') },
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

  const exportable = {
    channel: { cols: channelCols, rows: channelRows },
    receipts: { cols: receiptCols, rows: periodReceipts },
    daily: { cols: dailyCols, rows: s.by_day },
    bestworst: { cols: dailyCols, rows: ranked },
  }[view];

  const onExport = () => {
    if (!exportable.rows.length) return;
    downloadCsv(`appleland-${view}-${start}_${end}.csv`, exportable.cols, exportable.rows);
  };

  return (
    <div className="space-y-4">
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
          <button onClick={onExport} disabled={loading || !exportable.rows.length}
            title={exportable.rows.length ? t('subbar.export') : t('subbar.noRows')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-app text-sub hover:text-brand hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer">
            <IconDownload size={14} stroke={1.7} /> {t('subbar.export')}
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
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
                <Tooltip formatter={v => formatMMK(v)} contentStyle={tip} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey={inStoreLabel} stackId="rev" fill={seriesColor(darkMode)} />
                <Bar dataKey={onlineLabel} stackId="rev" fill={colorAt(1, darkMode)} radius={[3, 3, 0, 0]} />
              </BarChart>
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
          <DataTable columns={receiptCols} rows={periodReceipts} empty={t('salesTable.noReceipts')} />
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
    </div>
  );
}
