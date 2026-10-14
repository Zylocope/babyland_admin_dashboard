import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import SearchInput from './SearchInput';
import { formatMMK } from '../../utils/currency';
import { updateProduct } from '../../services/productService';
import { basePrice, discountBody, isDiscounted, percentOff, removeDiscountBody } from '../../utils/discount';

// Put several products on sale, or take them off, in one go. There is no
// bulk endpoint, so each product is one PUT; failures are counted and named
// rather than stopping the rest.
export default function DiscountModal({ open, onClose, products, onSaved }) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [pct, setPct] = useState('10');
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return products
      .filter(p => !term || p.name.toLowerCase().includes(term) || (p.barcode ?? '').toLowerCase().includes(term))
      .sort((a, b) => Number(isDiscounted(b)) - Number(isDiscounted(a)) || a.name.localeCompare(b.name));
  }, [products, search]);

  const pctNum = Number(pct);
  const pctValid = Number.isInteger(pctNum) && pctNum >= 1 && pctNum <= 90;
  const chosen = products.filter(p => picked.has(p.id));
  const chosenOnSale = chosen.filter(isDiscounted);

  const toggle = id => setPicked(cur => {
    const next = new Set(cur);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const run = async (list, makeBody) => {
    setBusy(true);
    setResult(null);
    const failed = [];
    for (const p of list) {
      try { await updateProduct(p.id, makeBody(p)); } catch { failed.push(p.name); }
    }
    setBusy(false);
    setResult({ ok: list.length - failed.length, failed });
    setPicked(new Set());
    onSaved();
  };

  const close = () => { if (!busy) { setResult(null); setPicked(new Set()); onClose(); } };

  return (
    <Modal open={open} onClose={close} title={t('discounts.title')} size="lg">
      <p className="text-[12px] text-sub mb-4">{t('discounts.intro')}</p>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="flex-1 min-w-0"><SearchInput value={search} onChange={setSearch} placeholder={t('products.search')} /></div>
        <div className="relative sm:w-32">
          <input type="number" min="1" max="90" step="1" inputMode="numeric" value={pct}
            onChange={e => setPct(e.target.value)} aria-label={t('discounts.percent')}
            className="w-full rounded-lg border border-brand/40 bg-brand-light px-3 py-2 pr-16 text-base font-semibold text-brand tabular-nums focus:outline-none focus:ring-2 focus:ring-brand [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none" />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-brand">% {t('discounts.off')}</span>
        </div>
      </div>

      <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-app divide-y divide-app">
        {rows.length === 0 && <p className="py-8 text-center text-sm text-mute">{t('products.none')}</p>}
        {rows.map(p => {
          const on = isDiscounted(p);
          return (
            <label key={p.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-brand-light/50">
              <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} disabled={busy}
                className="w-4 h-4 accent-[var(--orange-primary)]" />
              <span className="flex-1 min-w-0 truncate text-sm text-ink">{p.name}</span>
              {on && <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5">−{percentOff(p)}%</span>}
              <span className="text-right tabular-nums text-sm">
                {on && <span className="block text-[11px] text-mute line-through">{formatMMK(basePrice(p))}</span>}
                <span className="text-ink">{formatMMK(Number(p.selling_price))}</span>
              </span>
            </label>
          );
        })}
      </div>

      {result && (
        <p role="status" className={`mt-3 text-[12px] ${result.failed.length ? 'text-red-600' : 'text-emerald-600'}`}>
          {t('discounts.done', { count: result.ok })}
          {result.failed.length > 0 && ` ${t('discounts.failed', { names: result.failed.join(', ') })}`}
        </p>
      )}

      <div className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
        <button type="button" disabled={busy || chosenOnSale.length === 0}
          onClick={() => run(chosenOnSale, removeDiscountBody)}
          className="px-4 py-2 text-sm rounded-lg border border-app text-sub hover:text-brand hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
          {t('discounts.remove', { count: chosenOnSale.length })}
        </button>
        <button type="button" disabled={busy || chosen.length === 0 || !pctValid}
          onClick={() => run(chosen, p => discountBody(p, pctNum))}
          className="btn-primary justify-center disabled:opacity-45">
          {busy ? <span className="animate-pulse">{t('settings.saving')}</span>
            : t('discounts.apply', { pct: pctValid ? pctNum : '–', count: chosen.length })}
        </button>
      </div>
      {!pctValid && <p className="mt-2 text-[12px] text-red-600 sm:text-right">{t('discounts.percentRange')}</p>}
    </Modal>
  );
}
