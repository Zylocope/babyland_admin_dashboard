import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatMMK } from '../../utils/currency';

const tip = {
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'var(--bg-card)',
  fontSize: 12,
  color: 'var(--text-primary)',
};
const axis = { fontSize: 11, fill: 'var(--text-muted)' };
const short = v => `${(v / 1000).toFixed(0)}K`;

export default function AssistantChart({ spec }) {
  const { t } = useTranslation();
  if (!spec) return null;

  if (spec.kind === 'sales') {
    const inStore = t('posDash.chInstore');
    const online = t('posDash.chOnline');
    return (
      <div className="mt-2 border border-app rounded-xl p-3">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={spec.data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="aiRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={short} width={40} />
            <Tooltip formatter={v => formatMMK(v)} contentStyle={tip} />
            {spec.hasOnline && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {spec.hasOnline ? (
              <>
                <Area type="monotone" dataKey="inStore" name={inStore} stroke="#F97316" strokeWidth={2} fill="url(#aiRev)" />
                <Area type="monotone" dataKey="online" name={online} stroke="#3B82F6" strokeWidth={2} fill="none" />
              </>
            ) : (
              <Area type="monotone" dataKey="revenue" name={t('posDash.revenue')} stroke="#F97316" strokeWidth={2.5} fill="url(#aiRev)" />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (spec.kind === 'stock') {
    return (
      <div className="mt-2 border border-app rounded-xl p-3">
        <ResponsiveContainer width="100%" height={Math.max(120, spec.data.length * 28)}>
          <BarChart data={spec.data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
            <XAxis type="number" tick={axis} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis type="category" dataKey="name" tick={axis} axisLine={false} tickLine={false} width={130} />
            <Tooltip contentStyle={tip} />
            <Bar dataKey="stock" name={t('table.stock')} radius={[0, 3, 3, 0]} barSize={14}>
              {spec.data.map((row, i) => (
                // Red once it is genuinely nearly gone, amber for merely low.
                <Cell key={i} fill={row.stock <= 5 ? '#EF4444' : '#F59E0B'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}
