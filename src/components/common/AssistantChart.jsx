import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatMMK } from '../../utils/currency';
import { colorAt, seriesColor, referenceColor, STATUS } from '../../utils/chartPalette';
import { useTheme } from '../../context/ThemeContext';

const tip = {
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'var(--s-menu-bg, var(--bg-card))',
  fontSize: 12,
  color: 'var(--text-primary)',
};
const axis = { fontSize: 11, fill: 'var(--text-muted)' };
const short = v => `${(v / 1000).toFixed(0)}K`;

export default function AssistantChart({ spec }) {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const brand = seriesColor(darkMode);
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
                <stop offset="5%" stopColor={brand} stopOpacity={0.3} />
                <stop offset="95%" stopColor={brand} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} minTickGap={16} />
            <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={short} width={40} />
            <Tooltip formatter={v => formatMMK(v)} contentStyle={tip} />
            {spec.hasOnline && <Legend wrapperStyle={{ fontSize: 11 }} />}
            {spec.hasOnline ? (
              <>
                <Area type="monotone" dataKey="inStore" name={inStore} stroke={brand} strokeWidth={2} fill="url(#aiRev)" />
                <Area type="monotone" dataKey="online" name={online} stroke={colorAt(1, darkMode)} strokeWidth={2} fill="none" />
              </>
            ) : (
              <Area type="monotone" dataKey="revenue" name={t('posDash.revenue')} stroke={brand} strokeWidth={2.5} fill="url(#aiRev)" />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (spec.kind === 'compare') {
    const rows = spec.data.map(d => ({ ...d, metric: t(`posDash.${d.metric}`) }));
    return (
      <div className="mt-2 border border-app rounded-xl p-3">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={rows} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="metric" tick={axis} axisLine={false} tickLine={false} />
            <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={short} width={40} />
            <Tooltip formatter={v => formatMMK(v)} contentStyle={tip} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="previous" name={t('aiChart.previous')} fill={referenceColor(darkMode)} isAnimationActive={false} />
            <Bar dataKey="current" name={t('aiChart.current')} fill={brand} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (spec.kind === 'bars') {
    const money = spec.unit === 'mmk';
    return (
      <div className="mt-2 border border-app rounded-xl p-3">
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={spec.data} margin={{ top: 5, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval={0} />
            <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={money ? short : undefined} width={40} allowDecimals={false} />
            <Tooltip formatter={v => (money ? formatMMK(v) : v)} contentStyle={tip} />
            <Bar dataKey="value" name={money ? t('posDash.revenue') : t('table.stock')} isAnimationActive={false}>
              {spec.data.map((row, i) => (
                <Cell key={row.label} fill={spec.categorical ? colorAt(i, darkMode) : brand} />
              ))}
            </Bar>
          </BarChart>
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
            <Bar dataKey="stock" name={t('table.stock')} barSize={14} isAnimationActive={false}>
              {spec.data.map((row, i) => (
                // Red once it is genuinely nearly gone, amber for merely low.
                <Cell key={i} fill={row.stock <= 5 ? STATUS.critical : STATUS.warning} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return null;
}
