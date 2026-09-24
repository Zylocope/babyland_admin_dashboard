import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconCash, IconTicket, IconGift, IconReceipt, IconShoppingBag,
  IconRefresh, IconDatabase,
} from '@tabler/icons-react';
import {
  Bar, Line, ComposedChart, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import StatCard from '../common/StatCard';
import { getPlaygroundSummary } from '../../services/playgroundAdminService';
import { formatMMK, formatMMKShort } from '../../utils/currency';
import { formatShopTime, shopDayStart, shopDaysAgo } from '../../utils/shopDay';
import { colorAt, seriesColor } from '../../utils/chartPalette';
import { useTheme } from '../../context/ThemeContext';

const EMPTY_TOTALS = {
  revenue_mmk: 0,
  paid_tickets: 0,
  free_tickets: 0,
  total_tickets: 0,
  avg_ticket_mmk: 0,
};

const num = value => Number(value ?? 0) || 0;

const normalizeSummary = value => ({
  totals: { ...EMPTY_TOTALS, ...(value?.totals ?? value ?? {}) },
  by_day: Array.isArray(value?.by_day) ? value.by_day : [],
});

function ChartTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload ?? {};
  return (
    <div className="chart-tooltip min-w-48">
      <p className="text-xs font-semibold text-ink mb-2">{label}</p>
      <div className="space-y-1.5 text-xs">
        <p className="flex justify-between gap-5 text-sub"><span>{t('playgroundAnalytics.revenue')}</span><strong className="text-ink">{formatMMK(row.revenue)}</strong></p>
        <p className="flex justify-between gap-5 text-sub"><span>{t('playgroundAnalytics.paid')}</span><strong className="text-ink">{row.paid}</strong></p>
        <p className="flex justify-between gap-5 text-sub"><span>{t('playgroundAnalytics.free')}</span><strong className="text-ink">{row.free}</strong></p>
      </div>
    </div>
  );
}

