import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IconPencil, IconPackage, IconPlus, IconChevronLeft, IconChevronRight,
  IconList, IconAlertTriangle, IconCircleOff, IconEyeOff, IconClockHour4, IconPackageImport, IconPrinter,
  IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { formatMMK } from '../utils/currency';
import { downloadCsvSections } from '../utils/csv';
import { downloadExcelWorkbook } from '../utils/excel';
import ReportDialog from '../components/common/ReportDialog';
import PrintSheet from '../components/common/PrintSheet';
import { formatShopTime } from '../utils/shopDay';
import { useAuth } from '../context/AuthContext';
import Badge from '../components/common/Badge';
import SearchInput from '../components/common/SearchInput';
import SubBar from '../components/common/SubBar';
import StockInModal from '../components/common/StockInModal';
import { SkeletonRows } from '../components/common/Skeleton';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { getAllProducts, deleteProduct } from '../services/productService';
import { getCategories } from '../services/categoryService';
import { isLowStock, isOutOfStock, needsRestock } from '../utils/stock';

const PAGE_SIZE = 10;

// ponytail: the whole catalogue is fetched once and filtered in the browser.
// Fine into the low thousands; move filtering server-side if it ever gets slow.
const normalizeProduct = (product) => ({
  id: product.id,
  barcode: product.barcode ?? '',
  name: product.name ?? '',
  category: product.category ?? '',
  category_id: product.category_id,
  sub_category_id: product.sub_category_id,
  quantity_in_stock: Number(product.quantity_in_stock ?? 0),
  selling_price: Number(product.selling_price ?? 0),
  image_url: product.image_url ?? null,
  is_shown_online: product.is_shown_online ?? true,
  is_perishable: product.is_perishable ?? false,
});

