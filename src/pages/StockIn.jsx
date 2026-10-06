import { useEffect, useRef, useState } from 'react';
import {
  IconBarcode, IconPackageImport, IconCircleCheck, IconLoader2, IconX, IconClockHour4, IconCamera,
  IconAlertTriangle, IconHistory,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { formatMMK } from '../utils/currency';
import { shopToday, formatShopTime } from '../utils/shopDay';
import { validateStockIn } from '../utils/stockIn';
import { searchProductsSimple, insertInventory, getAllProducts, getInventoryRecords } from '../services/productService';
import { loadBatches, costChanges } from '../services/inventoryHistory';
import { Skeleton } from '../components/common/Skeleton';
import BarcodeCameraScanner from '../components/common/BarcodeCameraScanner';

// Receiving a delivery is scan-shaped work, not browse-shaped. The per-product
// modal on Products makes you find the row first, which is fine for a one-off
// correction and slow for thirty boxes. This screen keeps the barcode field
// focused and returns to it after every save, so a whole delivery is
// scan, type, save, scan.
const EMPTY = { quantity: '', unitCost: '', expiry: '' };

export default function StockIn() {
  const { t } = useTranslation();
  // Every batch in the catalogue, loaded once. One request per product, which
  // is 34 today - acceptable, and the reason this sits below the scan field
  // rather than blocking it.
  const [history, setHistory] = useState({ status: 'loading', batches: [], failed: 0 });
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [product, setProduct] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
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

  useEffect(() => {
    let active = true;
    getAllProducts()
      .then(products => loadBatches({
        products: Array.isArray(products) ? products : [],
        fetchRecords: getInventoryRecords,
      }))
      .then(out => { if (active) setHistory({ status: 'ok', ...out }); })
      .catch(() => { if (active) setHistory({ status: 'error', batches: [], failed: 0 }); });
    return () => { active = false; };
  }, []);

  const alerts = history.status === 'ok' ? costChanges(history.batches) : [];

  return (
    <div className="mobile-page stock-page grid grid-cols-1 lg:grid-cols-12 gap-5">
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
                className={`${field} pl-11 pr-20 disabled:opacity-60`}
              />
              {searching && searchOpen && (
                <IconLoader2 size={17} className="absolute right-12 top-1/2 -translate-y-1/2 animate-spin text-mute" />
              )}
              <button
                type="button"
                disabled={!!product}
                onClick={() => setCameraOpen(true)}
                aria-label={t('barcodeCamera.open')}
                title={t('barcodeCamera.open')}
                className="control-icon absolute right-1.5 top-1/2 -translate-y-1/2 text-sub hover:text-brand hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <IconCamera size={19} stroke={1.6} />
              </button>
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

      {/* The alert first, because it is the thing someone acts on. A rise that
          still leaves a healthy margin is information; one that turns the
          margin negative is a decision. */}
      {alerts.length > 0 && (
        <div className="surface-card is-sheet p-5 lg:col-span-12">
          <h3 className="text-[13px] font-semibold text-ink mb-1 flex items-center gap-2">
            <IconAlertTriangle size={16} stroke={1.7} style={{ color: 'var(--status-pending)' }} />
            {t('stockIn.costAlertTitle')}
          </h3>
          <p className="text-[12px] text-sub mb-4">{t('stockIn.costAlertHelp')}</p>
          <div className="space-y-3">
            {alerts.map(a => (
              <div key={a.product_id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-sm font-medium text-ink min-w-0 flex-1 truncate">{a.name}</span>
                <span className="text-[12px] text-sub tabular-nums">
                  {formatMMK(a.old_cost)} &rarr; <strong className="text-ink">{formatMMK(a.new_cost)}</strong>
                </span>
                <span className="text-[12px] tabular-nums font-semibold"
                  style={{ color: a.margin_pct != null && a.margin_pct < 0 ? 'var(--status-cancelled)' : 'var(--status-pending)' }}>
                  {a.change_pct > 0 ? '+' : ''}{a.change_pct.toFixed(0)}%
                </span>
                {a.margin_pct != null && a.margin_pct < 0 && (
                  <span className="text-[11px] w-full" style={{ color: 'var(--status-cancelled)' }}>
                    {t('stockIn.sellingBelowCost', {
                      price: formatMMK(a.selling_price),
                      margin: a.margin_pct.toFixed(0),
                    })}
                  </span>
                )}
                {/* Said separately from the margin, because a cost of 1 MMK
                    reads as a wonderful margin and would otherwise hide. */}
                {a.suspect && !(a.margin_pct != null && a.margin_pct < 0) && (
                  <span className="text-[11px] w-full" style={{ color: 'var(--status-pending)' }}>
                    {t('stockIn.suspectCost')}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* The batches themselves. Two rows for the same product at different
          costs is how a cost change gets noticed in the first place. */}
      <div className="surface-card is-sheet p-5 lg:col-span-12">
        <h3 className="text-[13px] font-semibold text-ink mb-4 flex items-center gap-2">
          <IconHistory size={16} stroke={1.7} className="text-brand" />
          {t('stockIn.historyTitle')}
        </h3>
        {history.status === 'loading' ? (
          <div className="space-y-2.5 skeleton-row">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="flex items-center gap-3" style={{ '--i': i }}>
                <Skeleton style={{ flex: 1, height: 13 }} />
                <Skeleton w={60} h={13} />
                <Skeleton w={80} h={13} />
              </div>
            ))}
          </div>
        ) : history.batches.length === 0 ? (
          <p className="text-sm text-mute py-8 text-center">{t('stockIn.historyEmpty')}</p>
        ) : (
          <>
            {history.failed > 0 && (
              <p className="text-[12px] mb-3" style={{ color: 'var(--status-pending)' }}>
                {t('stockIn.historyPartial', { count: history.failed })}
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-app bg-base/55 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-mute">
                    <th className="px-4 py-3.5 font-semibold">{t('table.date')}</th>
                    <th className="px-4 py-3.5 font-semibold">{t('table.item')}</th>
                    <th className="px-4 py-3.5 text-right font-semibold">{t('table.qty')}</th>
                    <th className="px-4 py-3.5 text-right font-semibold">{t('salesTable.buyPrice')}</th>
                    <th className="px-4 py-3.5 text-right font-semibold">{t('table.total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  {history.batches.slice(0, 40).map(b => (
                    <tr key={b.id} className="hover:bg-brand-light transition-colors">
                      <td className="px-4 py-3 text-sub tabular-nums whitespace-nowrap">
                        {b.received_at ? formatShopTime(b.received_at, 'MMM D, YYYY') : '-'}
                      </td>
                      <td className="px-4 py-3 text-ink min-w-0 truncate">{b.name}</td>
                      <td className="px-4 py-3 text-right text-ink tabular-nums">{b.quantity_received}</td>
                      <td className="px-4 py-3 text-right text-sub tabular-nums">{formatMMK(b.unit_cost)}</td>
                      <td className="px-4 py-3 text-right text-ink font-medium tabular-nums">
                        {formatMMK(b.unit_cost * b.quantity_received)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <BarcodeCameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDetected={code => {
          setQuery(code);
          setResults([]);
          setError('');
          barcodeRef.current?.focus();
        }}
      />
    </div>
  );
}
