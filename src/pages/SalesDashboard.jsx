import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconCash, IconReportMoney, IconReceipt, IconShoppingBag, IconPackage, IconDatabase } from '@tabler/icons-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatCard from '../components/common/StatCard';
import { formatMMK, formatMMKShort } from '../utils/currency';
import { getSaleSummary } from '../services/salesService';
import { summarizeSales } from '../services/salesRollup';
import { format, subDays, startOfDay } from 'date-fns';

const PERIODS = ['today', 'week', 'month'];
const PERIOD_DAYS = { today: 1, week: 7, month: 30 };
const tip = { borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 12, color: 'var(--text-primary)' };

function periodToDates(period) {
  const today = startOfDay(new Date());
  const end = format(today, 'yyyy-MM-dd');
  return { start: format(subDays(today, PERIOD_DAYS[period] - 1), 'yyyy-MM-dd'), end };
}

function useSaleSummary(period) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const { start, end } = periodToDates(period);
    setLoading(true);
    getSaleSummary({ start_date: start, end_date: end })
      .then(data => { if (active) setRecords(Array.isArray(data) ? data : []); })
      .catch(() => { if (active) setRecords([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [period]);

  return { records, loading };
}

export default function SalesDashboard() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('week');
  const { records, loading } = useSaleSummary(period);
  const s = useMemo(() => summarizeSales(records), [records]);

  const inStoreLabel = t('posDash.chInstore');
  const onlineLabel = t('posDash.chOnline');

  // Pad to the full period so the axis stays continuous when days have no sales.
  const chart = useMemo(() => {
    const byDate = new Map(s.by_day.map(d => [d.date, d]));
    const end = startOfDay(new Date());
    const days = PERIOD_DAYS[period];
    return Array.from({ length: days }, (_, i) => {
      const d = subDays(end, days - 1 - i);
      const row = byDate.get(format(d, 'yyyy-MM-dd'));
      return {
        day: format(d, 'MMM d'),
        [inStoreLabel]: row?.in_store_mmk ?? 0,
        [onlineLabel]: row?.online_mmk ?? 0,
      };
    });
  }, [s, period, inStoreLabel, onlineLabel]);

  const { totals, by_channel: ch } = s;
  const posPct = totals.revenue_mmk ? Math.round((ch.in_store.revenue_mmk / totals.revenue_mmk) * 100) : 0;
  const hasData = totals.transactions > 0;

  const rows = [
    { label: t('posDash.revenue'), key: 'revenue_mmk', fmt: formatMMK },
    { label: t('posDash.profit'), key: 'profit_mmk', fmt: formatMMK },
    { label: t('posDash.txns'), key: 'transactions', fmt: v => v },
    { label: t('posDash.items'), key: 'items_sold', fmt: v => v },
    { label: t('posDash.basket'), key: 'avg_basket_mmk', fmt: formatMMK },
  ];

  const show = (v) => (loading ? '...' : v);

  return (
    <div className="space-y-4">
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

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={IconCash}        tone="store"     label={t('posDash.sales')}  value={show(formatMMKShort(totals.revenue_mmk))} />
        <StatCard icon={IconReportMoney} tone="completed" label={t('posDash.profit')} value={show(formatMMKShort(totals.profit_mmk))} trend={{ dir: 'up', value: t('posDash.margin', { n: totals.margin_pct }) }} />
        <StatCard icon={IconReceipt}     tone="combined"  label={t('posDash.txns')}   value={show(totals.transactions)} />
        <StatCard icon={IconShoppingBag} tone="pending"   label={t('posDash.basket')} value={show(formatMMKShort(totals.avg_basket_mmk))} />
        <StatCard icon={IconPackage}     tone="store"     label={t('posDash.items')}  value={show(totals.items_sold)} />
      </div>

      <div className="surface-card p-5">
        <h3 className="text-[13px] font-semibold text-ink mb-3">{t('posDash.compareTrend')}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
            <Tooltip formatter={v => formatMMK(v)} contentStyle={tip} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey={inStoreLabel} stackId="rev" fill="#F97316" />
            <Bar dataKey={onlineLabel} stackId="rev" fill="#3B82F6" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="surface-card p-5">
        <h3 className="text-[13px] font-semibold text-ink mb-3">{t('posDash.glance')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-mute text-xs">
                <th className="py-2 text-left font-medium">{t('posDash.metric')}</th>
                <th className="py-2 text-right font-medium">{inStoreLabel}</th>
                <th className="py-2 text-right font-medium">{onlineLabel}</th>
                <th className="py-2 text-right font-medium">{t('posDash.totalCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {rows.map(r => (
                <tr key={r.key}>
                  <td className="py-2.5 text-sub">{r.label}</td>
                  <td className="py-2.5 text-right text-ink tabular-nums">{show(r.fmt(ch.in_store[r.key]))}</td>
                  <td className="py-2.5 text-right text-ink tabular-nums">{show(r.fmt(ch.online[r.key]))}</td>
                  <td className="py-2.5 text-right font-medium text-ink tabular-nums">{show(r.fmt(totals[r.key]))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="surface-card p-5">
        <h3 className="text-[13px] font-semibold text-ink mb-3">{t('posDash.shareToday')}</h3>
        {hasData ? (
          <div className="flex h-7 rounded-lg overflow-hidden border border-app text-[11px] text-white">
            <div className="flex items-center justify-center whitespace-nowrap" style={{ width: `${posPct}%`, background: '#F97316' }}>{posPct >= 15 && `${inStoreLabel} ${posPct}%`}</div>
            <div className="flex items-center justify-center whitespace-nowrap" style={{ width: `${100 - posPct}%`, background: '#3B82F6' }}>{100 - posPct >= 15 && `${onlineLabel} ${100 - posPct}%`}</div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-mute text-sm gap-2">
            <IconDatabase size={28} stroke={1.2} />
            {t('posDash.noData')}
          </div>
        )}
      </div>
    </div>
  );
}