const VIEW_FILTERS = {
  all: () => true,
  low: isLowStock,
  out: isOutOfStock,
  hidden: p => !p.is_shown_online,
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
  const [stockFor, setStockFor] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [printing, setPrinting] = useState(null);
  const [deleting, setDeleting] = useState(null);

  // Any change to what is being filtered sends you back to page 1.
  const pickView = (v) => { setView(v); setPage(1); };
  const pickSearch = (v) => { setSearch(v); setPage(1); };
  const pickCategory = (v) => { setCatFilter(v); setPage(1); };

  const reload = useCallback(() => {
    return Promise.all([getAllProducts(), getCategories().catch(() => [])])
      .then(([products, cats]) => {
        setError('');
        setAllProducts((Array.isArray(products) ? products : []).map(normalizeProduct));
        setCategories((Array.isArray(cats) ? cats : []).filter(Boolean));
      })
      .catch(err => {
        setError(err?.message || t('products.loadFailed'));
        setAllProducts([]);
      })
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => { reload(); }, [reload]);

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
    // text: a barcode is digits, not a quantity — Excel would render a long one
    // in scientific notation and drop any leading zero.
    { key: 'barcode', label: t('table.barcode'), value: p => p.barcode, text: true },
    { key: 'category', label: t('table.category'), value: p => p.category },
    { key: 'stock', label: t('table.stock'), value: p => p.quantity_in_stock },
    { key: 'price', label: t('table.price'), value: p => p.selling_price },
    { key: 'visibility', label: t('table.visibility'), value: p => (p.is_shown_online ? 'Active' : 'Hidden') },
    { key: 'perishable', label: t('table.expiry'), value: p => (p.is_perishable ? 'yes' : 'no') },
  ];

  const isLow = needsRestock;

  // Every view is offered, not only the one on screen — "print the low stock
  // list" is a shop errand, not a reason to navigate first. Search and category
  // filters are deliberately NOT applied: a report of "what I happened to be
  // searching for" is not a report.
  const categoryCols = [
    { key: 'name', label: t('table.category'), value: c => c.name },
    { key: 'products', label: t('titles.products'), align: 'right',
      value: c => allProducts.filter(p => p.category_id === c.id || p.sub_category_id === c.id).length },
    { key: 'status', label: t('table.visibility'),
      value: c => (c.is_deleted ? t('categories.archivedTitle') : 'Active') },
  ];

  const reportSections = Object.entries(VIEW_FILTERS).map(([key, match]) => ({
    key,
    name: t(`products.view_${key}`),
    columns: exportCols,
    rows: allProducts.map(normalizeProduct).filter(match),
  })).concat([
    { key: 'categories', name: t('titles.categories'), columns: categoryCols, rows: categories },
  ]);

  const stamp = `appleland-products-${new Date().toISOString().slice(0, 10)}`;
  return (
    <div className="space-y-4">
      {reportOpen && (
        <ReportDialog
          open intro={t('report.introNow')}
          onClose={() => setReportOpen(false)} sections={reportSections}
          onPrint={setPrinting}
          onExcel={chosen => downloadExcelWorkbook(`${stamp}.xlsx`, chosen)}
          onCsv={chosen => downloadCsvSections(`${stamp}.csv`, chosen)}
        />
      )}
      {/* The server soft-deletes: the row is flagged, not dropped, and every
          product query already filters it out. Sale items keep their own copy
          of the name and price, so past receipts and reports are untouched —
          which is what the message promises. */}
      <ConfirmDialog
        open={!!deleting} onClose={() => setDeleting(null)}
        title={t('products.deleteTitle')}
        message={t('products.deleteMsg', { name: deleting?.name ?? '' })}
        confirmLabel={t('products.delete')} danger
        onConfirm={async () => {
          const target = deleting;
          if (!target) return;
          try {
            await deleteProduct(target.id);
            await reload();
          } catch (err) {
            setError(err?.message || t('products.deleteFailed'));
          }
        }}
      />
      <PrintSheet sections={printing} onDone={setPrinting}
        subtitle={`${t('titles.products')} · ${t('report.generated', { at: formatShopTime(new Date(), 'YYYY-MM-DD HH:mm') })}`} />
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
          <button onClick={() => setReportOpen(true)} disabled={loading}
            title={t('report.title')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-app text-sub hover:text-brand hover:border-brand disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <IconPrinter size={14} stroke={1.7} /> {t('report.button')}
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

      {/* Desktop catalogue: neutral headings keep the orange for decisions and
          warnings. Barcode belongs to product identity, while quantities and
          money align on the right so they can be compared down the column. */}
      <div className="surface-card is-sheet overflow-hidden hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-app bg-base/55 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-mute">
                <th className="px-5 py-3.5 font-semibold">{t('table.item')}</th>
                <th className="px-4 py-3.5 font-semibold">{t('table.category')}</th>
                <th className="px-4 py-3.5 text-right font-semibold">{t('table.stock')}</th>
                <th className="px-4 py-3.5 text-right font-semibold">{t('table.price')}</th>
                <th className="px-4 py-3.5 text-center font-semibold">{t('table.visibility')}</th>
                {isManager && <th className="px-5 py-3.5 text-right font-semibold">{t('table.actions')}</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {loading ? (
                // A page of rows, in the shape of the real ones. PAGE_SIZE so
                // the table does not resize when the data lands.
                <SkeletonRows rows={PAGE_SIZE}
                  cols={isManager
                    ? ['70%', '55%', '35%', '55%', '45%', '75%']
                    : ['70%', '55%', '35%', '55%', '45%']} />
              ) : pageItems.map(p => (
                <tr key={p.id} className="group hover:bg-brand-light/60 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      {p.image_url ? (
                        <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-app" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center flex-shrink-0">
                          <IconPackage stroke={1.5} size={18} className="text-brand" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-ink flex items-center gap-1.5 leading-tight">
                          {p.name}
                          {p.is_perishable && <IconClockHour4 size={14} stroke={1.7} className="text-amber-600" title={t('table.expiry')} />}
                        </p>
                        <p className="mt-1 font-mono text-[11px] leading-none text-mute">{p.barcode || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sub">{p.category || '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <div className="inline-flex items-center justify-end gap-2">
                      {isLow(p) && <Badge label="Low" />}
                      <span className={`font-semibold ${isLow(p) ? 'text-red-600' : 'text-ink'}`}>{p.quantity_in_stock}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-ink whitespace-nowrap">{formatMMK(p.selling_price)}</td>
                  <td className="px-4 py-3 text-center"><Badge label={p.is_shown_online ? 'Active' : 'Hidden'} /></td>
                  {isManager && (
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setStockFor(p)} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-app text-xs font-medium text-sub hover:text-brand hover:border-brand hover:bg-brand-light transition-colors cursor-pointer">
                          <IconPackageImport stroke={1.6} size={14} /> {t('stockIn.addStock')}
                        </button>
                        <button aria-label={`${t('common.edit')} ${p.name}`} onClick={() => navigate(`/products/${p.id}/edit`)} className="control-icon text-mute hover:text-brand hover:bg-brand-light cursor-pointer" title={t('common.edit')}>
                          <IconPencil stroke={1.5} size={16} />
                        </button>
                        <button aria-label={`${t('products.delete')} ${p.name}`} onClick={() => setDeleting(p)} title={t('products.delete')}
                          className="control-icon text-mute hover:text-red-600 hover:bg-red-50 cursor-pointer">
                          <IconTrash stroke={1.5} size={16} />
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

      {/* Mobile records show the same hierarchy without a horizontally
          scrolling miniature table. The primary stock action remains named. */}
      <div className="lg:hidden space-y-2.5">
        {loading ? Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="surface-card is-sheet p-4 space-y-3">
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
            <div className="skeleton h-10 w-full rounded-lg" />
          </div>
        )) : pageItems.map(p => (
          <article key={p.id} className="surface-card is-sheet p-4">
            <div className="flex items-start gap-3">
              {p.image_url ? (
                <img src={p.image_url} alt="" className="w-11 h-11 rounded-lg object-cover flex-shrink-0 border border-app" />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-brand-light flex items-center justify-center flex-shrink-0">
                  <IconPackage stroke={1.5} size={19} className="text-brand" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm text-ink flex items-center gap-1.5">
                  <span className="truncate">{p.name}</span>
                  {p.is_perishable && <IconClockHour4 size={14} stroke={1.7} className="text-amber-600 flex-shrink-0" />}
                </p>
                <p className="mt-1 font-mono text-[11px] text-mute">{p.barcode || '—'}</p>
              </div>
              <Badge label={p.is_shown_online ? 'Active' : 'Hidden'} />
            </div>

            <dl className="grid grid-cols-3 gap-3 py-3.5 mt-3 border-y border-app">
              <div className="min-w-0">
                <dt className="text-[10px] uppercase tracking-wide text-mute">{t('table.category')}</dt>
                <dd className="mt-1 text-xs font-medium text-ink truncate">{p.category || '—'}</dd>
              </div>
              <div className="text-center">
                <dt className="text-[10px] uppercase tracking-wide text-mute">{t('table.stock')}</dt>
                <dd className={`mt-1 text-sm font-semibold tabular-nums ${isLow(p) ? 'text-red-600' : 'text-ink'}`}>{p.quantity_in_stock}</dd>
              </div>
              <div className="text-right">
                <dt className="text-[10px] uppercase tracking-wide text-mute">{t('table.price')}</dt>
                <dd className="mt-1 text-xs font-semibold tabular-nums text-ink whitespace-nowrap">{formatMMK(p.selling_price)}</dd>
              </div>
            </dl>

            {isManager && (
              <div className="flex items-center gap-2 pt-3">
                <button onClick={() => setStockFor(p)} className="btn-primary flex-1 justify-center py-2 text-xs">
                  <IconPackageImport stroke={1.6} size={15} /> {t('stockIn.addStock')}
                </button>
                <button aria-label={`${t('common.edit')} ${p.name}`} onClick={() => navigate(`/products/${p.id}/edit`)} className="control-icon border border-app text-sub hover:text-brand hover:bg-brand-light cursor-pointer">
                  <IconPencil stroke={1.5} size={16} />
                </button>
                <button aria-label={`${t('products.delete')} ${p.name}`} onClick={() => setDeleting(p)} className="control-icon border border-app text-sub hover:text-red-600 hover:bg-red-50 cursor-pointer">
                  <IconTrash stroke={1.5} size={16} />
                </button>
              </div>
            )}
          </article>
        ))}
        {!loading && filtered.length === 0 && (
          <div className="surface-card is-sheet text-center py-12 text-mute text-sm">{t('products.none')}</div>
        )}
      </div>

      <StockInModal
        key={stockFor?.id ?? 'none'}
        product={stockFor}
        open={!!stockFor}
        onClose={() => setStockFor(null)}
        onAdded={reload}
      />

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
