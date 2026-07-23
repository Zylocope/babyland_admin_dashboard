import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconCash, IconReportMoney, IconReceipt, IconShoppingBag, IconPackage, IconArrowBackUp, IconInfoCircle, IconTruck, IconClock, IconWorld } from '@tabler/icons-react';
import { AreaChart, Area, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import { formatMMK, formatMMKShort } from '../utils/currency';
import { mockPos } from '../data/mock';

const CHANNELS = ['instore', 'online', 'compare'];
const PERIODS = ['today', 'week', 'month'];
const tip = { borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 12, color: 'var(--text-primary)' };

function BarList({ rows, tone = 'var(--color-brand)', fmt = formatMMK }) {
  const top = Math.max(...rows.map(r => r.value), 1);
  return (
    <div className="space-y-2.5">
      {rows.map(r => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-28 truncate text-sub">{r.label}</span>
          <span className="flex-1 h-2.5 rounded-full bg-app overflow-hidden">
            <span className="block h-full rounded-full" style={{ width: `${Math.min(100, (r.value / top) * 100)}%`, background: tone }} />
          </span>
          <span className="w-20 text-right text-ink tabular-nums">{fmt(r.value)}</span>
        </div>
      ))}
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

function InStoreView() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('today');
  const k = mockPos.kpis[period];
  const trend = mockPos.trend.map(d => ({ day: d.day, [t('posDash.revenue')]: d.revenue, [t('posDash.profit')]: d.profit }));

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
        <StatCard icon={IconCash}        tone="store"     label={t('posDash.sales')}   value={formatMMKShort(k.sales)} />
        <StatCard icon={IconReportMoney} tone="completed" label={t('posDash.profit')}  value={formatMMKShort(k.profit)} trend={{ dir: 'up', value: t('posDash.margin', { n: k.margin }) }} />
        <StatCard icon={IconReceipt}     tone="combined"  label={t('posDash.txns')}    value={k.txns} />
        <StatCard icon={IconShoppingBag} tone="pending"   label={t('posDash.basket')}  value={formatMMKShort(k.basket)} />
        <StatCard icon={IconPackage}     tone="store"     label={t('posDash.items')}   value={k.items} />
        <StatCard icon={IconArrowBackUp} tone="low"       label={t('posDash.returns')} value={k.returns} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="surface-card p-5 xl:col-span-2">
          <h3 className="text-[13px] font-semibold text-ink mb-3">{t('posDash.trendTitle')}</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="pRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F97316" stopOpacity={0.25} /><stop offset="95%" stopColor="#F97316" stopOpacity={0} /></linearGradient>
                <linearGradient id="pPro" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={0.25} /><stop offset="95%" stopColor="#10B981" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={v => formatMMK(v)} contentStyle={tip} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey={t('posDash.revenue')} stroke="#F97316" strokeWidth={2.5} fill="url(#pRev)" />
              <Area type="monotone" dataKey={t('posDash.profit')} stroke="#10B981" strokeWidth={2.5} fill="url(#pPro)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <Card title={t('posDash.paymentMethod')} pending="posDash.needsPayments">
          <BarList tone="#F59E0B" rows={mockPos.payments.map(p => ({ label: p.name, value: p.amount }))} />
          <p className="text-[13px] font-semibold text-ink mt-4">{t('posDash.cashInDrawer')}</p>
          <p className="text-lg font-bold text-ink tabular-nums">{formatMMK(mockPos.payments[0].amount)}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="surface-card p-5 xl:col-span-2">
          <h3 className="text-[13px] font-semibold text-ink mb-3">{t('posDash.hoursTitle')}</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={mockPos.hourly} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="h" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip formatter={v => formatMMK(v)} contentStyle={tip} />
              <Bar dataKey="v" radius={[3, 3, 0, 0]}>
                {mockPos.hourly.map((h, i) => <Cell key={i} fill={h.peak ? '#F59E0B' : '#F97316'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Card title={t('posDash.byCashier')} pending="posDash.needsCashier">
          <BarList rows={mockPos.cashiers.map(c => ({ label: c.name, value: c.amount }))} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title={t('posDash.topProducts')} pending="posDash.byProfit">
          <BarList tone="#10B981" rows={mockPos.topProducts.map(p => ({ label: p.name, value: p.profit }))} />
        </Card>
        <Card title={t('posDash.byCategory')}>
          <BarList rows={mockPos.categories.map(c => ({ label: c.name, value: c.amount }))} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title={t('posDash.lowStock')} pending="posDash.fromInventory">
          <div className="divide-y divide-app">
            {mockPos.lowStock.map(s => (
              <div key={s.name} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink">{s.name}</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${s.level === 'red' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                  {t('posDash.left', { n: s.left })}
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card title={t('posDash.recentReceipts')}>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-mute">
                <th className="py-1.5 font-medium">{t('posDash.voucher')}</th>
                <th className="py-1.5 font-medium">{t('posDash.time')}</th>
                <th className="py-1.5 font-medium text-center">{t('posDash.items')}</th>
                <th className="py-1.5 font-medium text-right">{t('posDash.total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {mockPos.recent.map(r => (
                <tr key={r.voucher}>
                  <td className="py-2 font-mono text-brand">{r.voucher}</td>
                  <td className="py-2 text-sub">{r.time}</td>
                  <td className="py-2 text-center text-ink tabular-nums">{r.items}</td>
                  <td className="py-2 text-right text-ink tabular-nums">{formatMMK(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function OnlineView() {
  const { t } = useTranslation();
  const o = mockPos.online;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={IconWorld}   tone="combined"  label={t('posDash.onlineRevenue')} value={formatMMKShort(o.kpis.revenue)} />
        <StatCard icon={IconReceipt} tone="store"     label={t('posDash.orders')}        value={o.kpis.orders} />
        <StatCard icon={IconTruck}   tone="pending"   label={t('posDash.pending')}       value={o.kpis.pending} />
        <StatCard icon={IconShoppingBag} tone="completed" label={t('posDash.aov')}       value={formatMMKShort(o.kpis.aov)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="surface-card p-5 xl:col-span-2">
          <h3 className="text-[13px] font-semibold text-ink mb-3">{t('posDash.ordersTrend')}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={o.trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tip} />
              <Bar dataKey="orders" fill="#3B82F6" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <Card title={t('posDash.orderStatus')}>
          <BarList tone="#3B82F6" fmt={v => v} rows={o.status.map(s => ({ label: t(`badge.${s.name}`), value: s.n }))} />
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card title={t('posDash.topProducts')}>
          <BarList tone="#3B82F6" rows={o.topProducts.map(p => ({ label: p.name, value: p.amount }))} />
        </Card>
        <Card title={t('posDash.deliveryByCity')} pending="posDash.fromShipping">
          <BarList tone="#3B82F6" fmt={v => v} rows={o.cities.map(c => ({ label: c.name, value: c.n }))} />
        </Card>
      </div>

      <Card title={t('posDash.recentOrders')}>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-mute">
              <th className="py-1.5 font-medium">{t('posDash.order')}</th>
              <th className="py-1.5 font-medium">{t('posDash.city')}</th>
              <th className="py-1.5 font-medium text-right">{t('posDash.total')}</th>
              <th className="py-1.5 font-medium text-right">{t('table.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app">
            {o.recent.map(r => (
              <tr key={r.order}>
                <td className="py-2 font-mono text-brand">{r.order}</td>
                <td className="py-2 text-sub">{r.city}</td>
                <td className="py-2 text-right text-ink tabular-nums">{formatMMK(r.total)}</td>
                <td className="py-2 text-right"><Badge label={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function CompareView() {
  const { t } = useTranslation();
  const g = mockPos.compare.glance;
  const rows = [
    { key: 'revenue', label: t('posDash.revenue'), fmt: formatMMK },
    { key: 'profit', label: t('posDash.profit'), fmt: formatMMK },
    { key: 'txns', label: t('posDash.txns'), fmt: v => v },
    { key: 'items', label: t('posDash.items'), fmt: v => v },
  ];
  const daily = mockPos.compare.daily.map(d => ({ day: d.day, [t('posDash.chInstore')]: d.instore, [t('posDash.chOnline')]: d.online }));
  const totalRev = g.instore.revenue + g.online.revenue;
  const posPct = Math.round((g.instore.revenue / totalRev) * 100);

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
                  <td className="py-2.5 text-right text-ink tabular-nums">{r.fmt(g.instore[r.key])}</td>
                  <td className="py-2.5 text-right text-ink tabular-nums">{r.fmt(g.online[r.key])}</td>
                  <td className="py-2.5 text-right font-medium text-ink tabular-nums">{r.fmt(g.instore[r.key] + g.online[r.key])}</td>
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
      <div className="flex items-center gap-2 text-xs text-mute">
        <IconInfoCircle size={14} stroke={1.6} /> {t('posDash.demoNote')}
      </div>

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
