import { useMemo, useState } from 'react';
import { IconGift, IconUserPlus, IconCheck, IconAlertTriangle, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SearchInput from '../components/common/SearchInput';
import Gauge from '../components/common/Gauge';
import { usePlaygroundVisitors, PLAYGROUND_FREE_AT, today } from '../hooks/usePlaygroundVisitors';


const PERIODS = [
  { key: 'today', days: 0 },
  { key: 'd7', days: 7 },
  { key: 'd30', days: 30 },
  { key: 'all', days: null },
];

function MiniStat({ label, value, pct, color }) {
  return (
    <div className="flex-1 min-w-0">
      <p className="text-[11px] text-sub truncate">{label}</p>
      <p className="text-[19px] font-bold text-ink tabular-nums leading-tight mt-0.5">{value}</p>
      <div className="h-1.5 rounded-full bg-app overflow-hidden mt-2">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function Legend({ label, value, color }) {
  return (
    <div className="border-l-2 pl-3" style={{ borderColor: color ?? 'var(--border)' }}>
      <p className="text-[11px] text-sub truncate">{label}</p>
      <p className="text-[17px] font-bold text-ink tabular-nums leading-tight">{value}</p>
    </div>
  );
}

export default function Playground() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState('all');

  const {
    visitors, log, phone, setPhone, name, setName,
    result, conflict, setConflict, checkIn, award,
    freeToday, readyForFree, totalVisits,
  } = usePlaygroundVisitors();

  // The period control filters the card list by last visit. It deliberately does
  // NOT drive the figures above: check-ins are session-local, so daily/weekly/
  // monthly would all read the same and the control would be decoration
  // pretending to be a filter.
  const filtered = useMemo(() => {
    const days = PERIODS.find(p => p.key === period)?.days;
    const cutoff = days == null ? null : new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
    return visitors.filter(v => {
      const matches = v.phone.includes(search) || v.name.toLowerCase().includes(search.toLowerCase());
      if (!matches) return false;
      if (cutoff == null) return true;
      return days === 0 ? v.lastVisit === today() : v.lastVisit >= cutoff;
    });
  }, [visitors, search, period]);

  const pct = (n, d) => (d ? Math.round((n / d) * 100) : 0);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        {/* Hero figure, then the trio with progress bars */}
        <div className="xl:col-span-7 surface-card p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] text-sub">{t('playground.totalVisits')}</p>
              <p className="text-[46px] font-extrabold text-ink tabular-nums leading-none tracking-tight mt-1">
                {totalVisits.toLocaleString()}
              </p>
            </div>
            {/* The staff app has no other entry point — it lives outside AppLayout,
                so it is not in the sidebar. */}
            <Link to="/playground-app"
              className="press-spring inline-flex items-center gap-1 text-[12px] font-semibold text-brand border border-app rounded-full px-3 py-1.5 hover:bg-brand-light transition-colors">
              {t('playground.openStaffApp')}
              <IconChevronRight size={13} stroke={2} />
            </Link>
          </div>

          <div className="flex gap-5 mt-6">
            <MiniStat label={t('playground.totalVisitors')} value={visitors.length}
              pct={visitors.length ? 100 : 0} color="var(--orange-primary)" />
            <MiniStat label={t('playground.readyForFree')} value={readyForFree}
              pct={pct(readyForFree, visitors.length)} color="var(--series-2-ink)" />
            <MiniStat label={t('playground.freeGivenToday')} value={freeToday}
              pct={pct(freeToday, log.length)} color="var(--status-delivered)" />
          </div>
        </div>

        {/* Gauge — today's check-ins, split by kind */}
        <div className="xl:col-span-5 surface-card p-6">
          <p className="text-[13px] font-semibold text-ink">{t('playground.todayBreakdown')}</p>
          <div className="flex flex-wrap items-center gap-4 mt-1">
            <div className="relative flex-shrink-0">
              <Gauge segments={[
                { value: log.length - freeToday, color: 'var(--orange-primary)' },
                { value: freeToday, color: 'var(--series-2-ink)' },
              ]} />
              <div className="absolute inset-x-0 bottom-1 text-center">
                <p className="text-[30px] font-extrabold text-ink tabular-nums leading-none">{log.length}</p>
                <p className="text-[11px] text-sub mt-1">{t('playground.checkInsToday')}</p>
              </div>
            </div>
            <div className="flex-1 min-w-[9rem] space-y-3">
              <Legend label={t('playground.pointVisits')} value={log.length - freeToday} color="var(--orange-primary)" />
              <Legend label={t('playground.free')} value={freeToday} color="var(--series-2-ink)" />
              <Legend label={t('playground.readyForFree')} value={readyForFree} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <div className="xl:col-span-5 surface-card p-6">
          <h3 className="font-semibold text-ink mb-1">{t('playground.checkInTitle')}</h3>
          <p className="text-[13px] text-sub mb-4">{t('playground.checkInDesc', { n: PLAYGROUND_FREE_AT })}</p>

          <form onSubmit={checkIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">{t('table.phone')}</label>
              <input value={phone} onChange={e => { setPhone(e.target.value); setConflict(null); }} required
                placeholder="09-xxx-xxx-xxx" inputMode="tel"
                className="w-full px-3 py-2.5 text-sm bg-card border border-app rounded-xl focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1">{t('playground.customerName')}</label>
              <input value={name} onChange={e => { setName(e.target.value); setConflict(null); }} required
                className="w-full px-3 py-2.5 text-sm bg-card border border-app rounded-xl focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>

            {conflict && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 space-y-2">
                <p className="text-sm text-amber-800 flex items-start gap-2">
                  <IconAlertTriangle size={16} stroke={1.8} className="mt-0.5 flex-shrink-0" />
                  {t('playground.nameMismatch', { name: conflict.visitor.name })}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => { setName(conflict.visitor.name); award(conflict.visitor, conflict.visitor.name); }}
                    className="px-3 py-1.5 text-xs rounded-lg bg-brand text-white font-medium cursor-pointer">
                    {t('playground.useExisting', { name: conflict.visitor.name })}
                  </button>
                  <button type="button" onClick={() => award({ ...conflict.visitor, name: conflict.typedName }, conflict.typedName)}
                    className="px-3 py-1.5 text-xs rounded-lg border border-app text-sub hover:bg-brand-light cursor-pointer">
                    {t('playground.updateName', { name: conflict.typedName })}
                  </button>
                </div>
              </div>
            )}

            <button type="submit" className="btn-primary w-full justify-center py-3">
              <IconUserPlus size={17} stroke={1.8} /> {t('playground.checkIn')}
            </button>
          </form>

          {result && (
            <div className={`mt-4 rounded-xl p-4 border ${result.kind === 'free'
              ? 'border-green-300 bg-green-50'
              : 'border-app bg-brand-light'}`}>
              {result.kind === 'free' ? (
                <>
                  <p className="font-bold text-green-700 flex items-center gap-2">
                    <IconGift size={18} stroke={1.8} /> {t('playground.freeVisit')}
                  </p>
                  <p className="text-sm text-green-800 mt-1">
                    {t('playground.freeVisitDesc', { name: result.visitor.name })}
                  </p>
                </>
              ) : (
                <p className="text-sm text-ink">
                  <span className="font-semibold">{result.visitor.name}</span>
                  {' — '}
                  {t('playground.pointAdded', { points: result.visitor.points, n: PLAYGROUND_FREE_AT })}
                  {result.visitor.points >= PLAYGROUND_FREE_AT && (
                    <span className="ml-1 font-semibold text-green-700">{t('playground.nextIsFree')}</span>
                  )}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="xl:col-span-7 surface-card p-6">
          <h3 className="font-semibold text-ink mb-4">{t('playground.todayLog')}</h3>
          {log.length === 0 ? (
            <p className="text-sm text-mute">{t('playground.noCheckIns')}</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {log.map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-sm border-b border-app pb-2 last:border-0">
                  <div className="min-w-0 flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                      style={{ background: l.free ? 'var(--series-2)' : 'var(--orange-primary)' }}>
                      {l.free ? <IconGift size={16} stroke={1.8} /> : <IconCheck size={16} stroke={2} />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-ink truncate">{l.name}</p>
                      <p className="text-xs text-mute font-mono">{l.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {l.free && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        {t('playground.free')}
                      </span>
                    )}
                    <span className="text-xs text-mute tabular-nums">{l.at}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-app">
          <h3 className="font-semibold text-ink flex-1">{t('playground.cardsTitle')}</h3>

          {/* Segmented control from the reference. It filters by last visit — the
              one period question this data can actually answer. */}
          <div className="inline-flex items-center gap-1 rounded-full border border-app p-1">
            {PERIODS.map(p => (
              <button key={p.key} onClick={() => setPeriod(p.key)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                  period === p.key ? 'text-white' : 'text-sub hover:text-ink'
                }`}
                style={period === p.key ? { background: 'var(--series-2)' } : undefined}>
                {t(`playground.period.${p.key}`)}
              </button>
            ))}
          </div>

          <div className="w-56">
            <SearchInput value={search} onChange={setSearch} placeholder={t('playground.searchVisitor')} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-sub border-b border-app">
                <th className="px-6 py-3 font-semibold">{t('playground.customerName')}</th>
                <th className="px-4 py-3 font-semibold">{t('table.phone')}</th>
                <th className="px-4 py-3 font-semibold">{t('playground.progress')}</th>
                <th className="px-4 py-3 font-semibold">{t('playground.visits')}</th>
                <th className="px-4 py-3 font-semibold">{t('playground.lastVisit')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {filtered.map(v => (
                <tr key={v.id} className="hover:bg-brand-light transition-colors">
                  <td className="px-6 py-3.5 font-medium text-ink">{v.name}</td>
                  <td className="px-4 py-3.5 font-mono text-xs text-sub">{v.phone}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-28 h-2 rounded-full bg-app overflow-hidden">
                        <div className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, (v.points / PLAYGROUND_FREE_AT) * 100)}%`,
                            background: v.points >= PLAYGROUND_FREE_AT ? 'var(--series-2-ink)' : 'var(--orange-primary)',
                          }} />
                      </div>
                      <span className="text-xs tabular-nums text-sub">{v.points}/{PLAYGROUND_FREE_AT}</span>
                      {v.points >= PLAYGROUND_FREE_AT && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          {t('playground.free')}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sub tabular-nums">{v.visits}</td>
                  <td className="px-4 py-3.5 text-sub tabular-nums">{v.lastVisit}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-mute text-sm">{t('playground.noVisitors')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
