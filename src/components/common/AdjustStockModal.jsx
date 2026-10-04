import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { parseApiDate } from '../../utils/apiDate';
import { formatShopTime } from '../../utils/shopDay';
import { ADJUST_REASONS, buildAdjustment } from '../../utils/stockAdjust';
import { createAdjustment, getProductBatches } from '../../services/productService';

export default function AdjustStockModal({ product, open, onClose, onSaved }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ direction: 'remove', quantity: '', reason: 'damaged', batchId: '', note: '' });
  const [batches, setBatches] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const productId = product?.id;

  useEffect(() => {
    if (!open || !productId) return undefined;
    let active = true;
    getProductBatches(productId)
      .then(res => { if (active) setBatches(Array.isArray(res) ? res : []); })
      .catch(() => { if (active) setBatches([]); });
    return () => { active = false; };
  }, [open, productId]);

  if (!product) return null;

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));
  const setDirection = (direction) => setForm(f => ({ ...f, direction, batchId: '' }));

  // A removal can only come out of a batch that still holds stock; an addition
  // may go back into one that has already run out.
  const choices = (batches ?? []).filter(b => form.direction === 'add' || b.quantity_remaining > 0);
  const batchLabel = (b) => {
    const received = parseApiDate(b.received_at);
    const date = received ? formatShopTime(received, 'YYYY-MM-DD') : '—';
    return t('adjustStock.batchOption', { id: b.short_id, date, remaining: b.quantity_remaining, received: b.quantity_received });
  };

  const submit = async (e) => {
    e.preventDefault();
    const result = buildAdjustment(form, product, batches ?? []);
    if (result.error) { setError(t(result.error, { available: result.available })); return; }

    setSaving(true);
    setError('');
    try {
      await createAdjustment(result.payload);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.message || t('adjustStock.failed'));
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full px-3 py-2 text-sm border border-app rounded-lg bg-card text-ink focus:outline-none focus:ring-2 focus:ring-brand';
  const tab = (active) => `flex-1 px-3 py-2 text-sm rounded-lg border cursor-pointer transition-colors ${active ? 'border-brand bg-brand-light text-brand font-medium' : 'border-app text-sub hover:bg-brand-light'}`;

  return (
    <Modal open={open} onClose={onClose} title={t('adjustStock.title', { name: product.name })} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-sub">
          <span>{t('stockIn.current')}:</span>
          <span className="font-semibold text-ink">{product.quantity_in_stock}</span>
        </div>

        <div className="flex gap-2" role="radiogroup" aria-label={t('adjustStock.direction')}>
          <button type="button" role="radio" aria-checked={form.direction === 'remove'} onClick={() => setDirection('remove')} className={tab(form.direction === 'remove')}>
            {t('adjustStock.remove')}
          </button>
          <button type="button" role="radio" aria-checked={form.direction === 'add'} onClick={() => setDirection('add')} className={tab(form.direction === 'add')}>
            {t('adjustStock.add')}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="adjust-qty" className="block text-xs text-sub mb-1">{t('adjustStock.quantity')}</label>
            <input id="adjust-qty" type="number" min="1" step="1" value={form.quantity} onChange={set('quantity')} className={field} required />
          </div>
          <div>
            <label htmlFor="adjust-reason" className="block text-xs text-sub mb-1">{t('adjustStock.reason')}</label>
            <select id="adjust-reason" value={form.reason} onChange={set('reason')} className={field}>
              {ADJUST_REASONS.map(r => <option key={r} value={r}>{t(`adjustStock.reasons.${r}`)}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="adjust-batch" className="block text-xs text-sub mb-1">{t('adjustStock.batch')}</label>
            <select id="adjust-batch" value={form.batchId} onChange={set('batchId')} className={field} disabled={batches === null} required={form.direction === 'add'}>
              <option value="">{batches === null ? t('products.loading') : form.direction === 'add' ? t('adjustStock.pickBatch') : t('adjustStock.oldestFirst')}</option>
              {choices.map(b => <option key={b.id} value={b.id}>{batchLabel(b)}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-mute">{form.direction === 'add' ? t('adjustStock.addHelp') : t('adjustStock.removeHelp')}</p>
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="adjust-note" className="block text-xs text-sub mb-1">{t('adjustStock.note')}</label>
            <textarea id="adjust-note" rows={2} value={form.note} onChange={set('note')} className={field} />
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end">
          <button type="submit" disabled={saving || batches === null} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {saving ? t('adjustStock.saving') : t('adjustStock.submit')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
