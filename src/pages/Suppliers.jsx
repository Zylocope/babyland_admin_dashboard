import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IconPlus, IconPencil, IconTrash, IconTruckDelivery, IconRefresh } from '@tabler/icons-react';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { SkeletonRows } from '../components/common/Skeleton';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../services/supplierService';

// Supplier list (backend 3e9431c). Manager only on this page; the backend
// lets Sale Staff read the list but only the Manager may change it.
export default function Suppliers() {
  const { t } = useTranslation();
  const [state, setState] = useState({ status: 'loading', rows: [], error: '' });
  const [form, setForm] = useState(null);   // { id?, name, contact_number }
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = () => getSuppliers()
    .then(rows => setState({ status: 'ok', rows: Array.isArray(rows) ? rows : [], error: '' }))
    .catch(err => setState({ status: 'error', rows: [], error: err?.message || t('suppliers.loadFailed') }));

  useEffect(() => {
    let active = true;
    getSuppliers()
      .then(rows => { if (active) setState({ status: 'ok', rows: Array.isArray(rows) ? rows : [], error: '' }); })
      .catch(err => { if (active) setState({ status: 'error', rows: [], error: err?.message || t('suppliers.loadFailed') }); });
    return () => { active = false; };
  }, [t]);

  const save = async (e) => {
    e.preventDefault();
    const body = { name: form.name.trim(), contact_number: form.contact_number.trim() };
    if (!body.name || !body.contact_number) { setFormError(t('suppliers.required')); return; }
    setSaving(true);
    try {
      if (form.id) await updateSupplier(form.id, body); else await createSupplier(body);
      setForm(null);
      await load();
    } catch (err) {
      setFormError(err?.message || t('suppliers.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  const field = 'w-full px-3 py-2 text-sm border border-app rounded-lg bg-card text-ink focus:outline-none focus:ring-2 focus:ring-brand';

  return (
    <div className="mobile-page max-w-4xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] text-sub">{t('suppliers.intro')}</p>
        <button onClick={() => { setFormError(''); setForm({ name: '', contact_number: '' }); }} className="btn-primary">
          <IconPlus size={16} stroke={2} /> {t('suppliers.add')}
        </button>
      </div>

      {state.status === 'error' && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span className="flex-1 min-w-48">{state.error}</span>
          <button type="button" onClick={() => { setState({ status: 'loading', rows: [], error: '' }); load(); }} className="inline-flex items-center gap-1.5 font-medium cursor-pointer">
            <IconRefresh size={15} /> {t('assistant.retry')}
          </button>
        </div>
      )}

      <div className="surface-card is-sheet overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-app bg-base/55 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-mute">
              <th className="px-5 py-3.5 font-semibold">{t('suppliers.name')}</th>
              <th className="px-4 py-3.5 font-semibold">{t('suppliers.contact')}</th>
              <th className="px-5 py-3.5 text-right font-semibold">{t('table.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-app">
            {state.status === 'loading' && <SkeletonRows rows={4} cols={['50%', '40%', '30%']} />}
            {state.status === 'ok' && state.rows.map(s => (
              <tr key={s.id} className="hover:bg-brand-light/60 transition-colors">
                <td className="px-5 py-3 font-medium text-ink">
                  <span className="inline-flex items-center gap-2"><IconTruckDelivery size={16} stroke={1.6} className="text-brand" />{s.name}</span>
                </td>
                <td className="px-4 py-3 text-sub tabular-nums">{s.contact_number}</td>
                <td className="px-5 py-3 text-right whitespace-nowrap">
                  <button onClick={() => { setFormError(''); setForm({ id: s.id, name: s.name, contact_number: s.contact_number }); }}
                    aria-label={t('suppliers.edit')} className="p-1.5 rounded-lg text-sub hover:text-brand hover:bg-brand-light cursor-pointer">
                    <IconPencil size={16} stroke={1.7} />
                  </button>
                  <button onClick={() => setDeleting(s)} aria-label={t('suppliers.delete')}
                    className="p-1.5 rounded-lg text-sub hover:text-red-600 hover:bg-red-50 cursor-pointer">
                    <IconTrash size={16} stroke={1.7} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {state.status === 'ok' && state.rows.length === 0 && (
          <p className="py-10 text-center text-sm text-mute">{t('suppliers.none')}</p>
        )}
      </div>

      <Modal open={!!form} onClose={() => !saving && setForm(null)} title={form?.id ? t('suppliers.edit') : t('suppliers.add')} size="sm">
        {form && (
          <form onSubmit={save} className="space-y-3">
            <label className="block">
              <span className="text-[13px] font-medium text-ink">{t('suppliers.name')}</span>
              <input autoFocus value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={`${field} mt-1`} />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium text-ink">{t('suppliers.contact')}</span>
              <input value={form.contact_number} inputMode="tel" onChange={e => setForm({ ...form, contact_number: e.target.value })} className={`${field} mt-1`} />
            </label>
            {formError && <p role="alert" className="text-[12px] text-red-600">{formError}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setForm(null)} disabled={saving}
                className="px-4 py-2 text-sm rounded-lg border border-app text-sub hover:bg-brand-light cursor-pointer">{t('common.cancel')}</button>
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? <span className="animate-pulse">{t('settings.saving')}</span> : t('common.saveChanges')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} danger
        title={t('suppliers.delete')} message={t('suppliers.deleteMsg', { name: deleting?.name ?? '' })} confirmLabel={t('suppliers.delete')}
        onConfirm={async () => {
          const target = deleting;
          if (!target) return;
          try { await deleteSupplier(target.id); await load(); }
          catch (err) { setState(cur => ({ ...cur, error: err?.message || t('suppliers.saveFailed'), status: 'error' })); }
        }} />
    </div>
  );
}