export default function PlaygroundAnalytics({ start, end, days, mode = 'playground', retailTotals, retailDays = [] }) {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const chartId = useId().replace(/:/g, '');
  const [result, setResult] = useState(() => ({ key: '', summary: normalizeSummary(null), error: '' }));
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${start}|${end}|${reloadKey}`;
  const loading = result.key !== requestKey;
  const summary = loading ? normalizeSummary(null) : result.summary;
  const error = loading ? '' : result.error;

  const retry = useCallback(() => setReloadKey(key => key + 1), []);

  useEffect(() => {
    let active = true;
    getPlaygroundSummary(start, end)
      .then(nextSummary => {
        if (!active) return;
        setResult({
          key: requestKey,
          summary: normalizeSummary(nextSummary),
          error: '',
        });
      })
      .catch(err => {
        if (!active) return;
        setResult({
          key: requestKey,
          summary: normalizeSummary(null),
          error: err?.message || t('playgroundAnalytics.loadFailed'),
        });
      });
    return () => { active = false; };
  }, [start, end, requestKey, t]);

  const pg = summary.totals;
  const combined = mode === 'combined';
  const totals = combined ? {
    revenue_mmk: num(retailTotals?.revenue_mmk) + num(pg.revenue_mmk),
  } : pg;

  const chart = useMemo(() => {
    const pgDays = new Map(summary.by_day.map(row => [row.date, row]));
    const shopDays = new Map(retailDays.map(row => [row.date, row]));
    return Array.from({ length: days }, (_, index) => {
      const date = shopDaysAgo(days - 1 - index, shopDayStart(end));
      const playground = pgDays.get(date) ?? {};
      const retail = shopDays.get(date) ?? {};
      const playgroundRevenue = num(playground.revenue_mmk);
      const retailRevenue = num(retail.revenue_mmk);
      return {
        date,
        day: formatShopTime(shopDayStart(date), 'MMM D'),
        revenue: combined ? retailRevenue + playgroundRevenue : playgroundRevenue,
        retailRevenue,
        playgroundRevenue,
        paid: num(playground.paid_tickets),
        free: num(playground.free_tickets),
      };
    });
  }, [summary.by_day, retailDays, days, end, combined]);

  const show = value => loading ? '...' : value;

  if (error) {
    return (
      <div className="surface-card p-8 text-center">
        <IconDatabase size={30} stroke={1.3} className="mx-auto text-mute" />
        <p className="mt-3 font-semibold text-ink">{t('playgroundAnalytics.unavailable')}</p>
        <p className="mt-1 text-sm text-sub">{t('playgroundAnalytics.loadFailed')}</p>
        <button type="button" onClick={retry} className="btn-primary mt-4 mx-auto">
          <IconRefresh size={16} /> {t('assistant.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={IconCash} tone="store" label={combined ? t('playgroundAnalytics.combinedRevenue') : t('playgroundAnalytics.revenue')} value={show(formatMMKShort(totals.revenue_mmk))} />
        {combined
          ? <StatCard icon={IconShoppingBag} tone="completed" label={t('playgroundAnalytics.retailRevenue')} value={show(formatMMKShort(retailTotals?.revenue_mmk ?? 0))} />
          : <StatCard icon={IconTicket} tone="ticket" label={t('playgroundAnalytics.paid')} value={show(pg.paid_tickets)} />}
        {combined
          ? <StatCard icon={IconTicket} tone="ticket" label={t('playgroundAnalytics.playgroundRevenue')} value={show(formatMMKShort(pg.revenue_mmk))} />
          : <StatCard icon={IconGift} tone="completed" label={t('playgroundAnalytics.free')} value={show(pg.free_tickets)} />}
        <StatCard icon={IconReceipt} tone="combined"
          label={combined ? t('playgroundAnalytics.retailTransactions') : t('playgroundAnalytics.totalTickets')}
          value={show(combined ? num(retailTotals?.transactions) : pg.total_tickets)} />
        <StatCard icon={IconShoppingBag} tone="pending"
          label={combined ? t('playgroundAnalytics.playgroundTickets') : t('playgroundAnalytics.avgTicket')}
          value={show(combined ? pg.total_tickets : formatMMKShort(pg.avg_ticket_mmk))} />
      </div>

      <div className="surface-card p-5">
        <h3 className="text-[13px] font-semibold text-ink mb-4">{combined ? t('playgroundAnalytics.combinedTrend') : t('playgroundAnalytics.trend')}</h3>
        <ResponsiveContainer width="100%" height={280} debounce={150}>
          <ComposedChart data={chart} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`${chartId}-primary`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={seriesColor(darkMode)} stopOpacity="1" />
                <stop offset="55%" stopColor={seriesColor(darkMode)} stopOpacity="0.78" />
                <stop offset="100%" stopColor={seriesColor(darkMode)} stopOpacity="0.42" />
              </linearGradient>
              <linearGradient id={`${chartId}-secondary`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={colorAt(1, darkMode)} stopOpacity="1" />
                <stop offset="55%" stopColor={colorAt(1, darkMode)} stopOpacity="0.78" />
                <stop offset="100%" stopColor={colorAt(1, darkMode)} stopOpacity="0.42" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="2 6" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} minTickGap={28} />
            <YAxis yAxisId="money" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={value => `${Math.round(value / 1000)}K`} />
            {!combined && <YAxis yAxisId="tickets" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />}
            <Tooltip content={<ChartTooltip t={t} />} cursor={{ fill: 'var(--orange-light)', opacity: 0.32 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {combined ? (
              <>
                <Bar yAxisId="money" dataKey="retailRevenue" name={t('playgroundAnalytics.retail')} stackId="revenue" fill={`url(#${chartId}-primary)`} maxBarSize={44}
                  stroke="var(--s-menu-bg)" strokeWidth={2} radius={[0, 0, 2, 2]} animationDuration={600} animationEasing="ease-out" />
                <Bar yAxisId="money" dataKey="playgroundRevenue" name={t('playgroundAnalytics.playground')} stackId="revenue" fill={`url(#${chartId}-secondary)`} maxBarSize={44}
                  stroke="var(--s-menu-bg)" strokeWidth={2} radius={[7, 7, 0, 0]} animationDuration={650} animationEasing="ease-out" />
                <Line yAxisId="money" type="monotone" dataKey="revenue" name={t('table.total')} stroke="var(--text-primary)" strokeWidth={2} dot={false}
                  animationDuration={780} animationEasing="ease-out" activeDot={{ r: 5, fill: seriesColor(darkMode), stroke: 'var(--s-menu-bg)', strokeWidth: 2 }} />
              </>
            ) : (
              <>
                <Bar yAxisId="tickets" dataKey="paid" name={t('playgroundAnalytics.paid')} stackId="tickets" fill={`url(#${chartId}-primary)`} maxBarSize={44}
                  stroke="var(--s-menu-bg)" strokeWidth={2} radius={[0, 0, 2, 2]} animationDuration={600} animationEasing="ease-out" />
                <Bar yAxisId="tickets" dataKey="free" name={t('playgroundAnalytics.free')} stackId="tickets" fill={`url(#${chartId}-secondary)`} maxBarSize={44}
                  stroke="var(--s-menu-bg)" strokeWidth={2} radius={[7, 7, 0, 0]} animationDuration={650} animationEasing="ease-out" />
                <Line yAxisId="money" type="monotone" dataKey="revenue" name={t('playgroundAnalytics.revenue')} stroke="var(--text-primary)" strokeWidth={2} dot={false}
                  animationDuration={780} animationEasing="ease-out" activeDot={{ r: 5, fill: seriesColor(darkMode), stroke: 'var(--s-menu-bg)', strokeWidth: 2 }} />
              </>
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {!combined && (
        <div className="surface-card p-5">
          <h3 className="text-[13px] font-semibold text-ink mb-3">{t('playgroundAnalytics.recent')}</h3>
          {summary.by_day.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-mute">
                  <th className="py-2 text-left font-medium">{t('salesTable.date')}</th>
                  <th className="py-2 text-right font-medium">{t('playgroundAnalytics.paid')}</th>
                  <th className="py-2 text-right font-medium">{t('playgroundAnalytics.free')}</th>
                  <th className="py-2 text-right font-medium">{t('playgroundAnalytics.revenue')}</th>
                </tr></thead>
                <tbody className="divide-y divide-app">{summary.by_day.map(row => (
                  <tr key={row.date} className="hover:bg-brand-light transition-colors">
                    <td className="py-2.5 text-ink">{formatShopTime(shopDayStart(row.date), 'MMM D, YYYY')}</td>
                    <td className="py-2.5 text-right text-ink tabular-nums">{row.paid_tickets}</td>
                    <td className="py-2.5 text-right text-ink tabular-nums">{row.free_tickets}</td>
                    <td className="py-2.5 text-right text-ink tabular-nums">{formatMMK(num(row.revenue_mmk))}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          ) : (
            <div className="py-10 text-center text-sm text-mute">{t('playgroundAnalytics.noPurchases')}</div>
          )}
        </div>
      )}
    </div>
  );
}
