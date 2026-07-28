import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconCash, IconReportMoney, IconReceipt, IconShoppingBag, IconPackage, IconArrowBackUp, IconTruck, IconWorld, IconDatabase } from '@tabler/icons-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatCard from '../components/common/StatCard';
import { formatMMK, formatMMKShort } from '../utils/currency';
import { getSaleSummary } from '../services/salesService';
import { format, subDays, startOfDay } from 'date-fns';

const CHANNELS = ['instore', 'online', 'compare'];
const PERIODS = ['today', 'week', 'month'];
const tip = { borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 12, color: 'var(--text-primary)' };

function Empty({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-mute text-sm gap-2">
      <IconDatabase size={28} stroke={1.2} />
      {label}
    </div>
  );
}

function Card({ title, pending, span, children }) {
  const { t } = useTranslation();
  return (
    <div className={`surface-card p-5 ${span || ''}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {pending && <span className="text-[11px] text-mute border border-app rounded-full px-2 py-0.5 whitespace-nowrap">{t(pending)}</span>}
      </div>
      {children}
    </div>
  );
}

function periodToDates(period) {
  const today = startOfDay(new Date());
  const end = format(today, 'yyyy-MM-dd');
  if (period === 'today') return { start: end, end };
  if (period === 'week') return { start: format(subDays(today, 6), 'yyyy-MM-dd'), end };
  if (period === 'month') return { start: format(subDays(today, 29), 'yyyy-MM-dd'), end };
  return { start: end, end };
}

function useSaleSummary(period) {
  const [records, setRecords] = useState(null);

  useEffect(() => {
    let active = true;
    const { start, end } = periodToDates(period);
    getSaleSummary({ start_date: start, end_date: end })
      .then(data => {
        if (!active) return;
        setRecords(Array.isArray(data) ? data : []);
      })
      .catch(() => { if (active) setRecords([]); });
    return () => { active = false; };
  }, [period]);

  return { records, loading: records === null };
}

function computeKpis(records, isOnline) {
  const filtered = records.filter(r => r.is_online_sale === isOnline);
  const sales = filtered.reduce((sum, r) => sum + Number(r.total_sale || 0), 0);
  const txns = filtered.reduce((sum, r) => sum + Number(r.transactions || 0), 0);
  const items = filtered.reduce((sum, r) => sum + Number(r.items_sold || 0), 0);
  const basket = filtered.length ? sales / filtered.length : 0;
  const margin = filtered.reduce((sum, r) => sum + Number(r.margin || 0), 0);
  const marginPct = sales ? Math.round((margin / sales) * 100) : 0;
  return { sales, txns, items, basket, margin, marginPct };
}

function buildTrend(records, isOnline, days) {
  const end = startOfDay(new Date());
  const daysArray = Array.from({ length: days }, (_, i) => {
    const d = subDays(end, days - 1 - i);
    return { date: d, dateStr: format(d, 'yyyy-MM-dd'), label: format(d, 'MMM d') };
  });

  return daysArray.map(d => {
    const dayRecords = records.filter(r => r.sale_date === d.dateStr && r.is_online_sale === isOnline);
    const total = dayRecords.reduce((sum, r) => sum + Number(r.total_sale || 0), 0);
    return { day: d.label, revenue: total };
  });
}

function InStoreView() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('today');
  const { records, loading } = useSaleSummary(period);
  const k = useMemo(() => computeKpis(records, false), [records]);
  const days = period === 'today' ? 1 : period === 'week' ? 7 : 30;
  const trend = useMemo(() => buildTrend(records, false, days).map(d => ({ day: d.day, [t('posDash.revenue')]: d.revenue })), [records, days, t]);

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

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard icon={IconCash}        tone="store"     label={t('posDash.sales')}   value={loading ? '...' : formatMMKShort(k.sales)} />
        <StatCard icon={IconReportMoney} tone="completed" label={t('posDash.profit')}  value={loading ? '...' : formatMMKShort(k.margin)} trend={{ dir: 'up', value: t('posDash.margin', { n: k.marginPct }) }} />
        <StatCard icon={IconReceipt}     tone="combined"  label={t('posDash.txns')}    value={loading ? '...' : k.txns} />
        <StatCard icon={IconShoppingBag} tone="pending"   label={t('posDash.basket')}  value={loading ? '...' : formatMMKShort(k.basket)} />
        <StatCard icon={IconPackage}     tone="store"     label={t('posDash.items')}   value={loading ? '...' : k.items} />
        <StatCard icon={IconArrowBackUp} tone="low"       label={t('posDash.returns')} value={t('posDash.noData')} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="surface-card p-5 xl:col-span-2">
          <h3 className="text-[13px] font-semibold text-ink mb-3">{t('posDash.trendTitle')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F97316" stopOpacity={0.25} /><stop offset="95%" stopColor="#F97316" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={v => formatMMK(v)} contentStyle={tip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey={t('posDash.revenue')} stroke="#F97316" strokeWidth={2.5} fill="url(#pRev)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <Card title={t('posDash.paymentMethod')} pending="posDash.needsPayments">
          <Empty label={t('posDash.noPaymentData')} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="surface-card p-5 xl:col-span-2">
          <h3 className="text-[13px] font-semibold text-ink mb-3">{t('posDash.hoursTitle')}</h3>
          <Empty label={t('posDash.noHourlyData')} />
        </div>
        <Card title={t('posDash.byCashier')} pending="posDash.needsCashier">
          <Empty label={t('posDash.noCashierData')} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title={t('posDash.topProducts')} pending="posDash.byProfit">
          <Empty label={t('posDash.noProductData')} />
        </Card>
        <Card title={t('posDash.byCategory')}>
          <Empty label={t('posDash.noCategoryData')} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title={t('posDash.lowStock')} pending="posDash.fromInventory">
          <Empty label={t('posDash.noLowStockData')} />
        </Card>
        <Card title={t('posDash.recentReceipts')}>
          <Empty label={t('posDash.noReceiptData')} />
        </Card>
      </div>
    </div>
  );
}

function OnlineView() {
  const { t } = useTranslation();
  const { records, loading } = useSaleSummary('week');
  const k = useMemo(() => computeKpis(records, true), [records]);
  const trend = useMemo(() => buildTrend(records, true, 7).map(d => ({ day: d.day, orders: Math.round(d.revenue / 10000) })), [records]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={IconWorld}       tone="combined"  label={t('posDash.onlineRevenue')} value={loading ? '...' : formatMMKShort(k.sales)} />
        <StatCard icon={IconReceipt}     tone="store"     label={t('posDash.orders')}        value={loading ? '...' : k.txns} />
        <StatCard icon={IconTruck}       tone="pending"   label={t('posDash.pending')}       value={t('posDash.noData')} />
        <StatCard icon={IconShoppingBag} tone="completed" label={t('posDash.aov')}           value={loading ? '...' : formatMMKShort(k.basket)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="surface-card p-5 xl:col-span-2">
          <h3 className="text-[13px] font-semibold text-ink mb-3">{t('posDash.ordersTrend')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tip} />
              <Bar dataKey="orders" fill="#3B82F6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Card title={t('posDash.orderStatus')}>
          <Empty label={t('posDash.noOrderStatusData')} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title={t('posDash.topProducts')}>
          <Empty label={t('posDash.noProductData')} />
        </Card>
        <Card title={t('posDash.deliveryByCity')} pending="posDash.fromShipping">
          <Empty label={t('posDash.noShippingData')} />
        </Card>
      </div>

      <Card title={t('posDash.recentOrders')}>
        <Empty label={t('posDash.noOrderData')} />
      </Card>
    </div>
  );
}

function CompareView() {
  const { t } = useTranslation();
  const { records, loading } = useSaleSummary('week');
  const instore = useMemo(() => computeKpis(records, false), [records]);
  const online = useMemo(() => computeKpis(records, true), [records]);
  const totalRev = instore.sales + online.sales;
  const posPct = totalRev ? Math.round((instore.sales / totalRev) * 100) : 0;
  const daily = useMemo(() => {
    const end = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = subDays(end, 6 - i);
      const str = format(d, 'yyyy-MM-dd');
      const instoreTotal = records.filter(r => r.sale_date === str && !r.is_online_sale).reduce((s, r) => s + Number(r.total_sale || 0), 0);
      const onlineTotal = records.filter(r => r.sale_date === str && r.is_online_sale).reduce((s, r) => s + Number(r.total_sale || 0), 0);
      return { day: format(d, 'MMM d'), [t('posDash.chInstore')]: instoreTotal, [t('posDash.chOnline')]: onlineTotal };
    });
  }, [records, t]);

  const rows = [
    { key: 'sales', label: t('posDash.revenue'), fmt: formatMMK },
    { key: 'txns', label: t('posDash.txns'), fmt: v => v },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title={t('posDash.glance')}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-mute text-xs">
                <th className="py-2 text-left font-medium">{t('posDash.metric')}</th>
                <th className="py-2 text-right font-medium">{t('posDash.chInstore')}</th>
                <th className="py-2 text-right font-medium">{t('posDash.chOnline')}</th>
                <th className="py-2 text-right font-medium">{t('posDash.totalCol')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {rows.map(r => (
                <tr key={r.key}>
                  <td className="py-2.5 text-sub">{r.label}</td>
                  <td className="py-2.5 text-right text-ink tabular-nums">{loading ? '...' : r.fmt(instore[r.key])}</td>
                  <td className="py-2.5 text-right text-ink tabular-nums">{loading ? '...' : r.fmt(online[r.key])}</td>
                  <td className="py-2.5 text-right font-medium text-ink tabular-nums">{loading ? '...' : r.fmt(instore[r.key] + online[r.key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card title={t('posDash.compareTrend')}>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={v => formatMMK(v)} contentStyle={tip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey={t('posDash.chInstore')} fill="#F97316" radius={[3, 3, 0, 0]} />
              <Bar dataKey={t('posDash.chOnline')} fill="#3B82F6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title={t('posDash.shareToday')}>
        <div className="flex h-7 rounded-lg overflow-hidden border border-app text-[11px] text-white">
          <div className="flex items-center justify-center" style={{ width: `${posPct}%`, background: '#F97316' }}>{t('posDash.chInstore')} {posPct}%</div>
          <div className="flex items-center justify-center" style={{ width: `${100 - posPct}%`, background: '#3B82F6' }}>{t('posDash.chOnline')} {100 - posPct}%</div>
        </div>
      </Card>
    </div>
  );
}

export default function SalesDashboard() {
  const { t } = useTranslation();
  const [channel, setChannel] = useState('instore');
  const icons = { instore: IconShoppingBag, online: IconWorld, compare: IconReportMoney };

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-lg border border-app overflow-hidden">
        {CHANNELS.map(c => {
          const Icon = icons[c];
          return (
            <button key={c} onClick={() => setChannel(c)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm cursor-pointer transition-colors ${channel === c ? 'bg-brand text-white' : 'bg-card text-sub hover:bg-brand-light'}`}>
              <Icon size={16} stroke={1.7} /> {t(`posDash.ch_${c}`)}
            </button>
          );
        })}
      </div>

      {channel === 'instore' && <InStoreView />}
      {channel === 'online' && <OnlineView />}
      {channel === 'compare' && <CompareView />}
    </div>
  );
}
