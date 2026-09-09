import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconGift, IconUserPlus, IconCheck, IconAlertTriangle, IconSearch,
  IconLayoutDashboard, IconUsers, IconBabyCarriage, IconLogout,
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import { usePlaygroundVisitors, PLAYGROUND_FREE_AT } from '../hooks/usePlaygroundVisitors';
import Gauge from '../components/common/Gauge';

const NAVY = '#1B2A4A';

// Full-bleed phone layout: this route sits OUTSIDE AppLayout on purpose, so
// there is no desktop sidebar or header. Staff hold a phone at the door.
export default function PlaygroundApp() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('today');
  const [search, setSearch] = useState('');

  const {
    visitors, log, phone, setPhone, name, setName,
    result, conflict, setConflict, checkIn, award,
    freeToday, readyForFree, totalVisits,
  } = usePlaygroundVisitors();

  const filtered = visitors.filter(v =>
    v.phone.includes(search) || v.name.toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    { key: 'checkin', icon: IconUserPlus, label: t('playground.tabCheckIn') },
    { key: 'visitors', icon: IconUsers, label: t('playground.tabVisitors') },
    { key: 'today', icon: IconLayoutDashboard, label: t('playground.tabToday') },
  ];

  return (
    <div className="min-h-screen flex justify-center">
      {/* Capped at a phone width and centred, so the same build is usable on a
          tablet or a desktop browser without stretching into nonsense. */}
      <div className="w-full max-w-[430px] flex flex-col min-h-screen">

        <header className="flex items-center gap-3 px-5 pt-5 pb-3 flex-shrink-0">
          <span className="w-9 h-9 rounded-xl bg-brand flex items-center justify-center text-white flex-shrink-0">
            <IconBabyCarriage size={19} stroke={1.6} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink text-[15px] leading-tight truncate">{t('playground.appTitle')}</p>
            <p className="text-[11px] text-mute truncate">{user?.name}</p>
          </div>
          <button onClick={logout} title={t('sidebar.logout')}
            className="press-spring w-9 h-9 rounded-full border border-app flex items-center justify-center text-mute hover:text-[#EF4444] cursor-pointer">
            <IconLogout size={17} stroke={1.6} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-5 pt-1 pb-28 space-y-4">
          {tab === 'checkin' && (
            <>
              <div className="surface-card p-5">
                <p className="text-[13px] text-sub">{t('playground.checkInTitle')}</p>
                <p className="text-[13px] text-sub mt-1">{t('playground.checkInDesc', { n: PLAYGROUND_FREE_AT })}</p>

                <form onSubmit={checkIn} className="space-y-3 mt-4">
                  <input value={phone} onChange={e => { setPhone(e.target.value); setConflict(null); }} required
                    placeholder="09-xxx-xxx-xxx" inputMode="tel"
                    className="w-full px-4 py-3.5 text-[17px] bg-card border border-app rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand" />
                  <input value={name} onChange={e => { setName(e.target.value); setConflict(null); }} required
                    placeholder={t('playground.customerName')}
                    className="w-full px-4 py-3.5 text-[17px] bg-card border border-app rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand" />

                  {conflict && (
                    <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 space-y-2">
                      <p className="text-sm text-amber-800 flex items-start gap-2">
                        <IconAlertTriangle size={16} stroke={1.8} className="mt-0.5 flex-shrink-0" />
                        {t('playground.nameMismatch', { name: conflict.visitor.name })}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => { setName(conflict.visitor.name); award(conflict.visitor, conflict.visitor.name); }}
                          className="px-3 py-2 text-xs rounded-xl bg-brand text-white font-medium cursor-pointer">
                          {t('playground.useExisting', { name: conflict.visitor.name })}
                        </button>
                        <button type="button" onClick={() => award({ ...conflict.visitor, name: conflict.typedName }, conflict.typedName)}
                          className="px-3 py-2 text-xs rounded-xl border border-app text-sub cursor-pointer">
                          {t('playground.updateName', { name: conflict.typedName })}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Thumb-sized: this is the one control staff press all day. */}
                  <button type="submit" className="btn-primary w-full justify-center py-4 text-[17px] rounded-2xl">
                    <IconUserPlus size={19} stroke={1.8} /> {t('playground.checkIn')}
                  </button>
                </form>
              </div>

              {result && (
                <div className={`rounded-2xl p-5 border ${result.kind === 'free'
                  ? 'border-green-300 bg-green-50' : 'border-app bg-brand-light'}`}>
                  {result.kind === 'free' ? (
                    <>
                      <p className="font-bold text-green-700 flex items-center gap-2 text-[17px]">
                        <IconGift size={20} stroke={1.8} /> {t('playground.freeVisit')}
                      </p>
                      <p className="text-sm text-green-800 mt-1">
                        {t('playground.freeVisitDesc', { name: result.visitor.name })}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-ink text-[17px]">{result.visitor.name}</p>
                      <p className="text-sm text-sub mt-1">
                        {t('playground.pointAdded', { points: result.visitor.points, n: PLAYGROUND_FREE_AT })}
                      </p>
                      <div className="h-2 rounded-full bg-app overflow-hidden mt-3">
                        <div className="h-full rounded-full bg-brand transition-all"
                          style={{ width: `${Math.min(100, (result.visitor.points / PLAYGROUND_FREE_AT) * 100)}%` }} />
                      </div>
                      {result.visitor.points >= PLAYGROUND_FREE_AT && (
                        <p className="mt-2 font-semibold text-green-700 text-sm">{t('playground.nextIsFree')}</p>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {tab === 'visitors' && (
            <>
              <div className="relative">
                <IconSearch size={17} stroke={1.6} className="absolute left-4 top-1/2 -translate-y-1/2 text-mute" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder={t('playground.searchVisitor')}
                  className="w-full pl-11 pr-4 py-3 text-[15px] bg-card border border-app rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>

              {filtered.length === 0 ? (
                <p className="text-center text-sm text-mute py-16">{t('playground.noVisitors')}</p>
              ) : filtered.map(v => {
                const ready = v.points >= PLAYGROUND_FREE_AT;
                return (
                  <div key={v.id} className="surface-card p-4">
                    <div className="flex items-center gap-3">
                      <span className="w-11 h-11 rounded-2xl flex items-center justify-center text-white flex-shrink-0 font-bold"
                        style={{ background: ready ? NAVY : 'var(--orange-primary)' }}>
                        {v.name.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink truncate">{v.name}</p>
                        <p className="text-xs text-mute font-mono">{v.phone}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[19px] font-bold text-ink tabular-nums leading-none">
                          {v.points}<span className="text-sub text-[13px]">/{PLAYGROUND_FREE_AT}</span>
                        </p>
                        <p className="text-[11px] text-mute mt-1">{t('playground.visits')} {v.visits}</p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-app overflow-hidden mt-3">
                      <div className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, (v.points / PLAYGROUND_FREE_AT) * 100)}%`,
                          background: ready ? NAVY : 'var(--orange-primary)',
                        }} />
                    </div>
                    {ready && (
                      <p className="mt-2 text-xs font-semibold text-green-700">{t('playground.nextIsFree')}</p>
                    )}
                  </div>
                );
              })}
            </>
          )}

          {tab === 'today' && (
            <>
              {/* Today's Increase — the reference's home card: gauge on the left,
                  legend rows down the right with a coloured rule per series. */}
              <div className="surface-card p-5">
                <p className="text-[13px] font-semibold text-ink">{t('playground.todayBreakdown')}</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="relative flex-shrink-0">
                    <Gauge width={168} segments={[
                      { value: log.length - freeToday, color: 'var(--orange-primary)' },
                      { value: freeToday, color: NAVY },
                    ]} />
                    <div className="absolute inset-x-0 bottom-0 text-center">
                      <p className="text-[28px] font-extrabold text-ink tabular-nums leading-none">{log.length}</p>
                      <p className="text-[10px] text-sub mt-1">{t('playground.checkInsToday')}</p>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    {[
                      { label: t('playground.pointVisits'), value: log.length - freeToday, color: 'var(--orange-primary)' },
                      { label: t('playground.free'), value: freeToday, color: NAVY },
                      { label: t('playground.readyForFree'), value: readyForFree, color: null },
                    ].map(s => (
                      <div key={s.label} className="border-l-2 pl-2.5"
                        style={{ borderColor: s.color ?? 'var(--border)' }}>
                        <p className="text-[10px] text-sub leading-tight truncate">{s.label}</p>
                        <p className="text-[17px] font-bold text-ink tabular-nums leading-tight">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Tile row, as in the reference. Each one goes somewhere real. */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'checkin', icon: IconUserPlus, label: t('playground.tabCheckIn') },
                  { key: 'visitors', icon: IconUsers, label: t('playground.cardsTitle') },
                  { key: 'visitors', icon: IconGift, label: t('playground.readyForFree') },
                ].map(({ key, icon: Icon, label }, i) => (
                  <button key={i} onClick={() => setTab(key)}
                    className="press-spring surface-card p-3 flex flex-col items-center gap-2 cursor-pointer">
                    <span className="w-9 h-9 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: NAVY, color: NAVY }}>
                      <Icon size={16} stroke={1.8} />
                    </span>
                    <span className="text-[11px] font-medium text-ink text-center leading-tight">{label}</span>
                  </button>
                ))}
              </div>

              <div className="surface-card p-5">
                <p className="text-[13px] text-sub">{t('playground.totalVisits')}</p>
                <p className="text-[40px] font-extrabold text-ink tabular-nums leading-none tracking-tight mt-1">
                  {totalVisits.toLocaleString()}
                </p>
              </div>

              <div className="surface-card p-5">
                <p className="text-[13px] font-semibold text-ink mb-3">{t('playground.todayLog')}</p>
                {log.length === 0 ? (
                  <p className="text-sm text-mute py-6 text-center">{t('playground.noCheckIns')}</p>
                ) : (
                  <div className="space-y-2.5">
                    {log.map((l, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                          style={{ background: l.free ? NAVY : 'var(--orange-primary)' }}>
                          {l.free ? <IconGift size={16} stroke={1.8} /> : <IconCheck size={16} stroke={2} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-ink truncate text-sm">{l.name}</p>
                          <p className="text-xs text-mute font-mono">{l.phone}</p>
                        </div>
                        <span className="text-xs text-mute tabular-nums flex-shrink-0">{l.at}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {/* Bottom tab bar, like the reference. Fixed so it stays under the thumb
            while the content above scrolls. */}
        <nav className="fixed bottom-0 w-full max-w-[430px] surface-panel border-t border-app px-2 pt-2 pb-3 flex">
          {TABS.map(({ key, icon: Icon, label }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => setTab(key)}
                className="press-spring flex-1 flex flex-col items-center gap-1 py-1.5 rounded-2xl cursor-pointer"
                style={active ? { color: 'var(--orange-primary)' } : undefined}>
                <Icon size={21} stroke={active ? 2 : 1.6} className={active ? '' : 'text-mute'} />
                <span className={`text-[11px] font-semibold ${active ? '' : 'text-mute'}`}>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
