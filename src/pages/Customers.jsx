import { useEffect, useState } from 'react';
import { IconDatabase, IconRefresh, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import { getCustomers } from '../services/customerService';
import { SkeletonRows } from '../components/common/Skeleton';

const PAGE_SIZE = 20;

// Read-only list of mobile-app accounts. The server pages the list and has no
// search, so there is no search box: filtering one page in the browser would
// silently miss everyone on the other pages. Edit/delete/order history return
// when the backend has routes for them.
export default function Customers() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [result, setResult] = useState({ key: '', rows: [], total: 0, pages: 1, error: '' });
  const requestKey = `${page}|${reloadKey}`;
  const loading = result.key !== requestKey;

  useEffect(() => {
    let active = true;
    getCustomers(page, PAGE_SIZE)
      .then(res => {
        if (!active) return;
        setResult({
          key: requestKey,
          rows: Array.isArray(res?.data) ? res.data : [],
          total: Number(res?.total_items ?? 0) || 0,
          pages: Math.max(1, Number(res?.total_pages ?? 1) || 1),
          error: '',
        });
      })
      .catch(err => {
        if (!active) return;
        setResult({ key: requestKey, rows: [], total: 0, pages: 1, error: err?.message || t('customers.loadFailed') });
      });
    return () => { active = false; };
  }, [page, requestKey, t]);

  const { rows, total, pages, error } = result;

  return (
    <div className="mobile-page customers-page space-y-5">
      <div className="flex items-center justify-end">
        <span className="text-sm text-sub">{loading ? '…' : t('customers.count', { count: total })}</span>
      </div>

      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-3">
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setReloadKey(k => k + 1)} className="inline-flex items-center gap-1.5 font-medium cursor-pointer">
            <IconRefresh size={15} /> {t('assistant.retry')}
          </button>
        </div>
      )}

      <div className="surface-card is-sheet overflow-hidden hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full text-[15px]">
            <thead>
              <tr className="border-b border-app bg-base/55 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-mute">
                <th className="px-5 py-3.5 font-semibold">{t('table.customer')}</th>
                <th className="px-4 py-3.5 font-semibold">{t('table.phone')}</th>
                <th className="px-4 py-3.5 font-semibold">{t('customers.address')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app">
              {loading && <SkeletonRows rows={8} cols={['60%', '55%', '75%']} />}
              {!loading && rows.map(c => (
                <tr key={c.id} className="hover:bg-brand-light transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-brand-light flex items-center justify-center font-semibold text-brand text-sm flex-shrink-0">
                        {(c.username || '?')[0].toUpperCase()}
                      </div>
                      <span className="font-medium text-ink">{c.username}</span>
                    </div>
                  </td>
                  {/* Both are nullable since the backend started listing users
                      who never filled in contact details. An empty cell reads
                      as a loading bug; a dash reads as "not given". */}
                  <td className="px-4 py-3.5 text-sub tabular-nums whitespace-nowrap">{c.phone_number || '—'}</td>
                  <td className="px-4 py-3.5 text-sub">{c.address_line_1 || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Only for a genuinely empty list — while loading, the skeleton
              rows above are already saying that. */}
          {!loading && rows.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-mute text-sm gap-2">
              <IconDatabase size={28} stroke={1.2} />
              {t('customers.none')}
            </div>
          )}
        </div>
      </div>

      {/* Records rather than a squeezed three-column table on a phone, the same
          trade Products and Orders make. */}
      <div className="lg:hidden space-y-2.5">
        {loading ? Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="surface-card is-sheet p-4 space-y-3">
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        )) : rows.map(c => (
          <article key={c.id} className="surface-card is-sheet p-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-brand-light flex items-center justify-center font-semibold text-brand flex-shrink-0">
                {(c.username || '?')[0].toUpperCase()}
              </div>
              <p className="font-semibold text-sm text-ink min-w-0 truncate">{c.username}</p>
            </div>
            <dl className="grid grid-cols-2 gap-3 py-3.5 mt-3 border-t border-app">
              <div className="min-w-0">
                <dt className="text-[10px] uppercase tracking-wide text-mute">{t('table.phone')}</dt>
                <dd className="mt-1 text-xs font-medium text-ink tabular-nums truncate">{c.phone_number || '—'}</dd>
              </div>
              <div className="min-w-0 text-right">
                <dt className="text-[10px] uppercase tracking-wide text-mute">{t('customers.address')}</dt>
                <dd className="mt-1 text-xs text-ink truncate">{c.address_line_1 || '—'}</dd>
              </div>
            </dl>
          </article>
        ))}
        {!loading && rows.length === 0 && (
          <div className="surface-card is-sheet flex flex-col items-center justify-center py-12 text-mute text-sm gap-2">
            <IconDatabase size={28} stroke={1.2} />
            {t('customers.none')}
          </div>
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1 || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-app rounded-lg text-sub hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            <IconChevronLeft size={15} stroke={1.8} /> {t('products.prev')}
          </button>
          <span className="text-sm text-sub">{t('products.pageOf', { page, total: pages })}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages || loading}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-app rounded-lg text-sub hover:bg-brand-light disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
            {t('products.next')} <IconChevronRight size={15} stroke={1.8} />
          </button>
        </div>
      )}
    </div>
  );
}
