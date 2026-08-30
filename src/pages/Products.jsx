import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconPencil, IconPackage, IconPlus, IconChevronLeft, IconChevronRight,
  IconDownload, IconList, IconAlertTriangle, IconCircleOff, IconEyeOff, IconClockHour4,
} from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { formatMMK } from '../utils/currency';
import { downloadCsv } from '../utils/csv';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';
import SearchInput from '../components/common/SearchInput';
import SubBar from '../components/common/SubBar';
import { getAllProducts } from '../services/productService';
import { getCategories } from '../services/categoryService';

const PAGE_SIZE = 10;
const LOW_STOCK_AT = 10;

// ponytail: the whole catalogue is fetched once and filtered in the browser.
// Fine into the low thousands; move filtering server-side if it ever gets slow.
const normalizeProduct = (product) => ({
  id: product.id,
  barcode: product.barcode ?? '',
  name: product.name ?? '',
  category: product.category ?? '',
  category_id: product.category_id,
  quantity_in_stock: Number(product.quantity_in_stock ?? 0),
  selling_price: Number(product.selling_price ?? 0),
  image_url: product.image_url ?? null,
  is_active: product.is_active ?? true,
  is_perishable: product.is_perishable ?? false,
});

const VIEW_FILTERS = {
  all: () => true,
  low: p => p.quantity_in_stock > 0 && p.quantity_in_stock <= LOW_STOCK_AT,
  out: p => p.quantity_in_stock === 0,
  hidden: p => !p.is_active,
  perishable: p => p.is_perishable,
};

export default function Products() {
  const { t } = useTranslation();
  const { isManager } = useAuth();
  const navigate = useNavigate();

  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [view, setView] = useState('all');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Any change to what is being filtered sends you back to page 1.
  const pickView = (v) => { setView(v); setPage(1); };
  const pickSearch = (v) => { setSearch(v); setPage(1); };
  const pickCategory = (v) => { setCatFilter(v); setPage(1); };

  useEffect(() => {
    let active = true;
    Promise.all([getAllProducts(), getCategories().catch(() => [])])
      .then(([products, cats]) => {
        if (!active) return;
        setAllProducts((Array.isArray(products) ? products : []).map(normalizeProduct));
        setCategories((Array.isArray(cats) ? cats : []).filter(Boolean));
      })
      .catch(err => {
        if (!active) return;
        setError(err?.message || t('products.loadFailed'));
        setAllProducts([]);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [t]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allProducts
      .filter(VIEW_FILTERS[view] ?? VIEW_FILTERS.all)
      .filter(p => catFilter === 'All' || p.category_id === catFilter)
      .filter(p => !term || p.name.toLowerCase().includes(term) || p.barcode.toLowerCase().includes(term));
  }, [allProducts, view, catFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const VIEWS = [
    { key: 'all', label: t('productViews.all'), icon: IconList },
    { key: 'low', label: t('productViews.low'), icon: IconAlertTriangle },
    { key: 'out', label: t('productViews.out'), icon: IconCircleOff },
    { key: 'hidden', label: t('productViews.hidden'), icon: IconEyeOff },
    { key: 'perishable', label: t('productViews.perishable'), icon: IconClockHour4 },
  ];

  const exportCols = [
    { key: 'name', label: t('table.item'), value: p => p.name },
    { key: 'barcode', label: t('table.barcode'), value: p => p.barcode },
    { key: 'category', label: t('table.category'), value: p => p.category },
    { key: 'stock', label: t('table.stock'), value: p => p.quantity_in_stock },
    { key: 'price', label: t('table.price'), value: p => p.selling_price },
    { key: 'visibility', label: t('table.visibility'), value: p => (p.is_active ? 'Active' : 'Hidden') },
    { key: 'perishable', label: t('table.expiry'), value: p => (p.is_perishable ? 'yes' : 'no') },
  ];

  const isLow = (p) => p.quantity_in_stock <= LOW_STOCK_AT;

  return (
    <div className="space-y-4">
      <SubBar views={VIEWS} view={view} onView={pickView}>
        <div className="w-48"><SearchInput value={search} onChange={pickSearch} placeholder={t('products.search')} /></div>
        <select
          value={catFilter}
          onChange={e => pickCategory(e.target.value)}
          className="px-3 py-2 text-sm border border-app rounded-lg bg-card text-ink focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="All">{t('common.allCategories')}</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-sm text-sub whitespace-nowrap">{t('products.count', { count: filtered.length })}</span>
        {/* Manager only. Runs in the browser, so it is a UI gate — a server-side
            export would need the same role check that restock has. */}
        {isManager && (
          <button
            onClick={() => filtered.length && downloadCsv(`appleland-products-${view}.csv`, exportCols, filtered)}
            disabled={loading || !filtered.length}
            title={filtered.length ? t('subbar.export') : t('subbar.noRows')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-app text-sub hover:text-brand hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <IconDownload size={14} stroke={1.7} /> {t('subbar.export')}
          </button>
        )}
        {isManager && (
          <button onClick={() => navigate('/products/new')} className="btn-primary">
            <IconPlus size={16} stroke={2} /> {t('products.add')}
          </button>
        )}
      </SubBar>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-white bg-brand">
                <th className="px-5 py-3 font-medium">{t('table.item')}</th>
                <th className="px-4 py-3 font-medium">{t('table.barcode')}</th>
                <th className="px-4 py-3 font-medium">{t('table.category')}</th>
                <th className="px-4 py-3 font-medium">{t('table.stock')}</th>
                <th className="px-4 py-3 font-medium">{t('table.price')}</th>
                <th className="px-4 py-3 font-medium">{t('table.visibility')}</th>
                {isManager && <th className="px-4 py-3 font-medium">{t('table.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {loading ? (
                <tr>
                  <td colSpan={isManager ? 7 : 6} className="px-5 py-12 text-center text-sm text-mute">
                    {t('products.loading')}
                  </td>
                </tr>
              ) : pageItems.map(p => (
                <tr key={p.id} className="hover:bg-brand-light transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt={p.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-brand-light flex items-center justify-center flex-shrink-0">
                          <IconPackage stroke={1.5} size={20} className="text-brand" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-ink flex items-center gap-1.5">
                          {p.name}
                          {p.is_perishable && <IconClockHour4 size={14} stroke={1.7} className="text-amber-600" title={t('table.expiry')} />}
                        </p>
                        <p className="text-xs text-mute truncate">{p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-sub">{p.barcode}</td>
                  <td className="px-4 py-3.5 text-sub">{p.category}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold ${isLow(p) ? 'text-red-600' : 'text-ink'}`}>{p.quantity_in_stock}</span>
                      {isLow(p) && <Badge label="Low" />}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-ink">{formatMMK(p.selling_price)}</td>
                  <td className="px-4 py-3.5"><Badge label={p.is_active ? 'Active' : 'Hidden'} /></td>
                  {isManager && (
                    <td className="px-4 py-3.5">
                      <button onClick={() => navigate(`/products/${p.id}/edit`)} className="p-1.5 rounded-lg text-mute hover:text-brand hover:bg-brand-light transition-colors cursor-pointer" title={t('common.edit')}>
                        <IconPencil stroke={1.5} size={15} />
                      </button>
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

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-app rounded-lg text-sub hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <IconChevronLeft size={15} stroke={1.8} /> {t('products.prev')}
          </button>
          <span className="text-sm text-sub">{t('products.pageOf', { page, total: totalPages })}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-app rounded-lg text-sub hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {t('products.next')} <IconChevronRight size={15} stroke={1.8} />
          </button>
        </div>
      )}
    </div>
  );
}
