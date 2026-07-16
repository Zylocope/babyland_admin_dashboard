import { useState } from 'react';
import { IconGift, IconUserPlus, IconCheck, IconAlertTriangle, IconUsers, IconTicket } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import StatCard from '../components/common/StatCard';
import SearchInput from '../components/common/SearchInput';
import { mockPlaygroundVisitors, PLAYGROUND_FREE_AT } from '../data/mock';

const today = () => new Date().toISOString().slice(0, 10);

export default function Playground() {
  const { t } = useTranslation();
  const [visitors, setVisitors] = useState(mockPlaygroundVisitors);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [result, setResult] = useState(null);   // { kind, visitor }
  const [conflict, setConflict] = useState(null); // { visitor, typedName }
  const [log, setLog] = useState([]);

  const reset = () => { setPhone(''); setName(''); setConflict(null); };

  const award = (existing, typedName) => {
    // At the threshold the visit is free: it consumes the card and earns no point.
    const isFree = existing && existing.points >= PLAYGROUND_FREE_AT;
    let updated;

    if (!existing) {
      updated = { id: `PG${Date.now()}`, phone: phone.trim(), name: typedName, points: 1, visits: 1, lastVisit: today() };
      setVisitors(v => [updated, ...v]);
    } else {
      updated = {
        ...existing,
        points: isFree ? 0 : existing.points + 1,
        visits: existing.visits + 1,
        lastVisit: today(),
      };
      setVisitors(v => v.map(x => (x.id === updated.id ? updated : x)));
    }

    setResult({ kind: isFree ? 'free' : existing ? 'point' : 'new', visitor: updated });
    setLog(l => [{ at: new Date().toLocaleTimeString(), name: updated.name, phone: updated.phone, free: isFree }, ...l].slice(0, 8));
    reset();
  };

  const checkIn = (e) => {
    e.preventDefault();
    setResult(null);
    const p = phone.trim();
    const n = name.trim();
    if (!p || !n) return;

    const existing = visitors.find(v => v.phone === p);
    // Same phone must always carry the same name — surface the mismatch instead
    // of silently creating a second card or overwriting the name.
    if (existing && existing.name.toLowerCase() !== n.toLowerCase()) {
      setConflict({ visitor: existing, typedName: n });
      return;
    }
    award(existing, n);
  };

  const filtered = visitors.filter(v =>
    v.phone.includes(search) || v.name.toLowerCase().includes(search.toLowerCase())
  );

  const freeToday = log.filter(l => l.free).length;
  const readyForFree = visitors.filter(v => v.points >= PLAYGROUND_FREE_AT).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={IconUsers}  tone="store"     label={t('playground.totalVisitors')} value={visitors.length} />
        <StatCard icon={IconTicket} tone="combined"  label={t('playground.checkInsToday')} value={log.length} />
        <StatCard icon={IconGift}   tone="completed" label={t('playground.readyForFree')}  value={readyForFree} />
        <StatCard icon={IconCheck}  tone="pending"   label={t('playground.freeGivenToday')} value={freeToday} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Check-in */}
        <div className="xl:col-span-5 surface-card p-6">
          <h3 className="font-semibold text-ink mb-1">{t('playground.checkInTitle')}</h3>
          <p className="text-[13px] text-sub mb-4">{t('playground.checkInDesc', { n: PLAYGROUND_FREE_AT })}</p>

          <form onSubmit={checkIn} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">{t('table.phone')}</label>
              <input value={phone} onChange={e => { setPhone(e.target.value); setConflict(null); }} required
                placeholder="09-xxx-xxx-xxx" inputMode="tel"
                className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1">{t('playground.customerName')}</label>
              <input value={name} onChange={e => { setName(e.target.value); setConflict(null); }} required
                className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>

            {conflict && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
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

            <button type="submit"
              className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-brand text-white font-semibold rounded-lg hover:bg-brand-hover cursor-pointer">
              <IconUserPlus size={16} stroke={1.8} /> {t('playground.checkIn')}
            </button>
          </form>

          {result && (
            <div className={`mt-4 rounded-lg p-4 border ${result.kind === 'free'
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

        {/* Today's log */}
        <div className="xl:col-span-7 surface-card p-6">
          <h3 className="font-semibold text-ink mb-4">{t('playground.todayLog')}</h3>
          {log.length === 0 ? (
            <p className="text-sm text-mute">{t('playground.noCheckIns')}</p>
          ) : (
            <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
              {log.map((l, i) => (
                <div key={i} className="flex items-center justify-between gap-3 text-sm border-b border-app pb-2 last:border-0">
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{l.name}</p>
                    <p className="text-xs text-mute font-mono">{l.phone}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {l.free && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        {t('playground.free')}
                      </span>
                    )}
                    <span className="text-xs text-mute">{l.at}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reward cards */}
      <div className="surface-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-b border-app">
          <h3 className="font-semibold text-ink flex-1">{t('playground.cardsTitle')}</h3>
          <div className="w-64">
            <SearchInput value={search} onChange={setSearch} placeholder={t('playground.searchVisitor')} />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white bg-brand">
                <th className="px-6 py-3 font-medium">{t('playground.customerName')}</th>
                <th className="px-4 py-3 font-medium">{t('table.phone')}</th>
                <th className="px-4 py-3 font-medium">{t('playground.progress')}</th>
                <th className="px-4 py-3 font-medium">{t('playground.visits')}</th>
                <th className="px-4 py-3 font-medium">{t('playground.lastVisit')}</th>
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
                        <div className="h-full rounded-full bg-brand transition-all"
                          style={{ width: `${Math.min(100, (v.points / PLAYGROUND_FREE_AT) * 100)}%` }} />
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
                  <td className="px-4 py-3.5 text-sub">{v.lastVisit}</td>
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
