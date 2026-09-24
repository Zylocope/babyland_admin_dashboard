import { useId } from 'react';
import { AreaChart, Area, BarChart, Bar, Treemap, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { formatMMK } from '../../utils/currency';
import { colorAt, seriesColor, referenceColor, STATUS } from '../../utils/chartPalette';
import { useTheme } from '../../context/ThemeContext';

const tip = { borderRadius: 10, border: '1px solid var(--border)', background: 'var(--s-menu-bg)', fontSize: 12, color: 'var(--text-primary)' };
const axis = { fontSize: 11, fill: 'var(--text-muted)' };
const short = value => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const dateLabel = date => date ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`)) : '';
const rangeLabel = range => range ? `${dateLabel(range.start)} – ${dateLabel(range.end)}` : '';

function LiquidTreemapCell({ depth, x, y, width, height, name, value, index, liquidId, darkMode, total }) {
  if (depth !== 1 || width < 5 || height < 5) return null;
  const color = colorAt(index ?? 0, darkMode);
  const cellId = `${liquidId}-${index}`;
  const inset = 2;
  const w = Math.max(0, width - inset * 2);
  const h = Math.max(0, height - inset * 2);
  const showName = w >= 62 && h >= 38;
  const showShare = w >= 82 && h >= 64;
  const maxChars = Math.max(4, Math.floor((w - 20) / 7));
  const label = name.length > maxChars ? `${name.slice(0, Math.max(3, maxChars - 1))}…` : name;
  const share = total > 0 ? `${(Number(value) / total * 100).toFixed(Number(value) / total >= 0.1 ? 0 : 1)}%` : '0%';

  return (
    <g className="liquid-treemap-cell">
      <defs>
        <linearGradient id={`${cellId}-fill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.98" />
          <stop offset="58%" stopColor={color} stopOpacity="0.78" />
          <stop offset="100%" stopColor={color} stopOpacity="0.52" />
        </linearGradient>
        <radialGradient id={`${cellId}-shine`} cx="22%" cy="8%" r="95%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.36" />
          <stop offset="42%" stopColor="#fff" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={x + inset} y={y + inset} width={w} height={h} rx={Math.min(12, w / 5, h / 5)}
        fill={`url(#${cellId}-fill)`} className="liquid-treemap-shape" />
      <rect x={x + inset + 1} y={y + inset + 1} width={Math.max(0, w - 2)} height={Math.max(0, h - 2)}
        rx={Math.min(11, w / 5, h / 5)} fill={`url(#${cellId}-shine)`}
        stroke="rgba(255,255,255,.32)" strokeWidth="1" pointerEvents="none" />
      {showName && (
        <text x={x + width / 2} y={y + height / 2 - (showShare ? 5 : -4)} textAnchor="middle"
          className="liquid-treemap-label" pointerEvents="none">{label}</text>
      )}
      {showShare && (
        <text x={x + width / 2} y={y + height / 2 + 15} textAnchor="middle"
          className="liquid-treemap-share" pointerEvents="none">{share}</text>
      )}
    </g>
  );
}

