import { useEffect, useRef, useState } from 'react';
import {
  IconBarcode, IconPackageImport, IconCircleCheck, IconLoader2, IconX, IconClockHour4,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { formatMMK } from '../utils/currency';
import { shopToday } from '../utils/shopDay';
import { validateStockIn } from '../utils/stockIn';
import { searchProductsSimple, insertInventory } from '../services/productService';

// Receiving a delivery is scan-shaped work, not browse-shaped. The per-product
// modal on Products makes you find the row first, which is fine for a one-off
// correction and slow for thirty boxes. This screen keeps the barcode field
// focused and returns to it after every save, so a whole delivery is
// scan, type, save, scan.
const EMPTY = { quantity: '', unitCost: '', expiry: '' };

export default function StockIn() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  // What this session has recorded. Staff working through a delivery need to
  // see what already went in without leaving the screen.
  const [done, setDone] = useState([]);
  const barcodeRef = useRef(null);

  useEffect(() => { barcodeRef.current?.focus(); }, []);

  const pick = (p) => {
    setProduct(p);
    setResults([]);
    setError('');
    setForm(EMPTY);
  };

  // Same debounced live search as the till. A scanner types fast and ends with
  // Enter, so the debounce fires once on the completed code rather than per key.
  useEffect(() => {
    const q = query.trim();
    // No clearing here: what shows is derived below, so an empty query or a
    // chosen product simply stops the effect rather than syncing state back.
    if (!q || product) return undefined;
    let active = true;
    const h = setTimeout(async () => {
      // Flipped here rather than in the effect body: the spinner should mean
      // "a request is in flight", not "you are still typing".
      setSearching(true);
      try {
        const res = await searchProductsSimple(q, { page: 1, page_size: 8 });
        const items = Array.isArray(res) ? res : res?.data ?? [];
        if (!active) return;
        setResults(items);
        // An exact barcode match is unambiguous — a scan should not need a tap.
        const exact = items.find(p => (p.barcode ?? '').toLowerCase() === q.toLowerCase());
        if (exact) pick(exact);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 250);
    return () => { active = false; clearTimeout(h); };
  }, [query, product]);

  const clear = () => {
    setProduct(null);
    setQuery('');
    setForm(EMPTY);
    setError('');
    barcodeRef.current?.focus();
  };

  const set = (key) => (e) => { setForm(f => ({ ...f, [key]: e.target.value })); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    const message = validateStockIn(form, product, t);
    if (message) { setError(message); return; }
    setSaving(true);
    setError('');
    try {
      await insertInventory(product.id, {
        quantity_received: Number(form.quantity),
        unit_cost: String(form.unitCost),
        // The shop's day, not the device's. Everything else in the app moved to
        // shopDay; a received date from a laptop in another timezone would file
        // an early-morning delivery under yesterday.
        received_at: new Date(`${shopToday()}T00:00:00Z`).toISOString(),
        ...(product.is_perishable && form.expiry
          ? { expiry_date: new Date(form.expiry).toISOString() }
          : {}),
      });
      setDone(d => [{
        id: `${product.id}-${Date.now()}`,
        name: product.name,
        barcode: product.barcode,
        quantity: Number(form.quantity),
        cost: Number(form.unitCost),
      }, ...d]);
      clear();
    } catch (err) {
      setError(err?.message || t('stockIn.failed'));
    } finally {
      setSaving(false);
    }
  };

  // Derived, not stored: results are only meaningful while a query is open
  // and nothing is selected.
  const searchOpen = !product && Boolean(query.trim());
  const visibleResults = searchOpen ? results : [];

  const field = 'w-full px-4 py-3 text-[15px] border border-app rounded-xl bg-card text-ink focus:outline-none focus:ring-2 focus:ring-brand';
  const totalUnits = done.reduce((sum, d) => sum + d.quantity, 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      <div className="lg:col-span-7 space-y-4">
        <div className="surface-card is-sheet p-5">
          <label className="block">
            <span className="text-[13px] font-semibold text-ink">{t('stockIn.scanTitle')}</span>
            <div className="relative mt-2">
              <IconBarcode size={19} stroke={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
              <input
                ref={barcodeRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('stockIn.scanPlaceholder')}
                disabled={!!product}
                className={`${field} pl-11 pr-10 disabled:opacity-60`}
              />
              {searching && searchOpen && (
                <IconLoader2 size={17} className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-mute" />
              )}
            </div>
          </label>
          <p className="text-[12px] text-sub mt-2">{t('stockIn.scanHelp')}</p>

          {visibleResults.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {visibleResults.map(p => (
                <button key={p.id} onClick={() => pick(p)} type="button"
                  className="w-full text-left px-3.5 py-2.5 rounded-xl border border-app hover:border-brand hover:bg-brand-light transition-colors cursor-pointer">
                  <p className="text-sm font-medium text-ink truncate">{p.name}</p>
                  <p className="text-[11px] text-mute font-mono">{p.barcode}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        {product && (
          <form onSubmit={submit} className="surface-card is-sheet p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{product.name}</p>
                <p className="text-[12px] text-mute font-mono">{product.barcode}</p>
                <p className="text-[12px] text-sub mt-1">
                  {t('stockIn.current')}: <span className="font-semibold text-ink">{product.quantity_in_stock ?? 0}</span>
                </p>
              </div>
              <button type="button" onClick={clear} aria-label={t('common.cancel')}
                className="control-icon text-mute hover:text-ink hover:bg-brand-light transition-colors cursor-pointer">
                <IconX size={18} stroke={1.5} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="text-[12px] text-sub">{t('stockIn.quantity')}</span>
                {/* autoFocus on purpose: the scan already chose the product, so
                    the caret belongs in the only field staff still have to type. */}
                <input autoFocus value={form.quantity} onChange={set('quantity')}
                  type="number" min="1" step="1" inputMode="numeric" required className={`${field} mt-1`} />
              </label>
              <label className="block">
                <span className="text-[12px] text-sub">{t('stockIn.unitCost')}</span>
                <input value={form.unitCost} onChange={set('unitCost')}
                  type="number" min="0" step="any" inputMode="decimal" required className={`${field} mt-1`} />
              </label>
            </div>

            {product.is_perishable && (
              <label className="block">
                <span className="text-[12px] text-sub flex items-center gap-1.5">
                  <IconClockHour4 size={14} stroke={1.6} /> {t('stockIn.expiry')}
                </span>
                <input value={form.expiry} onChange={set('expiry')} type="date" required className={`${field} mt-1`} />
                <span className="text-[11px] text-mute">{t('stockIn.expiryHelp')}</span>
              </label>
            )}

            {error && <p role="alert" className="text-sm text-red-500">{error}</p>}

            <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3.5">
              <IconPackageImport size={18} stroke={1.8} />
              {saving ? t('stockIn.adding') : t('stockIn.submit')}
            </button>
          </form>
        )}
      </div>

      <div className="lg:col-span-5">
        <div className="surface-card is-sheet p-5">
          <div className="flex items-baseline justify-between gap-3 mb-3">
            <p className="text-[13px] font-semibold text-ink">{t('stockIn.sessionTitle')}</p>
            {done.length > 0 && (
              <p className="text-[12px] text-sub tabular-nums">
                {t('stockIn.sessionCount', { lines: done.length, units: totalUnits })}
              </p>
            )}
          </div>
          {done.length === 0 ? (
            <p className="text-sm text-mute py-10 text-center">{t('stockIn.sessionEmpty')}</p>
          ) : (
            <div className="space-y-2.5">
              {done.map(d => (
                <div key={d.id} className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white bg-brand">
                    <IconCircleCheck size={16} stroke={1.9} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink truncate">{d.name}</p>
                    <p className="text-[11px] text-mute font-mono">{d.barcode}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-semibold text-ink tabular-nums leading-none">+{d.quantity}</p>
                    <p className="text-[11px] text-mute tabular-nums mt-1">{formatMMK(d.cost)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
