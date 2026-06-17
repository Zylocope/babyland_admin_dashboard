import { mockReports, mockProducts, mockOrders, mockTickets } from '../data/mock';
import { formatMMK } from '../utils/currency';
import { format } from 'date-fns';
import { IconAlertTriangle, IconDownload } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const lowStockItems = mockProducts.filter(p => p.stock <= p.lowStockThreshold);

export default function Reports() {
  const { t: tr } = useTranslation();
  const storeSeries = tr('reports.chartStore');
  const ticketSeries = tr('reports.chartTicket');

  const chartData = mockReports.dailySales.map(r => ({
    date: format(new Date(r.date), 'MMM d'),
    [storeSeries]: r.storeSales,
    [ticketSeries]: r.ticketSales,
  }));

  const totalStore = mockReports.dailySales.reduce((s, r) => s + r.storeSales, 0);
  const totalTickets = mockReports.dailySales.reduce((s, r) => s + r.ticketSales, 0);

  const statusPill = (status) =>
    status === 'Confirmed' || status === 'Delivered' ? 'bg-green-100 text-green-700' :
    status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
    status === 'Used' ? 'bg-gray-100 text-gray-500' :
    status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700';

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: tr('reports.storeRevenue7d'), value: formatMMK(totalStore), color: 'bg-brand-light text-brand' },
          { label: tr('reports.ticketRevenue7d'), value: formatMMK(totalTickets), color: 'bg-green-50 text-green-700' },
          { label: tr('reports.totalRevenue7d'), value: formatMMK(totalStore + totalTickets), color: 'bg-blue-50 text-blue-700' },
          { label: tr('reports.lowStockItems'), value: lowStockItems.length, color: 'bg-red-50 text-red-600' },
        ].map(c => (
          <div key={c.label} className={`${c.color} rounded-xl p-5`}>
            <p className="text-xs font-medium opacity-70 mb-1">{c.label}</p>
            <p className="text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-app">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-ink">{tr('reports.revenueBreakdown')}</h3>
          <button className="text-xs text-sub flex items-center gap-1.5 border border-app px-3 py-1.5 rounded-lg hover:bg-brand-light transition-colors">
            <IconDownload stroke={1.5} size={13} /> {tr('common.export')}
          </button>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="repStore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F97316" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#F97316" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="repTicket" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10B981" stopOpacity={0.25}/>
                <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
            <Tooltip formatter={(v) => formatMMK(v)} contentStyle={{ borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-card)', fontSize: 12, color: 'var(--text-primary)' }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Area type="monotone" dataKey={storeSeries} stroke="#F97316" strokeWidth={2.5} fill="url(#repStore)" />
            <Area type="monotone" dataKey={ticketSeries} stroke="#10B981" strokeWidth={2.5} fill="url(#repTicket)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily orders summary */}
        <div className="bg-card rounded-xl shadow-card border border-app overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-app">
            <h3 className="font-semibold text-ink">{tr('reports.onlineSales')}</h3>
            <button className="text-xs text-mute flex items-center gap-1.5 hover:text-sub"><IconDownload stroke={1.5} size={13} /> {tr('common.export')}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white bg-brand">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">{tr('table.orderId')}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{tr('table.customer')}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{tr('table.status')}</th>
                  <th className="px-4 py-2.5 text-right font-medium">{tr('table.amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {mockOrders.slice(0, 6).map(o => (
                  <tr key={o.id} className="hover:bg-brand-light">
                    <td className="px-5 py-3 font-mono text-xs text-brand">{o.id}</td>
                    <td className="px-4 py-3 text-ink">{o.customerName}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusPill(o.status)}`}>{tr(`badge.${o.status}`)}</span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-ink">{formatMMK(o.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-app bg-base">
                <tr>
                  <td colSpan={3} className="px-5 py-2.5 text-right text-xs font-semibold text-sub">{tr('table.total')}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-brand text-sm">
                    {formatMMK(mockOrders.reduce((s, o) => s + o.total, 0))}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Low stock list */}
        <div className="bg-card rounded-xl shadow-card border border-app overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-app">
            <h3 className="font-semibold text-ink flex items-center gap-2">
              <IconAlertTriangle stroke={1.5} size={15} className="text-red-500" /> {tr('reports.lowStockList')}
            </h3>
            <button className="text-xs text-mute flex items-center gap-1.5 hover:text-sub"><IconDownload stroke={1.5} size={13} /> {tr('common.export')}</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[15px]">
              <thead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white bg-brand">
                <tr>
                  <th className="px-5 py-2.5 text-left font-medium">{tr('table.product')}</th>
                  <th className="px-4 py-2.5 text-left font-medium">{tr('table.category')}</th>
                  <th className="px-4 py-2.5 text-center font-medium">{tr('table.stock')}</th>
                  <th className="px-4 py-2.5 text-center font-medium">{tr('table.threshold')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-app">
                {lowStockItems.map(p => (
                  <tr key={p.id} className="hover:bg-red-50/30">
                    <td className="px-5 py-3 font-medium text-ink">{p.name}</td>
                    <td className="px-4 py-3 text-sub">{p.category}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-bold text-red-600">{p.stock}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-sub">{p.lowStockThreshold}</td>
                  </tr>
                ))}
                {lowStockItems.length === 0 && (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-mute">{tr('dashboard.allStocked')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Playground bookings summary */}
      <div className="bg-card rounded-xl shadow-card border border-app overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-app">
          <h3 className="font-semibold text-ink">{tr('reports.bookingsSummary')}</h3>
          <button className="text-xs text-mute flex items-center gap-1.5 hover:text-sub"><IconDownload stroke={1.5} size={13} /> {tr('common.export')}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white bg-brand">
              <tr>
                <th className="px-5 py-2.5 text-left font-medium">{tr('table.bookingId')}</th>
                <th className="px-4 py-2.5 text-left font-medium">{tr('table.customer')}</th>
                <th className="px-4 py-2.5 text-left font-medium">{tr('table.visitDate')}</th>
                <th className="px-4 py-2.5 text-center font-medium">{tr('table.qty')}</th>
                <th className="px-4 py-2.5 text-left font-medium">{tr('table.type')}</th>
                <th className="px-4 py-2.5 text-left font-medium">{tr('table.status')}</th>
                <th className="px-4 py-2.5 text-right font-medium">{tr('table.amount')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {mockTickets.map(bk => (
                <tr key={bk.id} className="hover:bg-brand-light">
                  <td className="px-5 py-3 font-mono text-xs text-brand">{bk.id}</td>
                  <td className="px-4 py-3 text-ink">{bk.customerName}</td>
                  <td className="px-4 py-3 text-sub">{bk.visitDate}</td>
                  <td className="px-4 py-3 text-center text-ink">{bk.qty}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bk.type === 'Walk-in' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>{bk.type}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusPill(bk.status)}`}>{tr(`badge.${bk.status}`)}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-ink">{formatMMK(bk.amount)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-app bg-base">
              <tr>
                <td colSpan={6} className="px-5 py-2.5 text-right text-xs font-semibold text-sub">{tr('table.total')}</td>
                <td className="px-4 py-2.5 text-right font-bold text-brand text-sm">
                  {formatMMK(mockTickets.reduce((s, bk) => s + bk.amount, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