export default function AssistantChart({ spec }) {
  const { t } = useTranslation();
  const { darkMode } = useTheme();
  const id = useId().replace(/:/g, '');
  if (!spec) return null;
  const brand = seriesColor(darkMode);
  const money = spec.kind !== 'stock';
  const valueLabel = value => money ? formatMMK(value) : Number(value).toLocaleString('en-US');
  const title = t(spec.titleKey ?? `assistant.tool.${spec.tool}`, t('aiChart.title'));
  const current = t('aiChart.current'), previous = t('aiChart.previous');
  const revenue = t('posDash.revenue');
  const horizontal = spec.kind === 'stock';
  const metric = spec.kind === 'stock' ? t('table.stock') : t(spec.metricKey ?? 'posDash.revenue');
  const allRows = spec.allData ?? spec.data;
  const treeData = spec.kind === 'treemap'
    ? spec.data.map(row => ({ ...row, name: row.other ? t('aiChart.other') : row.label }))
    : [];
  const treeTotal = treeData.reduce((sum, row) => sum + Number(row.value ?? 0), 0);
  const maxValue = Math.max(1, ...spec.data.map(row => Number(row.stock ?? row.value ?? 0)));
  const period = row => rangeLabel({ start: row.date, end: row.endDate ?? row.date });
  const columns = spec.kind === 'sales'
    ? [t('aiChart.period'), revenue, t('posDash.chInstore'), t('posDash.chOnline')]
    : spec.kind === 'compare' ? [t('aiChart.metric'), previous, current] : [t('aiChart.item'), metric];
  const rows = allRows.map(row => spec.kind === 'sales'
    ? [period(row), row.revenue, row.inStore, row.online]
    : spec.kind === 'compare' ? [t(`posDash.${row.metric}`), row.previous, row.current]
      : [row.name ?? row.fullLabel ?? row.label, row.stock ?? row.value]);
  // Summary tiles read allRows, never spec.data. spec.data is capped for the
  // chart (8 bars), so summing it produced a "Total" covering a third of the
  // rows while "Entries" beside it counted all of them.
  const value = row => Number(row.revenue ?? row.stock ?? row.value ?? row.current ?? 0);
  const summaryTotal = allRows.reduce((sum, row) => sum + value(row), 0);
  const peakRow = allRows.reduce((best, row) => (best && value(best) >= value(row) ? best : row), null) ?? {};
  const comparePrevious = Number(spec.data[0]?.previous ?? 0);
  const compareCurrent = Number(spec.data[0]?.current ?? 0);
  const compareChange = comparePrevious ? `${(((compareCurrent - comparePrevious) / comparePrevious) * 100).toFixed(1)}%` : '—';
  const summary = spec.kind === 'compare'
    ? [
        [previous, valueLabel(comparePrevious)],
        [current, valueLabel(compareCurrent)],
        [t('aiChart.change'), compareChange],
      ]
    : spec.kind === 'stock'
      ? [[t('aiChart.items'), Number(spec.totalCount ?? allRows.length).toLocaleString()], [t('aiChart.critical'), allRows.filter(row => Number(row.stock) <= 5).length.toLocaleString()], [t('table.threshold'), Number(spec.threshold ?? 0).toLocaleString()]]
      : [
          [t('table.total'), valueLabel(summaryTotal)],
          [t('aiChart.peak'), peakRow.name ?? peakRow.fullLabel ?? peakRow.label ?? (peakRow.date ? dateLabel(peakRow.date) : '—')],
          [t('aiChart.entries'), Number(spec.totalCount ?? allRows.length).toLocaleString()],
        ];

  return (
    <figure className="surface-card is-sheet no-lens mt-3 p-3 sm:p-4 min-w-0" aria-labelledby={`${id}-title`}>
      <figcaption className="mb-4 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id={`${id}-title`} className="text-sm font-semibold text-ink">{title}</h3>
          <span className="text-[11px] text-mute">{money ? 'MMK' : t('aiChart.units')}</span>
        </div>
        {spec.range && <p className="text-xs text-sub">{rangeLabel(spec.range)}</p>}
        {spec.currentRange && <p className="text-xs text-sub">{current}: {rangeLabel(spec.currentRange)}<br />{previous}: {rangeLabel(spec.previousRange)}</p>}
        {spec.bucketDays > 1 && <p className="text-[11px] text-mute">{t('aiChart.groupedDays', { days: spec.bucketDays })}</p>}
        {spec.groupedCount > 0 && <p className="text-[11px] text-mute">{t('aiChart.groupedOther', { count: spec.groupedCount })}</p>}
        {spec.kind !== 'treemap' && spec.totalCount > spec.data.length && <p className="text-[11px] text-mute">{t('aiChart.showing', { count: spec.data.length, total: spec.totalCount })}</p>}
      </figcaption>

      <div className="chart-summary-grid mb-4">
        {summary.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
      </div>

      {spec.kind === 'treemap' ? (
        <div className="w-full min-w-0 liquid-treemap" role="img" aria-label={t('aiChart.chartDescription', { title })}>
          <ResponsiveContainer width="100%" height={280} minWidth={0}>
            <Treemap data={treeData} dataKey="value" nameKey="name" aspectRatio={4 / 3}
              isAnimationActive="auto" animationDuration={650} animationEasing="ease-out"
              content={props => <LiquidTreemapCell {...props} liquidId={id} darkMode={darkMode} total={treeTotal} />}>
              <Tooltip formatter={valueLabel} contentStyle={tip} wrapperStyle={{ outline: 'none' }} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      ) : horizontal ? (
        <div className="space-y-3">
          {spec.data.map((row, i) => {
            const value = Number(row.stock ?? row.value);
            const fill = spec.kind === 'stock' ? (value <= 5 ? STATUS.critical : STATUS.warning) : colorAt(i, darkMode);
            return (
              <div key={i} className="space-y-1.5">
                <div className="flex items-start justify-between gap-3 text-xs">
                  <span className="text-ink min-w-0 break-words leading-relaxed">{row.name ?? row.label}</span>
                  <span className="text-ink font-semibold tabular-nums shrink-0">{valueLabel(value)}</span>
                </div>
                <div aria-hidden="true" className="h-2 rounded-full bg-app overflow-hidden">
                  <div className="chart-bar-grow h-full rounded-full" style={{
                    width: `${Math.max(0, value) / maxValue * 100}%`,
                    animationDelay: `${i * 45}ms`,
                    background: `linear-gradient(90deg, color-mix(in srgb, ${fill} 48%, transparent), ${fill})`,
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="w-full min-w-0" role="img" aria-label={t('aiChart.chartDescription', { title })}>
          <ResponsiveContainer width="100%" height={250} minWidth={0}>
            {spec.kind === 'sales' ? (
              <AreaChart data={spec.data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <defs><linearGradient id={`${id}-revenue`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={brand} stopOpacity={0.2} /><stop offset="100%" stopColor={brand} stopOpacity={0.02} /></linearGradient></defs>
                <CartesianGrid strokeDasharray="3 4" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={axis} tickFormatter={v => dateLabel(v).replace(/ \d{4}$/, '')} axisLine={false} tickLine={false} minTickGap={28} />
                <YAxis tick={axis} tickFormatter={short} axisLine={false} tickLine={false} width={48} />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload ? period(payload[0].payload) : ''} formatter={valueLabel} contentStyle={tip} wrapperStyle={{ outline: 'none' }} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Area type="linear" dataKey="revenue" name={revenue} stroke={brand} strokeWidth={2} fill={`url(#${id}-revenue)`} isAnimationActive={false} />
                {spec.hasOnline && <Area type="linear" dataKey="inStore" name={t('posDash.chInstore')} stroke={referenceColor(darkMode)} strokeWidth={1.5} fill="none" isAnimationActive={false} />}
                {spec.hasOnline && <Area type="linear" dataKey="online" name={t('posDash.chOnline')} stroke={colorAt(1, darkMode)} strokeWidth={1.5} fill="none" isAnimationActive={false} />}
              </AreaChart>
            ) : (
              <BarChart data={spec.kind === 'compare' ? spec.data.map(row => ({ ...row, label: t(`posDash.${row.metric}`) })) : spec.data} margin={{ top: 8, right: 12, left: 0, bottom: 4 }} barGap={6}>
                <defs>
                  <linearGradient id={`${id}-bar`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={brand} stopOpacity="1" />
                    <stop offset="55%" stopColor={brand} stopOpacity="0.78" />
                    <stop offset="100%" stopColor={brand} stopOpacity="0.42" />
                  </linearGradient>
                  <linearGradient id={`${id}-reference`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={referenceColor(darkMode)} stopOpacity="0.82" />
                    <stop offset="100%" stopColor={referenceColor(darkMode)} stopOpacity="0.32" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 4" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} minTickGap={10} />
                <YAxis tick={axis} tickFormatter={short} axisLine={false} tickLine={false} width={48} />
                <Tooltip formatter={valueLabel} contentStyle={tip} wrapperStyle={{ outline: 'none' }} cursor={{ fill: 'var(--orange-light)', opacity: 0.45 }} />
                {spec.kind === 'compare' && <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
                {spec.kind === 'compare' && <Bar dataKey="previous" name={previous} fill={`url(#${id}-reference)`} maxBarSize={42} radius={[8, 8, 2, 2]} animationDuration={560} animationEasing="ease-out" />}
                <Bar dataKey={spec.kind === 'compare' ? 'current' : 'value'} name={spec.kind === 'compare' ? current : metric} fill={`url(#${id}-bar)`} maxBarSize={42} radius={[8, 8, 2, 2]} animationDuration={650} animationEasing="ease-out" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      <details className="mt-4 border-t border-app pt-3">
        <summary className="text-xs text-sub cursor-pointer hover:text-brand w-fit">{t('aiChart.viewData')}</summary>
        <div className="overflow-x-auto mt-3">
          <table className="w-full text-xs text-left">
            <caption className="sr-only">{title}</caption>
            <thead><tr>{columns.map((label, i) => <th key={i} scope="col" className="p-2 text-sub whitespace-nowrap">{label}</th>)}</tr></thead>
            <tbody>{rows.map((row, i) => <tr key={i} className="border-t border-app">{row.map((value, j) => <td key={j} className={`p-2 text-ink ${j ? 'tabular-nums whitespace-nowrap' : 'min-w-28'}`}>{j ? valueLabel(value) : value}</td>)}</tr>)}</tbody>
          </table>
        </div>
        {spec.totalCount > allRows.length && <p className="mt-2 text-xs text-mute">{t('aiChart.returned', { count: allRows.length, total: spec.totalCount })}</p>}
      </details>
    </figure>
  );
}
