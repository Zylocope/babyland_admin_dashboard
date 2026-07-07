import { useEffect, useMemo, useState } from 'react';
import { IconPencil, IconEye, IconEyeOff, IconPackage } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { formatMMK } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';
import SearchInput from '../components/common/SearchInput';
import Modal from '../components/common/Modal';
import { getAllProducts } from '../services/baseService';

const normalizeProduct = (product) => ({
  id: product.id,
  barcode: product.barcode,
  name: product.name,
  category: product.category,
  quantity_in_stock: Number(product.quantity_in_stock ?? product.stock ?? 0),
  stock: Number(product.quantity_in_stock ?? product.stock ?? 0),
  unit: product.unit ?? 'pcs',
  price: Number(product.price ?? 0),
  is_active: product.is_active ?? product.visible ?? true,
  visible: product.is_active ?? product.visible ?? true,
  lowStockThreshold: product.lowStockThreshold ?? 10,
  description: product.description ?? null,
  sub_category: product.sub_category ?? null,
  sub_category_id: product.sub_category_id ?? null,
  category_id: product.category_id,
  created_at: product.created_at,
  created_by: product.created_by,
  updated_at: product.updated_at,
  updated_by: product.updated_by,
});

export default function Products() {
  const { t } = useTranslation();
  const { isManager } = useAuth();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [editProduct, setEditProduct] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await getAllProducts();
        const items = Array.isArray(response) ? response : response?.data ?? [];

        if (!active) return;
        setProducts(items.map(normalizeProduct));
      } catch (loadError) {
        if (!active) return;
        setError(loadError?.response?.data?.message || loadError?.message || t('products.loadFailed'));
        setProducts([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, [t]);

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(products.map(p => p.category).filter(Boolean))];
    return ['All', ...uniqueCategories];
  }, [products]);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search) || p.id.includes(search);
    const matchCat = catFilter === 'All' || p.category === catFilter;
    return matchSearch && matchCat;
  });

  const openEdit = (p) => {
    setEditProduct(p);
    setForm({
      price: p.price,
      quantity_in_stock: p.quantity_in_stock,
      is_active: p.is_active,
      lowStockThreshold: p.lowStockThreshold,
    });
  };

  const saveEdit = () => {
    setProducts(prev => prev.map(p => p.id === editProduct.id ? {
      ...p,
      ...form,
      quantity_in_stock: form.quantity_in_stock,
      stock: form.quantity_in_stock,
      is_active: form.is_active,
      visible: form.is_active,
    } : p));
    setEditProduct(null);
  };

  const toggleVisible = (id) => {
    setProducts(prev => prev.map(p => p.id === id ? {
      ...p,
      is_active: !p.is_active,
      visible: !p.is_active,
    } : p));
  };

  const lowStockIds = new Set(products.filter(p => p.quantity_in_stock <= p.lowStockThreshold).map(p => p.id));

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48">
          <SearchInput value={search} onChange={setSearch} placeholder={t('products.search')} />
        </div>
        <select
          value={catFilter}
          onChange={e => setCatFilter(e.target.value)}
          className="px-3 py-2 text-sm border border-app rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="All">{t('common.allCategories')}</option>
          {categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
        </select>
        <div className="text-sm text-sub">{t('products.count', { count: filtered.length })}</div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card border border-app overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white bg-brand">
                <th className="px-5 py-3 font-medium">{t('table.item')}</th>
                <th className="px-4 py-3 font-medium">{t('table.barcode')}</th>
                <th className="px-4 py-3 font-medium">{t('table.category')}</th>
                <th className="px-4 py-3 font-medium">{t('table.stock')}</th>
                <th className="px-4 py-3 font-medium">{t('table.unit')}</th>
                <th className="px-4 py-3 font-medium">{t('table.price')}</th>
                <th className="px-4 py-3 font-medium">{t('table.visibility')}</th>
                {isManager && <th className="px-4 py-3 font-medium">{t('table.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {loading ? (
                <tr>
                  <td colSpan={isManager ? 8 : 7} className="px-5 py-12 text-center text-sm text-mute">
                    {t('products.loading')}
                  </td>
                </tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-brand-light transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-brand-light flex items-center justify-center flex-shrink-0">
                        <IconPackage stroke={1.5} size={16} className="text-brand" />
                      </div>
                      <div>
                        <p className="font-medium text-ink">{p.name}</p>
                        <p className="text-xs text-mute">{p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-sub">{p.barcode}</td>
                  <td className="px-4 py-3.5 text-sub">{p.category}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${lowStockIds.has(p.id) ? 'text-red-600' : 'text-ink'}`}>
                        {p.quantity_in_stock}
                      </span>
                      {lowStockIds.has(p.id) && <Badge label="Low" />}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sub">{p.unit}</td>
                  <td className="px-4 py-3.5 font-medium text-ink">{formatMMK(p.price)}</td>
                  <td className="px-4 py-3.5">
                    <Badge label={p.visible ? 'Active' : 'Hidden'} />
                  </td>
                  {isManager && (
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg text-mute hover:text-brand hover:bg-brand-light transition-colors" title={t('common.edit')}>
                          <IconPencil stroke={1.5} size={15} />
                        </button>
                        <button onClick={() => toggleVisible(p.id)} className="p-1.5 rounded-lg text-mute hover:text-sub hover:bg-brand-light transition-colors" title={p.visible ? t('products.hide') : t('products.show')}>
                          {p.visible ? <IconEyeOff stroke={1.5} size={15} /> : <IconEye stroke={1.5} size={15} />}
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && filtered.length === 0 && (
            <div className="text-center py-12 text-mute text-sm">{t('products.none')}</div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={!!editProduct} onClose={() => setEditProduct(null)} title={t('products.editTitle', { name: editProduct?.name })}>
        {editProduct && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink mb-1">{t('products.salePrice')}</label>
                <input type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: +e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink mb-1">{t('products.stockQty')}</label>
                <input type="number" value={form.quantity_in_stock} onChange={e => setForm(f => ({ ...f, quantity_in_stock: +e.target.value }))}
                  className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1">{t('products.lowStockThreshold')}</label>
              <input type="number" value={form.lowStockThreshold} onChange={e => setForm(f => ({ ...f, lowStockThreshold: +e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-ink">{t('products.visibleOnline')}</label>
              <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-brand' : 'bg-app'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-card shadow transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setEditProduct(null)} className="px-4 py-2 text-sm border border-app rounded-lg text-sub hover:bg-brand-light">{t('common.cancel')}</button>
              <button onClick={saveEdit} className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-hover font-medium">{t('common.saveChanges')}</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
