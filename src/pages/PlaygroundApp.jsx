import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IconTicket, IconLayoutDashboard, IconBabyCarriage, IconLogout, IconArrowLeft,
  IconCircleCheck, IconClockOff, IconSettings, IconMoon, IconSun,
} from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { setLanguage } from '../i18n';
import Modal from '../components/common/Modal';

import { createPlaygroundToken, getPlaygroundCheckout } from '../services/playgroundService';
import { checkoutStatus, amountDue, freeTickets, isSettled } from '../services/playgroundCheckout';
import { formatMMK } from '../utils/currency';

// The ticket price barely changes, but staff were retyping it on every single
// sale because the form resets after each one. Remembered on the device, so a
// shift is: open app, type quantity, press the button.
const PRICE_KEY = 'al_pg_price';
const DEFAULT_PRICE = '2000';
const readPrice = () => {
  try { return localStorage.getItem(PRICE_KEY) || DEFAULT_PRICE; } catch { return DEFAULT_PRICE; }
};


// A customer who is going to scan does it in the first half minute — they are
// standing there with the QR in front of them. After that the code is usually
// sitting on a counter while staff do something else, and asking every three
// seconds for minutes on end is just noise in the server log.
//
// So: quick while it matters, then back off. A code left open for ten minutes
// costs about 70 requests instead of 200, and the fast window is unchanged for
// the case that actually happens.
const POLL_FAST_MS = 3000;
const POLL_SLOW_MS = 10000;
const FAST_WINDOW_MS = 30000;
const pollDelay = (startedAt) =>
  Date.now() - startedAt < FAST_WINDOW_MS ? POLL_FAST_MS : POLL_SLOW_MS;

// Watches one claim token until it is scanned or dies.
//
// There is no spinner anywhere in this flow on purpose. The price is already
// known from what staff typed, so the panel renders it on the first frame and
// this only ever CORRECTS it once the customer's coupons are known. A spinner
// would hide a number we already have.
function useCheckout(tokenId) {
  // The token this state belongs to is stored with it, so a new sale shows a
  // clean panel by comparison at render time rather than by clearing state from
  // inside the effect — which would cost an extra render and, for one frame,
  // show the previous customer's total against the new code.
  const [state, setState] = useState({ id: null, data: null, failed: false });

  useEffect(() => {
    if (!tokenId) return;
    let alive = true;
    let timer;
    const startedAt = Date.now();

    const tick = async () => {
      if (!alive) return;
      // A pocketed phone should not keep hitting the rate limiter. Skip the
      // request but keep the timer, so it resumes the moment it is looked at.
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        timer = setTimeout(tick, pollDelay(startedAt));
        return;
      }
      try {
        const data = await getPlaygroundCheckout(tokenId);
        if (!alive) return;
        setState({ id: tokenId, data, failed: false });
        if (isSettled(data)) return;   // scanned or expired: nothing left to learn
      } catch {
        // One dropped request at a door with bad wifi is not worth a red
        // message; it is only reported if nothing ever succeeds.
        if (alive) setState(prev => (prev.data ? prev : { id: tokenId, data: null, failed: true }));
      }
      if (alive) timer = setTimeout(tick, pollDelay(startedAt));
    };

    tick();
    return () => { alive = false; clearTimeout(timer); };
  }, [tokenId]);

  return state.id === tokenId ? state : { id: tokenId, data: null, failed: false };
}


