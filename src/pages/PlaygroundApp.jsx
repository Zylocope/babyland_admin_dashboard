import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  IconTicket, IconLayoutDashboard, IconBabyCarriage, IconLogout, IconArrowLeft,
} from '@tabler/icons-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { createPlaygroundToken } from '../services/playgroundService';
import { formatMMK } from '../utils/currency';
import NotConnected from '../components/common/NotConnected';


// Full-bleed phone layout: this route sits OUTSIDE AppLayout on purpose, so
// there is no desktop sidebar or header. Staff hold a phone at the door.
export default function PlaygroundApp() {
  const { t } = useTranslation();
  const { user, logout, isManager } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('sell');

  // Selling a ticket is the ONE thing the backend supports for staff: mint a
  // claim token. The customer scans it with their own Appleland account, so
  // nothing here identifies the customer and there is no phone lookup.
  const [qty, setQty] = useState('1');
  const [price, setPrice] = useState('2000');
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

  const resetSale = () => { setToken(null); setQty('1'); setPrice('2000'); setCopied(false); };
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

              {/* Honest about its own limit: these are the codes this phone
                  made since the app was opened, not a server report. There is
                  no staff read endpoint to build one from. */}
              <NotConnected>{t('playground.soldLocalOnly')}</NotConnected>
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
