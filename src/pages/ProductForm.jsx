import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { IconLoader2, IconArrowLeft, IconPhoto, IconUpload } from '@tabler/icons-react';
import { getCategories } from '../services/categoryService';
import { getProductById, createProduct, updateProduct, insertInventory } from '../services/productService';
import { uploadProductImage, validateProductImage, ImageTooLargeError } from '../services/uploadService';
import { useAuth } from '../context/AuthContext';

const EMPTY = { barcode: '', name: '', selling_price: '', category_id: '', sub_category_id: '', is_shown_online: true, is_perishable: false, description: '', image_url: '' };

export default function ProductForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { isManager } = useAuth();

  const [form, setForm] = useState(EMPTY);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageMessage, setImageMessage] = useState('');
  const [error, setError] = useState('');
  const [addInventory, setAddInventory] = useState(false);
  const [quantityReceived, setQuantityReceived] = useState('');
  const [unitCost, setUnitCost] = useState('');

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
              is_shown_online: found.is_shown_online ?? true,
              is_perishable: found.is_perishable ?? false,
              description: found.description ?? '',
              image_url: found.image_url ?? '',
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

  const selectImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const validation = validateProductImage(file);
    if (validation === 'type') return setImageMessage(t('productForm.imageTypeError'));
    if (validation === 'size') return setImageMessage(t('productForm.imageSizeError'));

    setImageMessage('');
    setUploadingImage(true);
    try {
      const fileUrl = await uploadProductImage(file);
      set('image_url', fileUrl);
      setImageMessage(t('productForm.imageUploaded'));
    } catch (err) {
      setImageMessage(err instanceof ImageTooLargeError
        ? t('productForm.imageServerLimit')
        : err?.message || t('productForm.imageUploadFailed'));
    } finally {
      setUploadingImage(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.category_id) { setError(t('productForm.categoryRequired')); return; }

    const hasInventory = addInventory && quantityReceived && unitCost;

    const body = {
      barcode: form.barcode.trim(),
      name: form.name.trim(),
      category_id: form.category_id,
      sub_category_id: form.sub_category_id || null,
      selling_price: String(form.selling_price || 0),
      is_shown_online: form.is_shown_online,
      is_perishable: form.is_perishable,
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
    };

    // Only the create endpoint accepts a nested inventory batch; on update the
    // stock goes through insertInventory instead.
    const createBody = hasInventory
      ? { ...body, inventory: { quantity_received: Number(quantityReceived), unit_cost: String(unitCost) } }
      : body;

    setSaving(true);
    try {
      if (isEdit) {
        await updateProduct(id, body);
        if (hasInventory) {
          await insertInventory(id, {
            quantity_received: Number(quantityReceived),
            unit_cost: String(unitCost),
          });
        }
      } else {
        await createProduct(createBody);
      }
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

      <div className="surface-card is-sheet p-6">
        <h2 className="text-lg font-semibold text-ink mb-5">
          {isEdit ? t('productForm.editHeading') : t('productForm.addHeading')}
        </h2>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

          <div>
            <label className="block text-xs font-medium text-ink mb-1">{t('productForm.image')}</label>
            <div className="flex items-start gap-3">
              <div className="w-20 h-20 flex-shrink-0 rounded-lg border border-app bg-card overflow-hidden flex items-center justify-center">
                {form.image_url?.trim() ? (
                  <img src={form.image_url.trim()} alt="" className="w-full h-full object-cover"
                    onError={e => { e.currentTarget.style.display = 'none'; }}
                    onLoad={e => { e.currentTarget.style.display = ''; }} />
                ) : (
                  <IconPhoto size={22} stroke={1.3} className="text-mute" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                {isManager && (
                  <label className={`inline-flex items-center gap-2 w-fit px-3 py-2 rounded-lg border border-app text-sm font-medium text-ink hover:border-brand hover:text-brand transition-colors cursor-pointer ${uploadingImage ? 'pointer-events-none opacity-60' : ''}`}>
                    {uploadingImage
                      ? <IconLoader2 size={16} className="animate-spin" />
                      : <IconUpload size={16} stroke={1.8} />}
                    {uploadingImage ? t('productForm.imageUploading') : t('productForm.imageChoose')}
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={selectImage} disabled={uploadingImage} className="sr-only" />
                  </label>
                )}
                <input value={form.image_url} onChange={e => set('image_url', e.target.value)}
                  type="url" inputMode="url" placeholder="https://..."
                  className="w-full mt-2 px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
                <p className="text-[11px] text-mute mt-1.5">{t('productForm.imageHelp')}</p>
                {imageMessage && <p role="status" className="text-[11px] text-sub mt-1.5">{imageMessage}</p>}
              </div>
            </div>
          </div>

          <div className="border border-app rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-ink">{isEdit ? t('productForm.addStock') : t('productForm.addInventory')}</label>
              <button type="button" onClick={() => setAddInventory(!addInventory)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${addInventory ? 'bg-brand' : 'bg-app'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-card shadow transition-transform ${addInventory ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            {addInventory && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">{t('productForm.quantityReceived')}</label>
                  <input type="number" min="1" step="1" value={quantityReceived} onChange={e => setQuantityReceived(e.target.value)} required={addInventory}
                    className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">{t('productForm.unitCost')}</label>
                  <input type="number" min="0" step="1" value={unitCost} onChange={e => setUnitCost(e.target.value)} required={addInventory}
                    className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-ink">{t('products.perishable')}</label>
            <button type="button" onClick={() => set('is_perishable', !form.is_perishable)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${form.is_perishable ? 'bg-brand' : 'bg-app'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-card shadow transition-transform ${form.is_perishable ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className="text-[11px] text-mute">{t('products.perishableHelp')}</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-ink">{t('products.visibleOnline')}</label>
            <button type="button" onClick={() => set('is_shown_online', !form.is_shown_online)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_shown_online ? 'bg-brand' : 'bg-app'}`}>
              <span className={`inline-block h-4 w-4 transform rounded-full bg-card shadow transition-transform ${form.is_shown_online ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => navigate('/products')} className="px-4 py-2 text-sm border border-app rounded-lg text-sub hover:bg-brand-light cursor-pointer">{t('common.cancel')}</button>
            <button type="submit" disabled={saving || uploadingImage} className="btn-primary">
              {saving && <IconLoader2 size={16} className="animate-spin" />}
              {isEdit ? t('common.saveChanges') : t('productForm.create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

