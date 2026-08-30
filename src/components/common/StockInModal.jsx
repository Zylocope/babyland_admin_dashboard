import { useEffect, useState } from 'react';
import { IconClockHour4, IconDatabase } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { formatMMK } from '../../utils/currency';
import { parseApiDate } from '../../utils/apiDate';
import { getInventoryRecords, insertInventory } from '../../services/productService';
import { format } from 'date-fns';

const today = () => format(new Date(), 'yyyy-MM-dd');

// Mirrors the backend rules so the cashier sees the problem before the round trip:
// quantity and cost must be positive, and expiry is required for perishable
// products and rejected for the rest.
const validate = (form, product, t) => {
  if (!(Number(form.quantity) > 0)) return t('stockIn.errQty');
  if (!(Number(form.unitCost) > 0)) return t('stockIn.errCost');
  if (product.is_perishable && !form.expiry) return t('stockIn.errExpiry');
  return '';
};

export default function StockInModal({ product, open, onClose, onAdded }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ quantity: '', unitCost: '', receivedAt: today(), expiry: '' });
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const productId = product?.id;

  useEffect(() => {
    if (!open || !productId) return undefined;
    let active = true;
    getInventoryRecords(productId, { page_size: 20 })
      .then(res => { if (active) setBatches(res?.data ?? []); })
      .catch(() => { if (active) setBatches([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, productId]);

  if (!product) return null;

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const message = validate(form, product, t);
    if (message) { setError(message); return; }

    setSaving(true);
    setError('');
    try {
      await insertInventory(product.id, {
        quantity_received: Number(form.quantity),
        unit_cost: String(form.unitCost),
        ...(form.receivedAt ? { received_at: new Date(form.receivedAt).toISOString() } : {}),
        // Only perishable products may carry an expiry date.
        ...(product.is_perishable && form.expiry
          ? { expiry_date: new Date(form.expiry).toISOString() }
          : {}),
      });
      onAdded?.();
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to add stock');
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full px-3 py-2 text-sm border border-app rounded-lg bg-card text-ink focus:outline-none focus:ring-2 focus:ring-brand';

  return (
    <Modal open={open} onClose={onClose} title={t('stockIn.title', { name: product.name })} size="lg">
      <div className="space-y-5">
        <div className="flex items-center gap-2 text-sm text-sub">
          <span>{t('stockIn.current')}:</span>
          <span className="font-semibold text-ink">{product.quantity_in_stock}</span>
          {product.is_perishable && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 border border-amber-500 rounded-full px-2 py-0.5">
              <IconClockHour4 size={12} stroke={1.8} /> {t('productViews.perishable')}
            </span>
          )}
        </div>

        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-sub mb-1">{t('stockIn.quantity')}</label>
            <input type="number" min="1" step="1" value={form.quantity} onChange={set('quantity')} className={field} required />
          </div>
          <div>
            <label className="block text-xs text-sub mb-1">{t('stockIn.unitCost')}</label>
            <input type="number" min="1" step="1" value={form.unitCost} onChange={set('unitCost')} className={field} required />
          </div>
          <div>
            <label className="block text-xs text-sub mb-1">{t('stockIn.receivedAt')}</label>
            <input type="date" value={form.receivedAt} onChange={set('receivedAt')} max={today()} className={field} />
          </div>
          {product.is_perishable && (
            <div>
              <label className="block text-xs text-sub mb-1">{t('stockIn.expiry')}</label>
              <input type="date" value={form.expiry} onChange={set('expiry')} min={today()} className={field} required />
              <p className="mt-1 text-[11px] text-mute">{t('stockIn.expiryHelp')}</p>
            </div>
          )}

          {error && (
            <div className="sm:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          )}

          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
              {saving ? t('stockIn.adding') : t('stockIn.submit')}
            </button>
          </div>
        </form>

        <div>
          <h3 className="text-[13px] font-semibold text-ink mb-2">{t('stockIn.history')}</h3>
          {loading ? (
            <p className="text-sm text-mute py-4">{t('products.loading')}</p>
          ) : batches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-mute text-sm gap-2">
              <IconDatabase size={24} stroke={1.2} /> {t('stockIn.noBatches')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-mute text-xs">
                    <th className="py-2 text-left font-medium">{t('stockIn.receivedAt')}</th>
                    <th className="py-2 text-right font-medium">{t('stockIn.received')}</th>
                    <th className="py-2 text-right font-medium">{t('stockIn.remaining')}</th>
                    <th className="py-2 text-right font-medium">{t('stockIn.cost')}</th>
                    <th className="py-2 text-right font-medium">{t('stockIn.expiry')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app">
                  {batches.map(b => {
                    const received = parseApiDate(b.received_at ?? b.created_at);
                    const expiry = parseApiDate(b.expiry_date);
                    return (
                      <tr key={b.id}>
                        <td className="py-2 text-ink">{received ? format(received, 'yyyy-MM-dd') : '—'}</td>
                        <td className="py-2 text-right text-sub tabular-nums">{b.quantity_received}</td>
                        <td className="py-2 text-right text-ink font-medium tabular-nums">{b.quantity_remaining}</td>
                        <td className="py-2 text-right text-sub tabular-nums">{formatMMK(Number(b.unit_cost))}</td>
                        <td className="py-2 text-right text-sub tabular-nums">{expiry ? format(expiry, 'yyyy-MM-dd') : '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
