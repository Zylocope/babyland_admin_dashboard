import { useState, useEffect } from 'react';
import { IconPencil, IconEye, IconEyeOff, IconPackage, IconPlus, IconTrash, IconPhoto, IconChevronUp, IconChevronDown } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { mockProducts, CATEGORIES } from '../data/mock';
import { formatMMK } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import { fetchProducts } from '../api';
import Badge from '../components/common/Badge';
import SearchInput from '../components/common/SearchInput';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';

const BLANK = { name: '', category: CATEGORIES[0], barcode: '', price: 0, discount: 0, stock: 0, unit: 'pcs', lowStockThreshold: 5, visible: true, image: null };
const effPrice = (p) => Math.round((p.price || 0) * (1 - (p.discount || 0) / 100));

export default function Products() {
  const { t } = useTranslation();
  const { isManager } = useAuth();
  const [products, setProducts] = useState(mockProducts);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [modal, setModal] = useState(null); // 'new' | product | null
  const [forms, setForms] = useState([BLANK]);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Live data when VITE_API_URL is set; otherwise mock.
  // ponytail: writes below stay local — no create/update/delete endpoints yet.
  useEffect(() => {
    fetchProducts().then(list => { if (list) setProducts(list); }).catch(() => {});
  }, []);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.barcode.includes(search) || p.id.includes(search);
    const matchCat = catFilter === 'All' || p.category === catFilter;
    return matchSearch && matchCat;
  });

  const [sortCol, setSortCol] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc');

  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    
    let aVal = a[sortCol];
    let bVal = b[sortCol];
    
    if (sortCol === 'price') {
      aVal = effPrice(a);
      bVal = effPrice(b);
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <span className="ml-1 text-white/40">↕</span>;
    return sortOrder === 'asc' ? <IconChevronUp size={14} className="ml-1 inline" /> : <IconChevronDown size={14} className="ml-1 inline" />;
  };

  const openAdd = () => { setForms([{ ...BLANK }]); setModal('new'); };
  const openEdit = (p) => { setForms([{ ...BLANK, ...p }]); setModal(p); };

  const addAnotherForm = () => {
    if (forms.length < 10) setForms(prev => [...prev, { ...BLANK }]);
  };
  const removeForm = (index) => {
    setForms(prev => prev.filter((_, i) => i !== index));
  };

  const save = () => {
    if (modal === 'new') {
      const newProducts = forms.filter(f => f.name.trim()).map((f, i) => ({ ...f, id: `P${Date.now()}-${i}` }));
      if (newProducts.length > 0) {
        setProducts(prev => [...newProducts, ...prev]);
      }
    } else {
      setProducts(prev => prev.map(p => p.id === modal.id ? { ...p, ...forms[0] } : p));
    }
    setModal(null);
  };

  const remove = (id) => setProducts(prev => prev.filter(p => p.id !== id));
  const toggleVisible = (id) => setProducts(prev => prev.map(p => p.id === id ? { ...p, visible: !p.visible } : p));

  const lowStockIds = new Set(products.filter(p => p.stock <= p.lowStockThreshold).map(p => p.id));
  const setMultiForm = (index, k, v) => setForms(prev => prev.map((f, i) => i === index ? { ...f, [k]: v } : f));

  const onPhoto = (index, e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setMultiForm(index, 'image', reader.result); // ponytail: data-URL preview, local only until an upload endpoint exists
    reader.readAsDataURL(file);
  };

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
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
        <div className="text-sm text-sub">{t('products.count', { count: sorted.length })}</div>
        {isManager && (
          <button onClick={openAdd}
            className="ml-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-white text-[15px] font-semibold hover:bg-brand-hover transition-colors cursor-pointer shadow-card active:scale-[0.98]">
            <IconPlus size={18} stroke={2.2} /> {t('products.add')}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card rounded-xl shadow-card border border-app overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white bg-brand">
                <th className="px-5 py-3 font-medium">{t('table.item')}</th>
                <th className="px-4 py-3 font-medium">{t('table.barcode')}</th>
                <th className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-white/10 transition-colors" onClick={() => handleSort('category')}>
                  <div className="flex items-center">{t('table.category')} <SortIcon col="category" /></div>
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-white/10 transition-colors" onClick={() => handleSort('stock')}>
                  <div className="flex items-center">{t('table.stock')} <SortIcon col="stock" /></div>
                </th>
                <th className="px-4 py-3 font-medium">{t('table.unit')}</th>
                <th className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-white/10 transition-colors" onClick={() => handleSort('price')}>
                  <div className="flex items-center">{t('table.price')} <SortIcon col="price" /></div>
                </th>
                <th className="px-4 py-3 font-medium cursor-pointer select-none hover:bg-white/10 transition-colors" onClick={() => handleSort('visible')}>
                  <div className="flex items-center">{t('table.visibility')} <SortIcon col="visible" /></div>
                </th>
                {isManager && <th className="px-4 py-3 font-medium text-right">{t('table.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {sorted.map(p => (
                <tr key={p.id}
                  onClick={() => isManager && openEdit(p)}
                  className={`hover:bg-brand-light transition-colors ${isManager ? 'cursor-pointer' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {p.image ? (
                        <img src={p.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-app" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center flex-shrink-0">
                          <IconPackage stroke={1.5} size={18} className="text-brand" />
                        </div>
                      )}
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
                      <span className={`font-semibold ${lowStockIds.has(p.id) ? 'text-red-600' : 'text-ink'}`}>{p.stock}</span>
                      {lowStockIds.has(p.id) && <Badge label="Low" />}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-sub">{p.unit}</td>
                  <td className="px-4 py-3.5">
                    {p.discount > 0 ? (
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-ink">{formatMMK(effPrice(p))}</span>
                        <span className="text-xs text-mute line-through">{formatMMK(p.price)}</span>
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded px-1">-{p.discount}%</span>
                      </div>
                    ) : (
                      <span className="font-medium text-ink">{formatMMK(p.price)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5"><Badge label={p.visible ? 'Active' : 'Hidden'} /></td>
                  {isManager && (
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => openEdit(p)} className="p-2 rounded-lg text-mute hover:text-brand hover:bg-brand-light transition-colors" title={t('common.edit')}>
                          <IconPencil stroke={1.8} size={20} />
                        </button>
                        <button onClick={() => toggleVisible(p.id)} className="p-2 rounded-lg text-mute hover:text-sub hover:bg-brand-light transition-colors" title={p.visible ? t('products.hide') : t('products.show')}>
                          {p.visible ? <IconEyeOff stroke={1.8} size={20} /> : <IconEye stroke={1.8} size={20} />}
                        </button>
                        <button onClick={() => setConfirmDelete(p)} className="p-2 rounded-lg text-mute hover:text-[#EF4444] hover:bg-red-50 transition-colors" title={t('common.delete')}>
                          <IconTrash stroke={1.8} size={20} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length === 0 && <div className="text-center py-12 text-mute text-sm">{t('products.none')}</div>}
        </div>
      </div>

      {/* Add / Edit modal */}
      <Modal open={!!modal} onClose={() => setModal(null)}
        title={modal === 'new' ? t('products.addTitle') : t('products.editTitle', { name: modal?.name })} size="lg">
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {forms.map((form, index) => (
            <div key={index} className="space-y-4 p-4 border border-app rounded-xl bg-base relative">
              {modal === 'new' && forms.length > 1 && (
                <button onClick={() => removeForm(index)} className="absolute top-4 right-4 p-1.5 text-mute hover:text-[#EF4444] hover:bg-red-50 rounded-lg transition-colors">
                  <IconTrash size={18} stroke={1.8} />
                </button>
              )}
              {modal === 'new' && <div className="font-semibold text-ink text-sm">{t('products.rowLabel', { n: index + 1 })}</div>}
              {/* Photo */}
              <div className="flex items-center gap-4">
                {form.image ? (
                  <img src={form.image} alt="" className="w-20 h-20 rounded-xl object-cover border border-app" />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-brand-light flex items-center justify-center">
                    <IconPackage stroke={1.5} size={28} className="text-brand" />
                  </div>
                )}
                <div>
                  <label className="inline-flex items-center gap-2 px-3.5 py-2.5 text-sm rounded-lg border border-app text-sub hover:bg-brand-light cursor-pointer">
                    <IconPhoto size={16} stroke={1.6} /> {t('products.photo')}
                    <input type="file" accept="image/*" onChange={e => onPhoto(index, e)} className="hidden" />
                  </label>
                  {form.image && (
                    <button onClick={() => setMultiForm(index, 'image', null)} className="ml-2 text-xs text-[#EF4444] hover:underline">{t('common.delete')}</button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-ink mb-1">{t('products.name')}</label>
                  <input value={form.name} onChange={e => setMultiForm(index, 'name', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-[15px] border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">{t('table.category')}</label>
                  <select value={form.category} onChange={e => setMultiForm(index, 'category', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-[15px] border border-app rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-brand">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">{t('table.barcode')}</label>
                  <input value={form.barcode} onChange={e => setMultiForm(index, 'barcode', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-[15px] border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">{t('products.salePrice')}</label>
                  <input type="number" value={form.price} onChange={e => setMultiForm(index, 'price', +e.target.value)}
                    className="w-full px-3.5 py-2.5 text-[15px] border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">{t('products.discount')}</label>
                  <input type="number" min={0} max={100} value={form.discount} onChange={e => setMultiForm(index, 'discount', +e.target.value)}
                    className="w-full px-3.5 py-2.5 text-[15px] border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">{t('products.stockQty')}</label>
                  <input type="number" value={form.stock} onChange={e => setMultiForm(index, 'stock', +e.target.value)}
                    className="w-full px-3.5 py-2.5 text-[15px] border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink mb-1">{t('products.lowStockThreshold')}</label>
                  <input type="number" value={form.lowStockThreshold} onChange={e => setMultiForm(index, 'lowStockThreshold', +e.target.value)}
                    className="w-full px-3.5 py-2.5 text-[15px] border border-app rounded-lg focus:outline-none focus:ring-2 focus:ring-brand" />
                </div>
              </div>
              {form.discount > 0 && (
                <p className="text-xs text-sub">{t('products.effective')}: <span className="font-semibold text-ink">{formatMMK(effPrice(form))}</span></p>
              )}
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-ink">{t('products.visibleOnline')}</label>
                <button onClick={() => setMultiForm(index, 'visible', !form.visible)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.visible ? 'bg-brand' : 'bg-app'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-card shadow transition-transform ${form.visible ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>
            </div>
          ))}
          {modal === 'new' && forms.length < 10 && (
            <button onClick={addAnotherForm} className="w-full py-3 border-2 border-dashed border-app text-sub font-medium rounded-xl hover:bg-brand-light hover:text-brand hover:border-brand-light transition-colors flex items-center justify-center gap-2">
              <IconPlus size={18} stroke={2} /> {t('products.addAnother')}
            </button>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-app rounded-lg text-sub hover:bg-brand-light">{t('common.cancel')}</button>
            <button onClick={save} disabled={forms.some(f => !f.name.trim())}
              className="px-4 py-2 text-sm bg-brand text-white rounded-lg hover:bg-brand-hover font-medium disabled:opacity-50">
              {modal === 'new' ? t('products.add') : t('common.saveChanges')}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}
        onConfirm={() => remove(confirmDelete.id)}
        title={t('products.deleteTitle')} message={t('products.deleteMsg', { name: confirmDelete?.name })}
        confirmLabel={t('common.delete')} danger />
    </div>
  );
}
