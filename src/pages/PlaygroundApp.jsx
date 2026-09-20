import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconGift, IconCheck, IconSearch, IconTicket,
  IconLayoutDashboard, IconUsers, IconBabyCarriage, IconLogout,
} from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { usePlaygroundVisitors, PLAYGROUND_FREE_AT } from '../hooks/usePlaygroundVisitors';
import { createPlaygroundToken } from '../services/playgroundService';
import { formatMMK } from '../utils/currency';
import NotConnected from '../components/common/NotConnected';
import DemoBanner from '../components/common/DemoBanner';
import Gauge from '../components/common/Gauge';


// Full-bleed phone layout: this route sits OUTSIDE AppLayout on purpose, so
// there is no desktop sidebar or header. Staff hold a phone at the door.
export default function PlaygroundApp() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('today');
  const [search, setSearch] = useState('');

  // Selling a ticket is the ONE thing the backend supports for staff: mint a
  // claim token. The customer scans it with their own Appleland account, so
  // nothing here identifies the customer and there is no phone lookup.
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('');
  const [token, setToken] = useState(null);
  const [selling, setSelling] = useState(false);
  const [sellError, setSellError] = useState('');
  const [copied, setCopied] = useState(false);

  const total = (Number(qty) || 0) * (Number(price) || 0);

  const sell = async (e) => {
    e.preventDefault();
    const quantity = Number(qty);
    const unit = Number(price);
    if (!Number.isInteger(quantity) || quantity < 1) return setSellError(t('playground.quantityInvalid'));
    if (!Number.isFinite(unit) || unit < 0) return setSellError(t('playground.priceInvalid'));
    setSellError(''); setSelling(true);
    try {
      // unit_price is a string on the wire — the backend stores it as a Decimal.
      const id = await createPlaygroundToken({ total_quantity: quantity, unit_price: String(unit) });
      setToken(String(id).replace(/^"|"$/g, ''));
      setCopied(false);
    } catch (err) {
      setSellError(err?.message || t('playground.tokenFailed'));
    } finally {
      setSelling(false);
    }
  };

  const resetSale = () => { setToken(null); setQty('1'); setPrice(''); setCopied(false); };
  const copyToken = async () => {
    // Insecure contexts and older webviews have no clipboard API. The code is
    // select-all, so failing here still leaves it copyable by hand.
    try { await navigator.clipboard.writeText(token); setCopied(true); } catch { setCopied(false); }
  };

  const {
    visitors, log,
    freeToday, readyForFree, totalVisits,
  } = usePlaygroundVisitors();

  const filtered = visitors.filter(v =>
    v.phone.includes(search) || v.name.toLowerCase().includes(search.toLowerCase())
  );

  const TABS = [
    { key: 'sell', icon: IconTicket, label: t('playground.tabSell') },
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

        <div className="px-5 pb-2"><DemoBanner /></div>

        <main className="flex-1 overflow-y-auto px-5 pt-1 pb-28 space-y-4">
          {tab === 'sell' && (
            <>
              {token ? (
                <>
                  <div className="surface-card p-5 space-y-4">
                    <p className="text-[13px] font-semibold text-ink">{t('playground.tokenReady')}</p>
                    {/* The customer scans this in the Appleland app. White
                        quiet zone is not decoration — a scanner needs the
                        border, and on a dark theme the card behind it is not
                        white. */}
                    <div className="flex justify-center">
                      <div className="bg-white p-3 rounded-2xl">
                        <QRCodeSVG value={token} size={196} level="M" marginSize={0} />
                      </div>
                    </div>
                    {/* Fallback for a camera that will not focus. select-all so
                        it can be copied by hand where the clipboard API is
                        unavailable. */}
                    <p className="font-mono text-[13px] leading-relaxed text-sub break-all select-all text-center">
                      {token}
                    </p>
                    <p className="text-[12px] text-sub leading-relaxed">{t('playground.tokenDesc')}</p>
                    <div className="flex gap-2">
                      <button type="button" onClick={copyToken}
                        className="press-spring flex-1 py-3 rounded-2xl border border-app text-sub text-sm font-medium cursor-pointer">
                        {copied ? t('playground.copied') : t('playground.copyCode')}
                      </button>
                      <button type="button" onClick={resetSale} className="btn-primary flex-1 justify-center py-3 rounded-2xl">
                        {t('playground.newSale')}
                      </button>
                    </div>
                  </div>
                  <NotConnected>{t('playground.claimUnknown')}</NotConnected>
                </>
              ) : (
                <div className="surface-card p-5">
                  <p className="text-[13px] font-semibold text-ink">{t('playground.sellTitle')}</p>
                  <p className="text-[13px] text-sub mt-1">{t('playground.sellDesc')}</p>

                  <form onSubmit={sell} className="space-y-3 mt-4">
                    <label className="block">
                      <span className="text-[12px] text-sub">{t('playground.quantity')}</span>
                      <input value={qty} onChange={e => { setQty(e.target.value); setSellError(''); }}
                        type="number" min="1" step="1" inputMode="numeric" required
                        className="w-full mt-1 px-4 py-3.5 text-[17px] bg-card border border-app rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand" />
                    </label>
                    <label className="block">
                      <span className="text-[12px] text-sub">{t('playground.unitPrice')}</span>
                      <input value={price} onChange={e => { setPrice(e.target.value); setSellError(''); }}
                        type="number" min="0" step="any" inputMode="decimal" required placeholder="0"
                        className="w-full mt-1 px-4 py-3.5 text-[17px] bg-card border border-app rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand" />
                    </label>

                    <div className="flex items-baseline justify-between pt-1">
                      <span className="text-[13px] text-sub">{t('playground.totalDue')}</span>
                      <span className="text-[22px] font-bold text-ink tabular-nums">{formatMMK(total)}</span>
                    </div>

                    {sellError && <p role="alert" className="text-sm text-red-500">{sellError}</p>}

                    {/* Thumb-sized: this is the one control staff press all day. */}
                    <button type="submit" disabled={selling}
                      className="btn-primary w-full justify-center py-4 text-[17px] rounded-2xl">
                      <IconTicket size={19} stroke={1.8} /> {selling ? t('playground.creating') : t('playground.createToken')}
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

          {tab === 'visitors' && (
            <>
              <NotConnected>{t('playground.prototypeNote')}</NotConnected>
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
                        style={{ background: ready ? 'var(--series-2)' : 'var(--orange-primary)' }}>
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
                          background: ready ? 'var(--series-2-ink)' : 'var(--orange-primary)',
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
              <NotConnected>{t('playground.prototypeNote')}</NotConnected>
              {/* Today's Increase — the reference's home card: gauge on the left,
                  legend rows down the right with a coloured rule per series. */}
              <div className="surface-card p-5">
                <p className="text-[13px] font-semibold text-ink">{t('playground.todayBreakdown')}</p>
                <div className="flex items-center gap-3 mt-1">
                  <div className="relative flex-shrink-0">
                    <Gauge width={168} segments={[
                      { value: log.length - freeToday, color: 'var(--orange-primary)' },
                      { value: freeToday, color: 'var(--series-2-ink)' },
                    ]} />
                    <div className="absolute inset-x-0 bottom-0 text-center">
                      <p className="text-[28px] font-extrabold text-ink tabular-nums leading-none">{log.length}</p>
                      <p className="text-[10px] text-sub mt-1">{t('playground.checkInsToday')}</p>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    {[
                      { label: t('playground.pointVisits'), value: log.length - freeToday, color: 'var(--orange-primary)' },
                      { label: t('playground.free'), value: freeToday, color: 'var(--series-2-ink)' },
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
                  { key: 'sell', icon: IconTicket, label: t('playground.tabSell') },
                  { key: 'visitors', icon: IconUsers, label: t('playground.cardsTitle') },
                  { key: 'visitors', icon: IconGift, label: t('playground.readyForFree') },
                ].map(({ key, icon: Icon, label }, i) => (
                  <button key={i} onClick={() => setTab(key)}
                    className="press-spring surface-card p-3 flex flex-col items-center gap-2 cursor-pointer">
                    <span className="w-9 h-9 rounded-full border-2 flex items-center justify-center"
                      style={{ borderColor: 'var(--series-2-ink)', color: 'var(--series-2-ink)' }}>
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
                    {log.slice(0, 8).map((l, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                          style={{ background: l.free ? 'var(--series-2)' : 'var(--orange-primary)' }}>
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
