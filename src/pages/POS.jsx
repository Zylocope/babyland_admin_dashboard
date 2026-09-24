import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Skeleton from '../components/common/Skeleton';
import { IconSearch, IconPlus, IconMinus, IconTrash, IconShoppingCart, IconCircleCheck, IconBarcode, IconLoader2, IconAlertTriangle, IconCamera } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { formatMMK } from '../utils/currency';
import Modal from '../components/common/Modal';
import BarcodeCameraScanner from '../components/common/BarcodeCameraScanner';
import { searchProductsSimple, createSale } from '../services/productService';

const num = (v) => Number(v ?? 0);

// A concurrent sale is reported by the backend as
//   "insufficient inventory for product <uuid>: requested 5, available 3"
// A uuid is useless at the till, so it is swapped for the cart line's name.
const SHORTAGE = /insufficient inventory for product ([0-9a-f-]{36}): requested (\d+), available (-?\d+)/i;

const explainSaleError = (err, cart, t) => {
  const m = SHORTAGE.exec(err?.message ?? '');
  if (!m) return err?.message ?? '';
  const name = cart.find(l => l.id === m[1])?.name ?? t('pos.thisItem');
  return t('pos.shortStock', { name, requested: m[2], available: m[3] });
};

export default function POS() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  // The query the last completed search was FOR. Without it there is a frame
  // between typing and the debounce firing where nothing is searching and
  // nothing has been found, and the screen says "no products" about a search
  // that has not happened yet.
  const [searchedFor, setSearchedFor] = useState('');
  const [searchError, setSearchError] = useState('');
  const [cart, setCart] = useState([]);          // [{ id, name, barcode, price, stock, qty }]
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);   // { lines, total, recorded, reason }
  const [cameraOpen, setCameraOpen] = useState(false);
  const inputRef = useRef(null);

  // A scanned code arrives whole — the scanner types it in one burst and an
  // exact barcode match is added to the cart and cleared straight away. Showing
  // placeholders for that flashes them up and pulls them away inside half a
  // second, which reads as a glitch rather than progress. A typed product name
  // is the case that genuinely waits, and that is the case that keeps them.
  const looksScanned = (q) => /^\d{6,}$/.test(q);

  const addToCart = useCallback((p) => {
    const stock = num(p.quantity_in_stock);
    setCart(prev => {
      const line = prev.find(l => l.id === p.id);
      if (line) {
        if (line.qty >= stock) return prev;             // never oversell
        return prev.map(l => l.id === p.id ? { ...l, qty: l.qty + 1 } : l);
      }
      if (stock <= 0) return prev;
      return [...prev, { id: p.id, name: p.name, barcode: p.barcode, price: num(p.selling_price), stock, qty: 1 }];
    });
    inputRef.current?.focus();
  }, []);

  // Debounced live product search (real backend).
  useEffect(() => {
    const q = query.trim();
    if (!q) return undefined;

    let active = true;
    const h = setTimeout(async () => {
      try {
        const res = await searchProductsSimple(q, { page: 1, page_size: 12 });
        const items = Array.isArray(res) ? res : res?.data ?? [];
        if (!active) return;
        setResults(items);
        setSearchError('');
        setSearchedFor(q);
        // Scanner behaviour: an exact barcode match auto-adds and clears.
        const exact = items.find(p => p.barcode?.toLowerCase() === q.toLowerCase());
        if (exact && items.length === 1) {
          addToCart(exact);
          setQuery('');
          setResults([]);
          setSearchedFor('');
        }
      } catch (e) {
        if (active) { setSearchError(e?.message || t('pos.searchFailed')); setResults([]); setSearchedFor(q); }
      }
    }, 500);

    return () => { active = false; clearTimeout(h); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, addToCart]);

  const setQty = (id, qty) => setCart(prev => prev.flatMap(l => {
    if (l.id !== id) return [l];
    const clamped = Math.max(0, Math.min(l.stock, qty));
    return clamped === 0 ? [] : [{ ...l, qty: clamped }];
  }));

  const removeLine = (id) => setCart(prev => prev.filter(l => l.id !== id));

  const { count, total } = useMemo(() => cart.reduce(
    (acc, l) => ({ count: acc.count + l.qty, total: acc.total + l.qty * l.price }),
    { count: 0, total: 0 },
  ), [cart]);

  const completeSale = async () => {
    if (cart.length === 0) return;
    setSubmitting(true);
    const items = cart.map(l => ({ product_id: l.id, quantity: l.qty }));
    const lines = cart.map(l => ({ name: l.name, qty: l.qty, price: l.price, lineTotal: l.qty * l.price }));

    try {
      await createSale({ sale_products: items });
      setReceipt({ lines, total, recorded: true });
      setCart([]);
      setQuery('');
      setResults([]);
      setSearchError('');
      setSearchedFor('');
    } catch (e) {
      // The cart is kept on purpose. The sale did not happen, and clearing it
      // made the cashier retype the whole basket just to retry.
      setReceipt({ lines, total, recorded: false, reason: explainSaleError(e, cart, t) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="pos-workspace grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Left: search + product results */}
      <div className="pos-search lg:col-span-7 flex flex-col min-h-0">
        <div className="relative mb-4">
          <IconSearch size={18} stroke={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            ref={inputRef} aria-label={t('pos.searchPlaceholder')}
            autoFocus
            value={query}
            onChange={e => {
              const value = e.target.value;
              setQuery(value);
              if (!value.trim()) {
                setResults([]);
                setSearchError('');
                setSearchedFor('');
              }
            }}
            placeholder={t('pos.searchPlaceholder')}
            className="w-full pl-11 pr-12 py-3 text-[15px] border border-app rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            type="button"
            onClick={() => setCameraOpen(true)}
            aria-label={t('barcodeCamera.open')}
            title={t('barcodeCamera.open')}
            className="control-icon absolute right-1.5 top-1/2 -translate-y-1/2 text-sub hover:text-brand hover:bg-brand-light cursor-pointer"
          >
            <IconCamera size={19} stroke={1.6} />
          </button>
        </div>

        {searchError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{searchError}</div>
        )}

        <div className="flex-1 overflow-y-auto pr-1">
          {results.length === 0 && query.trim() && searchedFor !== query.trim() && !searchError ? (
            // Mid-scan the panel does not change at all: the next thing that
            // happens is the product landing in the cart, and anything drawn in
            // between is a flicker between two states nobody asked to see.
            looksScanned(query.trim()) ? (
              <div className="pos-empty h-full flex flex-col items-center justify-center text-mute text-sm gap-2">
                <IconBarcode size={40} stroke={1.2} />
                {t('pos.startTyping')}
              </div>
            ) : (
            // Cards the shape of the results, so the grid does not jump when
            // they arrive. Nothing spins and nothing says "loading": the
            // placeholders are already saying it.
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="skeleton-row surface-card p-3 space-y-2" style={{ '--i': i }}>
                  <Skeleton style={{ width: '100%', height: 64, borderRadius: 10 }} />
                  <Skeleton w="80%" h={13} />
                  <Skeleton w="45%" h={11} />
                </div>
              ))}
            </div>
            )
          ) : results.length === 0 ? (
            <div className="pos-empty h-full flex flex-col items-center justify-center text-mute text-sm gap-2">
              <IconBarcode size={40} stroke={1.2} />
              {query.trim() ? t('pos.noResults') : t('pos.startTyping')}
            </div>
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {results.map(p => {
                const stock = num(p.quantity_in_stock);
                const out = stock <= 0;
                return (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    disabled={out || submitting}
                    className="pos-product surface-card is-sheet p-4 text-left disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <p className="font-medium text-ink text-sm leading-snug line-clamp-2">{p.name}</p>
                    <p className="text-[11px] text-mute font-mono mt-0.5">{p.barcode}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-semibold text-brand text-sm">{formatMMK(num(p.selling_price))}</span>
                      <span className={`text-[11px] ${out ? 'text-red-600' : 'text-sub'}`}>
                        {out ? t('pos.outOfStock') : t('pos.inStock', { n: stock })}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: cart */}
      <div className="pos-cart lg:col-span-5 surface-card is-sheet flex flex-col min-h-0">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-app">
          <IconShoppingCart size={18} stroke={1.6} className="text-brand" />
          <h3 className="font-semibold text-ink flex-1">{t('pos.cart')}</h3>
          <span className="text-sm text-sub">{t('pos.itemCount', { n: count })}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
          {cart.length === 0 ? (
            <div className="pos-empty h-full flex items-center justify-center text-mute text-sm">{t('pos.emptyCart')}</div>
          ) : cart.map(l => (
            <div key={l.id} className="pos-cart-line py-3 border-b border-app last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{l.name}</p>
                <p className="text-xs text-mute">{formatMMK(l.price)} × {l.qty}</p>
              </div>
              <div className="pos-quantity row-start-2">
                <button aria-label={t('pos.decrease', { name: l.name })} onClick={() => setQty(l.id, l.qty - 1)} disabled={submitting} className="p-1 rounded-md border border-app text-sub hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><IconMinus size={13} /></button>
                <span className="w-7 text-center text-sm tabular-nums">{l.qty}</span>
                <button aria-label={t('pos.increase', { name: l.name })} onClick={() => setQty(l.id, l.qty + 1)} disabled={l.qty >= l.stock || submitting} className="p-1 rounded-md border border-app text-sub hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><IconPlus size={13} /></button>
              </div>
              <span key={l.qty} className="pos-line-value col-start-2 row-start-1 text-right text-sm font-semibold text-ink tabular-nums self-center rounded">{formatMMK(l.qty * l.price)}</span>
              <button aria-label={t('pos.remove', { name: l.name })} onClick={() => removeLine(l.id)} disabled={submitting} className="pos-remove justify-self-end col-start-2 row-start-2 text-mute hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><IconTrash size={14} /></button>
            </div>
          ))}
        </div>

        <div className="pos-checkout border-t border-app p-4 sm:p-5 space-y-3">
          {/* ponytail: payment method + discount go here once the sales schema gains them. */}
          <div className="flex items-center justify-between text-lg font-bold text-ink">
            <span>{t('pos.total')}</span>
            <span className="tabular-nums">{formatMMK(total)}</span>
          </div>
          <button
            onClick={completeSale}
            disabled={cart.length === 0 || submitting}
            className="w-full inline-flex items-center justify-center gap-2 py-3 bg-brand text-white font-semibold rounded-xl hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? <IconLoader2 size={18} className="animate-spin" /> : <IconCircleCheck size={18} stroke={1.8} />}
            {t('pos.completeSale')}
          </button>
        </div>
      </div>

      {/* Sale result dialog */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="" size="sm">
        {receipt && (
          // The amount is the hero, not the tick. What the cashier turns to the
          // customer and says is the total; the status is one quiet line
          // confirming it went through. The old layout had it the other way
          // round — a 56px filled badge and a bold coloured heading above a
          // small total — which is the look of a template rather than a till.
          //
          // Colour comes from the status tokens, so it follows the theme. The
          // hardcoded green-100/green-800 pair it replaces stayed the same
          // washed-out green in every theme and in dark mode.
          <div className="space-y-5 py-1">
            <div className="flex items-center gap-2">
              {receipt.recorded
                ? <IconCircleCheck size={16} stroke={1.8} style={{ color: 'var(--status-delivered)' }} />
                : <IconAlertTriangle size={16} stroke={1.8} style={{ color: 'var(--status-cancelled)' }} />}
              <span className="text-[13px] font-medium"
                style={{ color: receipt.recorded ? 'var(--status-delivered)' : 'var(--status-cancelled)' }}>
                {receipt.recorded ? t('pos.saleSuccess') : t('pos.saleFailed')}
              </span>
            </div>

            <div>
              <p className="text-[12px] text-sub">{t('pos.total')}</p>
              <p className="text-[34px] font-bold text-ink tabular-nums leading-none mt-1">
                {formatMMK(receipt.total)}
              </p>
              <p className="text-[12px] text-sub mt-2 leading-relaxed">
                {receipt.recorded ? t('pos.saleSuccessDesc') : (receipt.reason || t('pos.saleFailedDesc'))}
              </p>
            </div>

            {/* A recessed panel rather than rules across the dialog: on a glass
                surface a hairline border reads as a seam, a tint reads as depth. */}
            <div className="rounded-2xl px-4 py-3 space-y-2"
              style={{ background: 'color-mix(in srgb, var(--text-muted) 8%, transparent)' }}>
              {receipt.lines.map((l, i) => (
                <div key={i} className="flex justify-between gap-4 text-[13px]">
                  <span className="text-sub min-w-0 truncate">
                    {l.name} <span className="text-mute tabular-nums">×{l.qty}</span>
                  </span>
                  <span className="tabular-nums text-ink flex-shrink-0">{formatMMK(l.lineTotal)}</span>
                </div>
              ))}
            </div>

            <button onClick={() => setReceipt(null)}
              className="press-spring w-full py-3.5 rounded-2xl bg-brand text-white font-medium hover:bg-brand-hover transition-colors cursor-pointer">
              {receipt.recorded ? t('pos.newSale') : t('pos.backToCart')}
            </button>
          </div>
        )}
      </Modal>

      <BarcodeCameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDetected={code => {
          setQuery(code);
          setSearchError('');
          inputRef.current?.focus();
        }}
      />
    </div>
  );
}

