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

export default function StatCard({ icon: Icon, label, value, tone = 'store', trend, onClick }) {
  const c = TONES[tone] ?? TONES.store;
  const up = trend?.dir === 'up';

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

      <p className="text-[36px] font-extrabold text-ink mt-3 leading-none break-words tracking-tight">{value}</p>
      <p className="text-[13px] text-sub mt-1.5">{label}</p>
    </div>
  );
}
