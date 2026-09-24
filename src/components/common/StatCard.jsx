import { IconArrowUpRight, IconArrowDownRight } from '@tabler/icons-react';

// KPI card — themed via .surface-card, decorative corner circle, ring-bordered icon.
const TONES = {
  store:     '#F97316',
  ticket:    '#10B981',
  combined:  '#3B82F6',
  pending:   '#F59E0B',
  completed: '#10B981',
  low:       '#EF4444',
};

// "2.2M MMK" set as one 36px extrabold run reads as a wall — the unit competes
// with the number for the same weight and size. Both currency helpers always
// end in " MMK", so the trailing word is split off and set smaller and lighter.
// Anything without a trailing word ("23", "—", "Unavailable") renders whole.
const splitUnit = (value) => {
  // A node (a skeleton while the figure loads) is rendered as-is; only a string
  // gets its trailing unit peeled off for smaller type.
  if (typeof value !== 'string' && typeof value !== 'number') return { amount: value, unit: null };
  const match = /^(.*\S)\s+([A-Za-z]+)$/.exec(String(value ?? ''));
  return match ? { amount: match[1], unit: match[2] } : { amount: value, unit: null };
};

export default function StatCard({ icon: Icon, label, value, tone = 'store', trend, onClick }) {
  const c = TONES[tone] ?? TONES.store;
  const up = trend?.dir === 'up';
  const { amount, unit } = splitUnit(value);

  return (
    <div
      onClick={onClick}
      className={`surface-card p-5 relative overflow-hidden
        hover:-translate-y-0.5 ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Decorative circle, top-right */}
      <span
        className="absolute -top-8 -right-8 w-24 h-24 rounded-full pointer-events-none"
        style={{ background: c, opacity: 0.12 }}
      />

      <div className="flex items-start justify-between relative">
        {/* Icon in circular ring border */}
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center"
          style={{ border: `2px solid ${c}` }}
        >
          <Icon size={20} stroke={1.8} style={{ color: c }} />
        </div>
        {trend && (
          <span className="inline-flex items-center gap-0.5 text-[13px] font-semibold" style={{ color: up ? '#10B981' : '#EF4444' }}>
            {up ? <IconArrowUpRight size={15} stroke={1.8} /> : <IconArrowDownRight size={15} stroke={1.8} />}
            {trend.value}
          </span>
        )}
      </div>

      {/* Down from 36px/extrabold/tracking-tight: at that weight "17.3M MMK"
          wrapped onto two lines in a narrow card. tabular-nums keeps the digits
          aligned as the figure changes. */}
      <p className="mt-3 leading-[1.1] text-ink font-bold tracking-[-0.01em] tabular-nums text-[26px] sm:text-[30px]">
        {amount}
        {unit && <span className="ml-1.5 text-[0.55em] font-semibold text-sub tracking-normal align-baseline">{unit}</span>}
      </p>
      <p className="text-[13px] text-sub mt-2">{label}</p>
    </div>
  );
}
