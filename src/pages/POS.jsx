import { useEffect, useMemo, useRef, useState } from 'react';
import { IconSearch, IconPlus, IconMinus, IconTrash, IconShoppingCart, IconCircleCheck, IconBarcode, IconLoader2, IconAlertTriangle } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { formatMMK } from '../utils/currency';
import Modal from '../components/common/Modal';
import { searchProductsSimple, createSale } from '../services/productService';

const num = (v) => Number(v ?? 0);

export default function POS() {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [cart, setCart] = useState([]);          // [{ id, name, barcode, price, stock, qty }]
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState(null);   // { lines, total, recorded }
  const inputRef = useRef(null);

  // Debounced live product search (real backend).
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults([]); setSearchError(''); return; }

    let active = true;
    setSearching(true);
    const h = setTimeout(async () => {
      try {
        const res = await searchProductsSimple(q, { page: 1, page_size: 12 });
        const items = Array.isArray(res) ? res : res?.data ?? [];
        if (!active) return;
        setResults(items);
        setSearchError('');
        // Scanner behaviour: an exact barcode match auto-adds and clears.
        const exact = items.find(p => p.barcode?.toLowerCase() === q.toLowerCase());
        if (exact && items.length === 1) { addToCart(exact); setQuery(''); setResults([]); }
      } catch (e) {
        if (active) { setSearchError(e?.message || t('pos.searchFailed')); setResults([]); }
      } finally {
        if (active) setSearching(false);
      }
    }, 300);

    return () => { active = false; clearTimeout(h); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const addToCart = (p) => {
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
  };

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
    const items = cart.map(l => ({ product_id: l.id, quantity: l.qty, selling_price: String(l.price) }));
    const lines = cart.map(l => ({ name: l.name, qty: l.qty, price: l.price, lineTotal: l.qty * l.price }));

    let recorded = false;
    try {
      // Forward-wired: succeeds the moment POST /admin/sales exists; until then we
      // still complete the sale locally so the till is usable for the migration demo.
      await createSale(items);
      recorded = true;
    } catch {
      recorded = false;
    } finally {
      setReceipt({ lines, total, recorded });
      setCart([]);
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-190px)]">
      {/* Left: search + product results */}
      <div className="lg:col-span-7 flex flex-col min-h-0">
        <div className="relative mb-4">
          <IconSearch size={18} stroke={1.5} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('pos.searchPlaceholder')}
            className="w-full pl-11 pr-4 py-3 text-[15px] border border-app rounded-xl bg-card focus:outline-none focus:ring-2 focus:ring-brand"
          />
          {searching && <IconLoader2 size={18} className="animate-spin absolute right-4 top-1/2 -translate-y-1/2 text-mute" />}
        </div>

        {searchError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{searchError}</div>
        )}

        <div className="flex-1 overflow-y-auto pr-1">
          {results.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-mute text-sm gap-2">
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
                    disabled={out}
                    className="surface-card p-3 text-left hover:-translate-y-0.5 transition-transform disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
      <div className="lg:col-span-5 surface-card flex flex-col min-h-0">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-app">
          <IconShoppingCart size={18} stroke={1.6} className="text-brand" />
          <h3 className="font-semibold text-ink flex-1">{t('pos.cart')}</h3>
          <span className="text-sm text-sub">{t('pos.itemCount', { n: count })}</span>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2 min-h-0">
          {cart.length === 0 ? (
            <div className="h-full flex items-center justify-center text-mute text-sm">{t('pos.emptyCart')}</div>
          ) : cart.map(l => (
            <div key={l.id} className="flex items-center gap-2 py-2.5 border-b border-app last:border-0">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink truncate">{l.name}</p>
                <p className="text-xs text-mute">{formatMMK(l.price)} × {l.qty}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button onClick={() => setQty(l.id, l.qty - 1)} className="p-1 rounded-md border border-app text-sub hover:bg-brand-light cursor-pointer"><IconMinus size={13} /></button>
                <span className="w-7 text-center text-sm tabular-nums">{l.qty}</span>
                <button onClick={() => setQty(l.id, l.qty + 1)} disabled={l.qty >= l.stock} className="p-1 rounded-md border border-app text-sub hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"><IconPlus size={13} /></button>
              </div>
              <span className="w-20 text-right text-sm font-medium text-ink tabular-nums">{formatMMK(l.qty * l.price)}</span>
              <button onClick={() => removeLine(l.id)} className="p-1 text-mute hover:text-red-600 cursor-pointer"><IconTrash size={14} /></button>
            </div>
          ))}
        </div>

        <div className="border-t border-app p-5 space-y-3">
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
          <p className="flex items-start gap-1.5 text-[11px] text-mute">
            <IconAlertTriangle size={13} stroke={1.6} className="mt-0.5 flex-shrink-0 text-amber-500" />
            {t('pos.pendingNote')}
          </p>
        </div>
      </div>

      {/* Receipt */}
      <Modal open={!!receipt} onClose={() => setReceipt(null)} title={t('pos.receiptTitle')} size="sm">
        {receipt && (
          <div className="space-y-4">
            <div className={`rounded-lg px-3 py-2 text-sm flex items-center gap-2 ${receipt.recorded ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'}`}>
              {receipt.recorded ? <IconCircleCheck size={16} /> : <IconAlertTriangle size={16} />}
              {receipt.recorded ? t('pos.recorded') : t('pos.heldLocally')}
            </div>
            <div className="divide-y divide-app">
              {receipt.lines.map((l, i) => (
                <div key={i} className="flex justify-between py-2 text-sm">
                  <span className="text-ink">{l.name} <span className="text-mute">×{l.qty}</span></span>
                  <span className="tabular-nums text-ink">{formatMMK(l.lineTotal)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-ink border-t border-app pt-3">
              <span>{t('pos.total')}</span>
              <span className="tabular-nums">{formatMMK(receipt.total)}</span>
            </div>
            <button onClick={() => setReceipt(null)} className="w-full py-2.5 bg-brand text-white rounded-lg font-medium hover:bg-brand-hover cursor-pointer">
              {t('pos.newSale')}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
