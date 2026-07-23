import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPencil, IconPackage, IconPlus, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { formatMMK } from '../utils/currency';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';
import SearchInput from '../components/common/SearchInput';
import { searchProductsSimple } from '../services/productService';
import { getCategories } from '../services/categoryService';


const PAGE_SIZE = 10;

const normalizeProduct = (product) => ({
  id: product.id,
  barcode: product.barcode ?? '',
  name: product.name ?? '',
  category: product.category,
  category_id: product.category_id,
  sub_category: product.sub_category,
  sub_category_id: product.sub_category_id,
  quantity_in_stock: Number(product.quantity_in_stock ?? 0),
  selling_price: Number(product.selling_price ?? 0),
  description: product.description ?? '',
  is_active: product.is_active ?? true,
  lowStockThreshold: product.lowStockThreshold ?? 10,
});

export default function Products() {
  const { t } = useTranslation();
  const { isManager } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');


  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 1000);

    return () => {
      clearTimeout(handler);
    };
  }, [search]);

  // 2. Fetch products whenever page, debounced search, or category changes
  useEffect(() => {
    let active = true;

    const loadProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const response = await searchProductsSimple(debouncedSearch || '', {
          page,
          page_size: PAGE_SIZE,
          category_id: catFilter === 'All' ? undefined : catFilter,
        });

        // Handle both raw arrays and paginated object wrappers
        const items = Array.isArray(response) ? response : response?.data ?? [];

        if (!active) return;
        setProducts(items.map(normalizeProduct));
        setTotalPages(response?.total_pages ?? 1);
        setTotalItems(response?.total_items ?? items.length);
      } catch (loadError) {
        if (!active) return;
        setError(loadError?.message || t('products.loadFailed'));
        setProducts([]);
        setTotalItems(0);
        setTotalPages(1);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadProducts();

    return () => {
      active = false;
    };
  }, [page, debouncedSearch, catFilter, t]);

  // 3. Load drop-down categories on mount
  useEffect(() => {
    let active = true;

    const loadCategories = async () => {
      try {
        const response = await getCategories();
        const items = Array.isArray(response) ? response : response?.data ?? [];

        if (!active) return;
        setCategories(items.filter(Boolean));
      } catch {
        if (!active) return;
        setCategories([]);
      }
    };

    loadCategories();

    return () => {
      active = false;
    };
  }, []);

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
          onChange={e => { setCatFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-app rounded-lg bg-card focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="All">{t('common.allCategories')}</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="text-sm text-sub">{t('products.count', { count: totalItems })}</div>
        {isManager && (
          <button
            onClick={() => navigate('/products/new')}
            className="btn-primary"
          >
            <IconPlus size={16} stroke={2} /> {t('products.add')}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Table */}
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
              ) : products.map(p => (
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
                  <td className="px-4 py-3.5 font-medium text-ink">{formatMMK(p.selling_price)}</td>
                  <td className="px-4 py-3.5">
                    <Badge label={p.is_active ? 'Active' : 'Hidden'} />
                  </td>
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
          {!loading && products.length === 0 && (
            <div className="text-center py-12 text-mute text-sm">{t('products.none')}</div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-app rounded-lg text-sub hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <IconChevronLeft size={15} stroke={1.8} /> {t('products.prev')}
          </button>
          <span className="text-sm text-sub">{t('products.pageOf', { page, total: totalPages })}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-app rounded-lg text-sub hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {t('products.next')} <IconChevronRight size={15} stroke={1.8} />
          </button>
        </div>
      )}
    </div>
  );
}