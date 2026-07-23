import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconLoader2, IconArrowLeft } from '@tabler/icons-react';
import { getCategories } from '../services/categoryService';
import { getProductById, createProduct, updateProduct } from '../services/productService';

const EMPTY = { barcode: '', name: '', selling_price: '', category_id: '', sub_category_id: '', is_active: true, description: '' };

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const cats = await getCategories();
        if (active) setCategories(Array.isArray(cats) ? cats : []);
      } catch {
        // Categories are best-effort; the form still renders without them.
      }

      if (isEdit) {
        try {
          const found = await getProductById(id);
          if (!active) return;
          if (found) {
            setForm({
              barcode: found.barcode ?? '',
              name: found.name ?? '',
              selling_price: found.selling_price ?? '',
              category_id: found.category_id ?? '',
              sub_category_id: found.sub_category_id ?? '',
              is_active: found.is_active ?? true,
              description: found.description ?? '',
            });
          } else {
            setError(t('productForm.notFound'));
          }
        } catch (e) {
          if (active) setError(e?.message || t('products.loadFailed'));
        } finally {
          if (active) setLoading(false);
        }
      }
    })();

    return () => { active = false; };
  }, [id, isEdit, t]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.category_id) { setError(t('productForm.categoryRequired')); return; }

    const body = {
      barcode: form.barcode.trim(),
      name: form.name.trim(),
      category_id: form.category_id,
      sub_category_id: form.sub_category_id || null,
      selling_price: String(form.selling_price || 0),
      is_active: form.is_active,
      description: form.description.trim() || null,
    };

    setSaving(true);
    try {
      if (isEdit) await updateProduct(id, body);
      else await createProduct(body);
      navigate('/products');
    } catch (err) {
      setError(err?.message || t('productForm.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-mute">{t('products.loading')}</div>;
  }

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate('/products')}
        className="inline-flex items-center gap-1.5 text-sm text-sub hover:text-brand mb-4 cursor-pointer"
      >
        <IconArrowLeft size={16} stroke={1.8} /> {t('productForm.back')}
      </button>

      <div className="surface-card p-6">
        <h2 className="text-lg font-semibold text-ink mb-5">
          {isEdit ? t('productForm.editHeading') : t('productForm.addHeading')}
        </h2>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">{t('table.barcode')}</label>
              <input value={form.barcode} onChange={e => set('barcode', e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1">{t('productForm.name')}</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1">{t('products.sellingPrice')}</label>
              <input type="number" min="0" step="1" value={form.selling_price} onChange={e => set('selling_price', e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1">{t('table.category')}</label>
              <select value={form.category_id} onChange={e => set('category_id', e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-app rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-brand">
                <option value="">{t('productForm.selectCategory')}</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* sub_category_id is a FK to categories(id) — same table, so reuse the list. */}
          <div>
            <label className="block text-xs font-medium text-ink mb-1">{t('productForm.subCategory')}</label>
            <select value={form.sub_category_id} onChange={e => set('sub_category_id', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-app rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-brand">
              <option value="">{t('productForm.noSubCategory')}</option>
              {categories.filter(c => c.id !== form.category_id).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">{t('productForm.description')}</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
          </div>

          <p className="text-xs text-mute">{t('productForm.stockNote')}</p>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-ink">{t('products.visibleOnline')}</label>
            <button type="button" onClick={() => set('is_active', !form.is_active)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-brand' : 'bg-app'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-card shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate('/products')} className="px-4 py-2 text-sm border border-app rounded-lg text-sub hover:bg-brand-light cursor-pointer">{t('common.cancel')}</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving && <IconLoader2 size={16} className="animate-spin" />}
              {isEdit ? t('common.saveChanges') : t('productForm.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
