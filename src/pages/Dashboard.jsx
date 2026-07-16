import { IconCash, IconClock, IconCircleCheck, IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import { mockDashboard, mockProducts, mockReports } from '../data/mock';
import { formatMMK, formatMMKShort } from '../utils/currency';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

const lowStockItems = mockProducts.filter(p => p.stock <= p.lowStockThreshold);

export default function Dashboard() {
  const { t } = useTranslation();
  const d = mockDashboard;

  const chartData = mockReports.dailySales.map(r => ({
    date: format(new Date(r.date), 'MMM d'),
    [t('dashboard.store')]: r.storeSales,
  }));

  return (
    <div className="space-y-6">
      {/* Row 1 — 6 stat cards, equal width */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={IconCash}          tone="store"     label={t('dashboard.storeSales')}      value={formatMMKShort(d.todayStoreSales)}  trend={{ dir: 'up', value: '8.2%' }} />
        <StatCard icon={IconClock}         tone="pending"   label={t('dashboard.pendingOrders')}   value={d.pendingOrders} />
        <StatCard icon={IconCircleCheck}   tone="completed" label={t('dashboard.completedOrders')} value={d.completedOrders} />
        <StatCard icon={IconAlertTriangle} tone="low"       label={t('dashboard.lowStockItems')}   value={lowStockItems.length} trend={{ dir: 'down', value: '2' }} />
      </div>

      {/* Row 2 — asymmetric bento: chart 8/12, alerts 4/12 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <div className="xl:col-span-8 surface-card p-6">
          <h3 className="font-semibold text-ink mb-4">{t('dashboard.revenue7d')}</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorStore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v) => formatMMK(v)} contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 12, color: 'var(--text-primary)' }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey={t('dashboard.store')} stroke="#F97316" strokeWidth={2.5} fill="url(#colorStore)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="xl:col-span-4 surface-card p-6">
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <IconAlertTriangle size={16} stroke={1.5} className="text-[#EF4444]" /> {t('dashboard.lowStockAlerts')}
          </h3>
          {lowStockItems.length === 0 ? (
            <p className="text-sm text-mute">{t('dashboard.allStocked')}</p>
          ) : (
            <div className="space-y-3 max-h-[230px] overflow-y-auto pr-1">
              {lowStockItems.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{p.name}</p>
                    <p className="text-xs text-mute">{p.category}</p>
                  </div>
                  <span className="flex-shrink-0 inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-semibold bg-red-50 text-red-600 border-red-200">
                    {t('dashboard.left', { count: p.stock })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Row 3 — full width recent orders */}
      <div className="surface-card overflow-hidden">
        <div className="px-6 py-4 border-b border-app">
          <h3 className="font-semibold text-ink">{t('dashboard.recentOrders')}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white bg-brand">
                <th className="px-6 py-3">{t('table.orderId')}</th>
                <th className="px-4 py-3">{t('table.customer')}</th>
                <th className="px-4 py-3">{t('table.date')}</th>
                <th className="px-4 py-3">{t('table.amount')}</th>
                <th className="px-4 py-3">{t('table.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {d.recentOrders.map(o => (
                <tr key={o.id} className="hover:bg-brand-light transition-colors cursor-pointer">
                  <td className="px-6 py-3.5 font-mono text-xs text-brand font-semibold">{o.id}</td>
                  <td className="px-4 py-3.5 text-ink">{o.customerName}</td>
                  <td className="px-4 py-3.5 text-sub">{o.date}</td>
                  <td className="px-4 py-3.5 font-medium text-ink tabular-nums">{formatMMK(o.total)}</td>
                  <td className="px-4 py-3.5"><Badge label={o.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