// Full-bleed phone layout: this route sits OUTSIDE AppLayout on purpose, so
// there is no desktop sidebar or header. Staff hold a phone at the door.
export default function PlaygroundApp() {
  const { t, i18n } = useTranslation();
  const { user, logout, isManager } = useAuth();
  const { darkMode, toggleDark } = useTheme();
  const navigate = useNavigate();
  const [tab, setTab] = useState('sell');
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Selling a ticket is the ONE thing the backend supports for staff: mint a
  // claim token. The customer scans it with their own Appleland account, so
  // nothing here identifies the customer and there is no phone lookup.
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState(readPrice);
  const [token, setToken] = useState(null);
  const [selling, setSelling] = useState(false);
  const [sellError, setSellError] = useState('');
  const [copied, setCopied] = useState(false);

  const total = (Number(qty) || 0) * (Number(price) || 0);

  // The sale that is on screen right now, if a code has been minted for it.
  const { data: checkout, failed: checkoutFailed } = useCheckout(token);
  const status = checkoutStatus(checkout);
  const due = amountDue(checkout, total);
  const free = freeTickets(checkout);

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
      const clean = String(id).replace(/^"|"$/g, '');
      setToken(clean);
      setSold(list => [{ id: clean, token: clean, qty: quantity, total: quantity * unit }, ...list]);
      setCopied(false);
    } catch (err) {
      setSellError(err?.message || t('playground.tokenFailed'));
    } finally {
      setSelling(false);
    }
  };

  // Quantity resets, price does not: the next customer is a different
  // number of tickets at the same price.
  const resetSale = () => { setToken(null); setQty('1'); setCopied(false); };
  const copyToken = async () => {
    // Insecure contexts and older webviews have no clipboard API. The code is
    // select-all, so failing here still leaves it copyable by hand.
    try { await navigator.clipboard.writeText(token); setCopied(true); } catch { setCopied(false); }
  };

  // Codes made on this phone since the app was opened. Not a server report:
  // route_admin() exposes only token creation, so there is nothing to read back.
  const [sold, setSold] = useState([]);
  const soldTickets = sold.reduce((sum, entry) => sum + entry.qty, 0);

  const TABS = [
    { key: 'sell', icon: IconTicket, label: t('playground.tabSell') },
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
          {isManager && (
            <button onClick={() => navigate('/playground')} title={t('playground.backToAdmin')}
              aria-label={t('playground.backToAdmin')}
              className="press-spring w-9 h-9 rounded-full border border-app flex items-center justify-center text-mute hover:text-brand cursor-pointer">
              <IconArrowLeft size={17} stroke={1.8} />
            </button>
          )}
          <button onClick={() => setSettingsOpen(true)} title={t('titles.settings')}
            aria-label={t('titles.settings')}
            className="press-spring w-9 h-9 rounded-full border border-app flex items-center justify-center text-mute hover:text-brand cursor-pointer">
            <IconSettings size={17} stroke={1.6} />
          </button>
          <button onClick={logout} title={t('sidebar.logout')}
            className="press-spring w-9 h-9 rounded-full border border-app flex items-center justify-center text-mute hover:text-[#EF4444] cursor-pointer">
            <IconLogout size={17} stroke={1.6} />
          </button>
        </header>

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

                  {/* What to charge. Present from the first frame with the
                      figure staff typed, then corrected by the server once the
                      customer scans and their free tickets are known — so the
                      panel never shows a placeholder where money should be. */}
                  <div className="surface-card p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13px] font-semibold text-ink">{t('playground.amountToCollect')}</p>
                      {status === 'waiting' && (
                        <span className="flex items-center gap-1.5 text-[11px] text-mute">
                          {/* A pulsing dot, not a spinner: nothing is loading,
                              we are waiting on a person. */}
                          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                          {t('playground.waitingScan')}
                        </span>
                      )}
                      {status === 'claimed' && (
                        <span className="flex items-center gap-1.5 text-[11px] font-semibold"
                          style={{ color: 'var(--status-delivered)' }}>
                          <IconCircleCheck size={14} stroke={2} /> {t('playground.scanned')}
                        </span>
                      )}
                      {status === 'expired' && (
                        <span className="flex items-center gap-1.5 text-[11px] text-mute">
                          <IconClockOff size={14} stroke={1.8} /> {t('playground.codeExpired')}
                        </span>
                      )}
                    </div>

                    <p className="text-[34px] font-bold text-ink tabular-nums leading-none transition-opacity"
                      style={{ opacity: status === 'expired' ? 0.4 : 1 }}>
                      {formatMMK(due)}
                    </p>

                    {/* Only shown once it is true — a "0 free tickets" line
                        would be noise on every ordinary sale. */}
                    {status === 'claimed' && free > 0 && (
                      <p className="text-[12px]" style={{ color: 'var(--status-delivered)' }}>
                        {t('playground.freeApplied', { count: free })}
                      </p>
                    )}
                    {status === 'waiting' && (
                      <p className="text-[12px] text-sub leading-relaxed">{t('playground.beforeScanNote')}</p>
                    )}
                    {status === 'expired' && (
                      <p className="text-[12px] text-sub leading-relaxed">{t('playground.expiredNote')}</p>
                    )}
                    {checkoutFailed && (
                      <p className="text-[12px] text-mute leading-relaxed">{t('playground.checkOffline')}</p>
                    )}
                  </div>
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

          {tab === 'today' && (
            <>
              <div className="surface-card p-5">
                <p className="text-[13px] font-semibold text-ink">{t('playground.soldToday')}</p>
                <p className="text-[12px] text-sub mt-1">{t('playground.soldTodayHelp')}</p>
                {sold.length > 0 && (
                  <div className="flex items-baseline gap-4 mt-4">
                    <div>
                      <p className="text-[28px] font-bold text-ink tabular-nums leading-none">{sold.length}</p>
                      <p className="text-[11px] text-sub mt-1">{t('playground.codesMade')}</p>
                    </div>
                    <div>
                      <p className="text-[28px] font-bold text-ink tabular-nums leading-none">{soldTickets}</p>
                      <p className="text-[11px] text-sub mt-1">{t('playground.ticketsSold')}</p>
                    </div>
                  </div>
                )}
              </div>

              {sold.length === 0 ? (
                <p className="text-sm text-mute py-10 text-center">{t('playground.soldNone')}</p>
              ) : (
                <div className="surface-card p-5 space-y-3">
                  {sold.map(entry => (
                    <div key={entry.id} className="flex items-center gap-3">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-white bg-brand">
                        <IconTicket size={16} stroke={1.8} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-ink">{t('playground.ticketCount', { count: entry.qty })}</p>
                        <p className="text-[11px] text-mute font-mono truncate">{entry.token}</p>
                      </div>
                      <span className="text-sm font-semibold text-ink tabular-nums flex-shrink-0">{formatMMK(entry.total)}</span>
                    </div>
                  ))}
                </div>
              )}

            </>
          )}

        </main>

        {/* Everything a door phone needs and nothing it doesn't: the language,
            a dark mode for an evening shift, and the price staff would
            otherwise retype all day. No style themes — that is a desk
            decision, not a door one. */}
        <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title={t('titles.settings')} size="sm">
          <div className="space-y-5">
            <div>
              <p className="text-[13px] font-semibold text-ink mb-2">{t('settings.language')}</p>
              <div className="flex gap-2">
                {[['en', 'English'], ['my', 'မြန်မာ']].map(([code, label]) => (
                  <button key={code} type="button" onClick={() => setLanguage(code)}
                    className={`press-spring flex-1 py-3 rounded-2xl text-sm font-medium cursor-pointer border ${
                      i18n.resolvedLanguage === code
                        ? 'border-brand text-brand bg-brand-light'
                        : 'border-app text-sub'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[13px] font-semibold text-ink mb-2">{t('settings.mode')}</p>
              <button type="button" onClick={toggleDark}
                className="press-spring w-full flex items-center justify-between gap-3 py-3 px-4 rounded-2xl border border-app cursor-pointer">
                <span className="flex items-center gap-2.5 text-sm text-sub">
                  {darkMode ? <IconMoon size={17} stroke={1.6} /> : <IconSun size={17} stroke={1.6} />}
                  {darkMode ? t('settings.dark') : t('settings.light')}
                </span>
                <span className={`w-11 h-6 rounded-full transition-colors flex items-center px-0.5 ${darkMode ? 'bg-brand' : 'bg-app'}`}>
                  <span className={`w-5 h-5 rounded-full bg-card shadow transition-transform ${darkMode ? 'translate-x-5' : ''}`} />
                </span>
              </button>
            </div>

            <div>
              <label className="block">
                <span className="text-[13px] font-semibold text-ink">{t('playground.defaultPrice')}</span>
                <input value={price} type="number" min="0" step="any" inputMode="decimal"
                  onChange={e => {
                    setPrice(e.target.value);
                    // Written as it is typed: there is no Save button to forget
                    // to press, and the field is the setting.
                    try { localStorage.setItem(PRICE_KEY, e.target.value); } catch { /* private mode */ }
                  }}
                  className="w-full mt-2 px-4 py-3.5 text-[17px] bg-card border border-app rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand" />
              </label>
              <p className="text-[12px] text-sub mt-2 leading-relaxed">{t('playground.defaultPriceHelp')}</p>
            </div>
          </div>
        </Modal>

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
